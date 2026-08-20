-- =============================================================
-- RhirePro — Close public data exposure on recruiter_profiles / email_logs
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY THIS EXISTS
-- ---------------
-- Verified against production with the anon key on 2026-08-20:
--
--   recruiter_profiles  *** READABLE BY ANON ***   (all 151 rows, incl. email + phone)
--   email_logs          *** READABLE BY ANON ***   (every recipient address ever emailed)
--
-- Cause: rls_security_fix.sql created
--   CREATE POLICY "Public can read recruiter profiles" ... USING (true);
-- which is row-level, and RLS cannot restrict *columns*. The public job pages
-- genuinely need company name/logo/etc., so the table must stay row-readable —
-- the fix is column-level GRANTs, which is the correct Postgres tool here.
--
-- ORDERING NOTE: step 1 must run before step 2. Dropping the permissive
-- USING(true) policy on its own would expose the self-referencing subquery in
-- "Org members read team recruiter profiles", which recurses (Postgres 42P17)
-- and would break recruiter sign-in immediately.
-- =============================================================

BEGIN;

-- ── 1. Remove the self-referencing (recursive) policy ─────────────
-- A policy ON recruiter_profiles that SELECTs FROM recruiter_profiles re-enters
-- its own policy check. Route the org lookup through a SECURITY DEFINER function
-- instead: it bypasses RLS, so no recursion is possible.

CREATE OR REPLACE FUNCTION public.current_recruiter_org_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_admin_id FROM public.recruiter_profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_recruiter_org_admin_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_recruiter_org_admin_id() TO authenticated;

DROP POLICY IF EXISTS "Org members read team recruiter profiles" ON public.recruiter_profiles;
CREATE POLICY "Org members read team recruiter profiles"
  ON public.recruiter_profiles FOR SELECT
  USING (
    org_admin_id = auth.uid()
    OR id = public.current_recruiter_org_admin_id()
  );


-- ── 2. Column-level grants for anonymous visitors ─────────────────
-- Rows stay publicly readable (job listings need them); columns do not.
-- Keep this list in sync with the embed in src/app/pages/JobDetailPage.tsx.
--
-- NOTE ON phone: it is included because JobDetailPage renders the recruiter's
-- contact number on the public job posting. If that is not intended, drop
-- `phone` from both this GRANT and that component's select list.

REVOKE SELECT ON public.recruiter_profiles FROM anon;
GRANT SELECT (
  id,
  recruiter_name,
  company_name,
  company_size,
  company_type,
  industry,
  company_description,
  website,
  location,
  logo_url,
  cover_image_url,
  tagline,
  linkedin_url,
  cin,
  founded,
  phone,
  created_at,
  -- Not rendered anywhere public. These are required because RLS policies on
  -- jobs / applications / profiles subquery recruiter_profiles, and Postgres
  -- checks column privileges for every policy applicable to the querying role.
  -- Without them, revoking table-level SELECT makes even
  -- `GET /jobs?select=id,title` fail with 42501 for anonymous visitors.
  org_role,
  org_admin_id,
  org_id,
  is_active,
  is_disabled
) ON public.recruiter_profiles TO anon;

-- Signed-in users keep full column access; row policies still gate which rows
-- they can see, and the Super Admin console needs email on its own screens.
GRANT SELECT ON public.recruiter_profiles TO authenticated;


-- ── 3. Lock down email_logs ───────────────────────────────────────
-- Written only by Netlify functions using the service role key, which bypasses
-- RLS entirely. No browser-facing role has any reason to read it.

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for email_logs" ON public.email_logs;

REVOKE ALL ON public.email_logs FROM anon;
REVOKE ALL ON public.email_logs FROM authenticated;

-- Super Admin console reads this table through the service role, so no
-- policy for anon/authenticated is required.


-- ── 4. Same treatment for api_request_logs ────────────────────────
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for api_request_logs" ON public.api_request_logs;

REVOKE ALL ON public.api_request_logs FROM anon;
REVOKE ALL ON public.api_request_logs FROM authenticated;

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────────
-- After running, confirm anon can still read the public columns but not email:
--
--   SET ROLE anon;
--   SELECT id, company_name FROM public.recruiter_profiles LIMIT 1;  -- expect OK
--   SELECT email          FROM public.recruiter_profiles LIMIT 1;    -- expect ERROR 42501
--   SELECT * FROM public.email_logs LIMIT 1;                         -- expect ERROR 42501
--   RESET ROLE;
