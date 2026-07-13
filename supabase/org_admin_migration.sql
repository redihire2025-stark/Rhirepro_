-- =============================================================
-- RhirePro — Org Admin Panel Migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- =============================================================

-- ── 1. Add org-admin columns to recruiter_profiles ───────────

ALTER TABLE public.recruiter_profiles
  ADD COLUMN IF NOT EXISTS org_role     text    DEFAULT 'admin'
    CHECK (org_role IN ('admin', 'member')),
  ADD COLUMN IF NOT EXISTS org_admin_id uuid
    REFERENCES public.recruiter_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_seats    integer DEFAULT 5;

-- Index for fast org-member lookups
CREATE INDEX IF NOT EXISTS rp_org_admin_id_idx ON public.recruiter_profiles(org_admin_id);

-- ── 2. recruiter_invitations table ───────────────────────────

CREATE TABLE IF NOT EXISTS public.recruiter_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_admin_id  uuid        NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  company_name  text        NOT NULL,
  invited_email text        NOT NULL,
  token         text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role          text        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS ri_token_idx     ON public.recruiter_invitations(token);
CREATE INDEX IF NOT EXISTS ri_admin_id_idx  ON public.recruiter_invitations(org_admin_id);
CREATE INDEX IF NOT EXISTS ri_status_idx    ON public.recruiter_invitations(status, expires_at DESC);

-- ── 3. RLS for recruiter_invitations ─────────────────────────

ALTER TABLE public.recruiter_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage own org invitations" ON public.recruiter_invitations;
CREATE POLICY "Admins manage own org invitations"
  ON public.recruiter_invitations FOR ALL
  USING  (org_admin_id = auth.uid())
  WITH CHECK (org_admin_id = auth.uid());

-- Public SELECT allows the /recruiter/join/:token page to read invite details
-- before the user is authenticated. The 64-char token IS the authorization.
DROP POLICY IF EXISTS "Public read pending invitations" ON public.recruiter_invitations;
CREATE POLICY "Public read pending invitations"
  ON public.recruiter_invitations FOR SELECT
  USING (true);

-- ── 4. RLS additions for jobs (org admin cross-team read) ─────

DROP POLICY IF EXISTS "Org admins read team jobs" ON public.jobs;
CREATE POLICY "Org admins read team jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE  rp.id = auth.uid()
      AND    rp.org_role = 'admin'
      AND    (
        jobs.recruiter_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.recruiter_profiles m
          WHERE  m.id = jobs.recruiter_id
          AND    m.org_admin_id = auth.uid()
        )
      )
    )
  );

-- ── 5. RLS additions for applications (org admin cross-team read) ──

DROP POLICY IF EXISTS "Org admins read team applications" ON public.applications;
CREATE POLICY "Org admins read team applications"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE  rp.id = auth.uid()
      AND    rp.org_role = 'admin'
      AND    (
        applications.recruiter_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.recruiter_profiles m
          WHERE  m.id = applications.recruiter_id
          AND    m.org_admin_id = auth.uid()
        )
      )
    )
  );

-- ── 6. RLS: org admins can update their members' profile fields ──

DROP POLICY IF EXISTS "Org admins update member profiles" ON public.recruiter_profiles;
CREATE POLICY "Org admins update member profiles"
  ON public.recruiter_profiles FOR UPDATE
  USING    (org_admin_id = auth.uid())
  WITH CHECK (org_admin_id = auth.uid() OR (org_admin_id IS NULL AND org_role = 'admin'));

-- ── 7. Helper function: org members with stats ────────────────

CREATE OR REPLACE FUNCTION public.get_org_members_with_stats(p_admin_id uuid)
RETURNS TABLE (
  id                   uuid,
  email                text,
  recruiter_name       text,
  org_role             text,
  is_active            boolean,
  jobs_count           bigint,
  applications_count   bigint,
  hires_count          bigint,
  created_at           timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rp.id,
    rp.email,
    rp.recruiter_name,
    rp.org_role,
    COALESCE(rp.is_active, true) AS is_active,
    COALESCE(j.cnt,  0)          AS jobs_count,
    COALESCE(a.cnt,  0)          AS applications_count,
    COALESCE(h.cnt,  0)          AS hires_count,
    rp.created_at
  FROM recruiter_profiles rp
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cnt FROM jobs WHERE recruiter_id = rp.id
  ) j ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cnt FROM applications WHERE recruiter_id = rp.id
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cnt FROM applications
    WHERE  recruiter_id = rp.id AND status IN ('Hired', 'Joined')
  ) h ON true
  WHERE rp.id = p_admin_id
     OR rp.org_admin_id = p_admin_id
  ORDER BY
    (CASE WHEN rp.id = p_admin_id THEN 0 ELSE 1 END),
    rp.org_role DESC,
    rp.recruiter_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_members_with_stats(uuid) TO authenticated;

-- ── 8. Helper function: validate and return invitation by token ──

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  id                   uuid,
  org_admin_id         uuid,
  company_name         text,
  invited_email        text,
  role                 text,
  status               text,
  expires_at           timestamptz,
  admin_name           text,
  admin_industry       text,
  admin_location       text,
  admin_logo_url       text,
  admin_company_size   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ri.id,
    ri.org_admin_id,
    ri.company_name,
    ri.invited_email,
    ri.role,
    ri.status,
    ri.expires_at,
    rp.recruiter_name   AS admin_name,
    rp.industry         AS admin_industry,
    rp.location         AS admin_location,
    rp.logo_url         AS admin_logo_url,
    rp.company_size     AS admin_company_size
  FROM recruiter_invitations ri
  JOIN recruiter_profiles rp ON rp.id = ri.org_admin_id
  WHERE ri.token = p_token
    AND ri.status = 'pending'
    AND ri.expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- ── 9. Set up the 10 seeded org accounts ─────────────────────

-- Set rec1 as admin for each seeded org (max_seats = 10 to match existing 10-person orgs)
UPDATE public.recruiter_profiles
SET    org_role = 'admin', org_admin_id = NULL, max_seats = 10
WHERE  email ~ '^recruiter_org[0-9]+_rec1@redhire\.dev$';

-- Set rec2..rec10 as members pointing to their org's rec1
UPDATE public.recruiter_profiles rp
SET
  org_role     = 'member',
  org_admin_id = (
    SELECT id FROM public.recruiter_profiles
    WHERE  email = regexp_replace(rp.email, '_rec[0-9]+@', '_rec1@')
  )
WHERE email LIKE 'recruiter_org%@redhire.dev'
  AND email NOT LIKE '%_rec1@redhire.dev';

-- ── 10. Keep admin_orgN@redhire.dev consistent with this org_role/org_admin_id schema ──
--        too, so the RLS policies and helper functions above (which check org_role)
--        also work for these accounts, not just recruiter_org{n}_rec1@redhire.dev.

UPDATE public.recruiter_profiles
SET    org_role = 'admin', org_admin_id = NULL, is_active = true, max_seats = 10
WHERE  email ~* '^admin_org[0-9]+@redhire\.dev$';
