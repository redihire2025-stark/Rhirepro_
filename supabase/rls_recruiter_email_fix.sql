-- =============================================================
-- RhirePro — Stop signed-in users reading every recruiter's email
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- rls_public_exposure_fix.sql closed this for anonymous visitors but left
-- `authenticated` with full column access, so anyone who signs up for a free
-- jobseeker account could still read all 151 recruiter email addresses.
-- Verified by simulating the authenticated role: "sees 152 of 152".
--
-- Rows must stay readable - job listings embed company name and logo for
-- signed-in browsers too - and RLS cannot exclude a column, so this narrows the
-- column grant and routes the two legitimate email readers through
-- SECURITY DEFINER functions.
-- =============================================================

BEGIN;

-- ── 1. Narrow what a signed-in user sees ──────────────────────
-- Same column set already granted to anon: enough to render company branding
-- on job cards, plus the org/flag columns that RLS policies on jobs,
-- applications and profiles reference during evaluation.

REVOKE SELECT ON public.recruiter_profiles FROM authenticated;

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
  org_role,
  org_admin_id,
  org_id,
  is_active,
  is_disabled,
  -- Read directly by RecruiterSignIn.tsx to decide org-admin routing. Omitting
  -- these broke recruiter sign-in outright: the select 42501'd, rpErr was
  -- truthy, and the handler signed the user out with "No recruiter account
  -- found". Neither is personal data - a boolean flag and a seat count.
  is_org_admin,
  max_seats
) ON public.recruiter_profiles TO authenticated;


-- ── 2. A recruiter reading their own profile ──────────────────
-- auth-context needs the full row (email, phone, billing counters, seat limits).
-- SETOF keeps PostgREST able to chain .single() on the result.

CREATE OR REPLACE FUNCTION public.my_recruiter_profile()
RETURNS SETOF public.recruiter_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.recruiter_profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_recruiter_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_recruiter_profile() TO authenticated;


-- ── 3. Super Admin console ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_recruiter_profiles()
RETURNS SETOF public.recruiter_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.recruiter_profiles WHERE public.is_super_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.admin_recruiter_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_recruiter_profiles() TO authenticated;

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
-- As a signed-in jobseeker:
--   SELECT company_name FROM recruiter_profiles LIMIT 1;   -- OK (job cards)
--   SELECT email        FROM recruiter_profiles LIMIT 1;   -- ERROR 42501
--   SELECT count(*)     FROM my_recruiter_profile();       -- 0 (not a recruiter)
-- As a recruiter:
--   SELECT email FROM my_recruiter_profile();              -- their own address
-- As a super admin:
--   SELECT count(*) FROM admin_recruiter_profiles();       -- all rows
