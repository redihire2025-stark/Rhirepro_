-- =============================================================
-- RhirePro — Org Admin Overview counts computed in the database
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- The Overview tab derives every KPI from `teamApps`, which the client fetches
-- with `.limit(500)`. One org already has 996 distinct candidates, so
-- "Total Candidates" and everything beside it silently reported a truncated
-- figure — and the cap is applied before the DISTINCT, so the number was not
-- even a consistent undercount.
--
-- Counting in the database removes the cap from the equation entirely. The
-- function is SECURITY DEFINER but scoped to auth.uid(): it only ever counts
-- the caller's own team, and returns zeros for a caller who is not an org
-- admin, so it cannot be used to read another organisation's figures.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.org_admin_overview_kpis()
RETURNS TABLE (
  total_recruiters      bigint,
  active_recruiters     bigint,
  total_jobs            bigint,
  active_jobs           bigint,
  closed_jobs           bigint,
  total_candidates      bigint,
  applications_today    bigint,
  interviews_scheduled  bigint,
  offers_released       bigint,
  successful_hires      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  team   uuid[];
BEGIN
  -- Not an org admin: report nothing rather than leaking another org's totals.
  IF NOT EXISTS (
    SELECT 1 FROM public.recruiter_profiles rp
    WHERE rp.id = caller AND rp.is_org_admin IS TRUE
  ) THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
                        0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  -- The admin's own postings count towards the org alongside their members'.
  SELECT array_agg(id) INTO team
  FROM (
    SELECT caller AS id
    UNION
    SELECT m.id FROM public.recruiter_profiles m WHERE m.org_admin_id = caller
  ) t;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.recruiter_profiles m WHERE m.org_admin_id = caller),
    (SELECT count(*) FROM public.recruiter_profiles m
      WHERE m.org_admin_id = caller AND m.is_active IS TRUE AND m.is_disabled IS NOT TRUE),
    (SELECT count(*) FROM public.jobs j WHERE j.recruiter_id = ANY(team)),
    (SELECT count(*) FROM public.jobs j WHERE j.recruiter_id = ANY(team) AND j.status = 'Active'),
    (SELECT count(*) FROM public.jobs j WHERE j.recruiter_id = ANY(team) AND j.status = 'Closed'),
    (SELECT count(DISTINCT a.profile_id) FROM public.applications a WHERE a.recruiter_id = ANY(team)),
    (SELECT count(*) FROM public.applications a
      WHERE a.recruiter_id = ANY(team) AND a.applied_at >= date_trunc('day', now())),
    (SELECT count(*) FROM public.applications a
      WHERE a.recruiter_id = ANY(team) AND a.status = 'Interview Scheduled'),
    (SELECT count(*) FROM public.applications a
      WHERE a.recruiter_id = ANY(team) AND a.status = 'Offered'),
    (SELECT count(*) FROM public.applications a
      WHERE a.recruiter_id = ANY(team) AND a.status IN ('Hired', 'Joined'));
END;
$$;

REVOKE ALL ON FUNCTION public.org_admin_overview_kpis() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_admin_overview_kpis() TO authenticated;

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SELECT * FROM public.org_admin_overview_kpis();   -- as an org admin
