-- =============================================================
-- RhirePro — merge companies that only differ by case/spacing
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- get_super_admin_companies grouped by trim(rp.company_name) — an exact,
-- case-sensitive match. Two recruiters who both work at the same company
-- but typed it as "TCS" and "Tcs" (or "Acme Corp" / "acme corp") showed up
-- as two separate rows on the Super Admin Companies page instead of one.
--
-- Groups by lower(trim(...)) now, and picks the most common original
-- casing among that group (mode()) as the display name, so the page still
-- shows a real-looking name rather than a forced-lowercase one.
-- =============================================================

BEGIN;

-- CREATE OR REPLACE can't change a function's return-column list even when
-- the new list matches what's in the source file — the live version in this
-- database apparently doesn't match super_admin_phase2_migration.sql
-- verbatim. Drop first so this always succeeds regardless of that drift.
DROP FUNCTION IF EXISTS public.get_super_admin_companies();

CREATE OR REPLACE FUNCTION public.get_super_admin_companies()
RETURNS TABLE (
  company_name        text,
  recruiter_count      bigint,
  jobs_count           bigint,
  applications_count   bigint,
  industry             text,
  location             text,
  logo_url             text,
  latest_created_at    timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    mode() WITHIN GROUP (ORDER BY coalesce(nullif(trim(rp.company_name), ''), 'Unaffiliated')) AS company_name,
    count(DISTINCT rp.id)::bigint AS recruiter_count,
    count(DISTINCT j.id)::bigint AS jobs_count,
    count(DISTINCT a.id)::bigint AS applications_count,
    max(rp.industry) AS industry,
    max(rp.location) AS location,
    max(rp.logo_url) AS logo_url,
    max(rp.created_at) AS latest_created_at
  FROM recruiter_profiles rp
  LEFT JOIN jobs j ON j.recruiter_id = rp.id
  LEFT JOIN applications a ON a.recruiter_id = rp.id
  GROUP BY lower(coalesce(nullif(trim(rp.company_name), ''), 'Unaffiliated'))
  ORDER BY recruiter_count DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_super_admin_companies() TO authenticated;

COMMIT;
