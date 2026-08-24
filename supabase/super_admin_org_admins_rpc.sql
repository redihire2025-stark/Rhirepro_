-- =============================================================
-- RhirePro — Super Admin: list org admins for a targeted broadcast
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- The Super Admin Newsletter composer only ever emails newsletter_subscribers.
-- There was no way to reach just the organisation admins (e.g. "your team's
-- seat limit is changing") without emailing every recruiter and job seeker
-- individually. `email` was deliberately excluded from recruiter_profiles'
-- column grant to `authenticated` (rls_recruiter_email_fix.sql), so this has
-- to go through a SECURITY DEFINER function scoped to super admins, the same
-- way admin_recruiter_profiles() already does for the Recruiters page.
--
-- "Org admin" here matches the exact same signal auth-context.tsx uses
-- client-side: is_org_admin = true, OR org_role = 'admin' with max_seats > 5
-- (solo recruiters default org_role to 'admin' with max_seats = 5, which is
-- why max_seats alone has to be part of the check) — OR they actually have
-- team members pointing org_admin_id at them, in case that flag was never
-- backfilled for an older org.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_super_admin_org_admins()
RETURNS TABLE (
  id             uuid,
  email          text,
  recruiter_name text,
  company_name   text,
  member_count   bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    rp.id,
    rp.email,
    rp.recruiter_name,
    rp.company_name,
    (SELECT count(*) FROM public.recruiter_profiles m WHERE m.org_admin_id = rp.id)::bigint AS member_count
  FROM public.recruiter_profiles rp
  WHERE rp.is_org_admin IS TRUE
     OR (rp.org_role = 'admin' AND COALESCE(rp.max_seats, 0) > 5)
     OR EXISTS (SELECT 1 FROM public.recruiter_profiles m WHERE m.org_admin_id = rp.id)
  ORDER BY rp.company_name NULLS LAST, rp.recruiter_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_super_admin_org_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_super_admin_org_admins() TO authenticated;

COMMIT;
