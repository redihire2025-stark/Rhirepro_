-- get_org_members_with_stats() only ever returned is_active, so the Org Admin
-- Team panel showed "Active" for a member who is actually still Pending
-- Super-Admin approval (verification_status) and cannot sign in at all.
-- Add verification_status (and rejection_reason for context) so the panel can
-- show the real, sign-in-blocking state instead of a misleading Active badge.
DROP FUNCTION IF EXISTS public.get_org_members_with_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_org_members_with_stats(p_admin_id uuid)
RETURNS TABLE (
  id                   uuid,
  email                text,
  recruiter_name       text,
  org_role             text,
  is_active            boolean,
  verification_status  text,
  rejection_reason     text,
  jobs_count           bigint,
  applications_count   bigint,
  hires_count          bigint,
  created_at           timestamptz,
  resumes_used         integer,
  keywords_used        integer,
  profiles_viewed      integer
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
    rp.verification_status,
    rp.rejection_reason,
    COALESCE(j.cnt,  0)          AS jobs_count,
    COALESCE(a.cnt,  0)          AS applications_count,
    COALESCE(h.cnt,  0)          AS hires_count,
    rp.created_at,
    COALESCE(rp.resumes_used, 0)  AS resumes_used,
    COALESCE(rp.keywords_used, 0) AS keywords_used,
    COALESCE(rp.profiles_viewed, 0) AS profiles_viewed
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

-- Backfill: any existing org-invited member stuck Pending should already have
-- been swept up by invite_accept_auto_verify.sql's backfill. Run it again here,
-- harmlessly, in case that migration was applied before this one and missed
-- members invited/accepted in between.
UPDATE public.recruiter_profiles
SET    verification_status = 'Verified',
       verified_at = COALESCE(verified_at, now()),
       rejection_reason = NULL,
       rejected_at = NULL,
       rejected_by = NULL
WHERE  org_admin_id IS NOT NULL
  AND  verification_status IS DISTINCT FROM 'Verified';
