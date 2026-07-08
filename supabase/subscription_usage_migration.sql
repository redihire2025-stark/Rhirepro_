-- ── 1. Add metrics columns to recruiter_profiles ───────────
ALTER TABLE public.recruiter_profiles
  ADD COLUMN IF NOT EXISTS resumes_used  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS keywords_used integer DEFAULT 0;

-- ── 2. Create increment_recruiter_resumes security-definer function ──
CREATE OR REPLACE FUNCTION public.increment_recruiter_resumes(p_recruiter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.recruiter_profiles
  SET resumes_used = COALESCE(resumes_used, 0) + 1
  WHERE id = p_recruiter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_recruiter_resumes(uuid) TO authenticated;

-- ── 3. Create increment_recruiter_keywords security-definer function ──
CREATE OR REPLACE FUNCTION public.increment_recruiter_keywords(p_recruiter_id uuid, p_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.recruiter_profiles
  SET keywords_used = COALESCE(keywords_used, 0) + p_count
  WHERE id = p_recruiter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_recruiter_keywords(uuid, integer) TO authenticated;

-- ── 4. Re-create get_org_members_with_stats function to return usage metrics ──
DROP FUNCTION IF EXISTS public.get_org_members_with_stats(uuid);
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
  created_at           timestamptz,
  resumes_used         integer,
  keywords_used        integer
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
    rp.created_at,
    COALESCE(rp.resumes_used, 0)  AS resumes_used,
    COALESCE(rp.keywords_used, 0) AS keywords_used
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
