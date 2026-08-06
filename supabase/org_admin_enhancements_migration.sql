-- =============================================================
-- RhirePro — Org Admin Enhancements Migration
-- =============================================================

-- ── 1. UPDATE RECRUITER_INVITATIONS SCHEMA ────────────────────

ALTER TABLE public.recruiter_invitations
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_count integer NOT NULL DEFAULT 0;

-- Drop old status check constraint if present and recreate with 'link_opened'
ALTER TABLE public.recruiter_invitations
  DROP CONSTRAINT IF EXISTS recruiter_invitations_status_check;

ALTER TABLE public.recruiter_invitations
  ADD CONSTRAINT recruiter_invitations_status_check
  CHECK (status IN ('pending', 'link_opened', 'accepted', 'expired', 'revoked'));

CREATE INDEX IF NOT EXISTS ri_last_opened_idx ON public.recruiter_invitations(last_opened_at);

-- ── 2. RPC TO MARK INVITATION AS LINK OPENED ───────────────────

CREATE OR REPLACE FUNCTION public.mark_invitation_opened(p_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT * INTO v_invite
  FROM public.recruiter_invitations
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  IF v_invite.status = 'expired' OR v_invite.expires_at < now() THEN
    UPDATE public.recruiter_invitations
    SET status = 'expired'
    WHERE id = v_invite.id;
    RETURN json_build_object('success', false, 'status', 'expired');
  END IF;

  -- Update status to 'link_opened' if currently 'pending' and record timestamp/count
  UPDATE public.recruiter_invitations
  SET status = CASE WHEN status = 'pending' THEN 'link_opened' ELSE status END,
      last_opened_at = now(),
      opened_count = coalesce(opened_count, 0) + 1
  WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'status', CASE WHEN v_invite.status = 'pending' THEN 'link_opened' ELSE v_invite.status END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_invitation_opened(text) TO anon, authenticated;

-- ── 3. RLS POLICIES FOR ORG ADMIN SUB-USER JOB CONTROL ────────

DROP POLICY IF EXISTS "Org admins update team jobs" ON public.jobs;
CREATE POLICY "Org admins update team jobs"
  ON public.jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE rp.id = auth.uid()
        AND rp.org_role = 'admin'
        AND (
          jobs.recruiter_id = auth.uid() OR
          jobs.recruiter_id IN (
            SELECT member.id FROM public.recruiter_profiles member
            WHERE member.org_admin_id = auth.uid() OR member.org_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE rp.id = auth.uid()
        AND rp.org_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Org admins delete team jobs" ON public.jobs;
CREATE POLICY "Org admins delete team jobs"
  ON public.jobs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE rp.id = auth.uid()
        AND rp.org_role = 'admin'
        AND (
          jobs.recruiter_id = auth.uid() OR
          jobs.recruiter_id IN (
            SELECT member.id FROM public.recruiter_profiles member
            WHERE member.org_admin_id = auth.uid() OR member.org_id = auth.uid()
          )
        )
    )
  );
