-- =============================================================
-- RhirePro — Close promo_codes and feedback exposure
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- Verified against production by simulating a signed-in jobseeker
-- (SET LOCAL ROLE authenticated + request.jwt.claims):
--
--   promo_codes   sees 4   of 4     <-- every discount code and value
--   feedback      sees 6   of 6     <-- including reviewer user_email
--
-- Candidate data (profiles, work_experience, education, certifications,
-- projects, applications) was checked at the same time and is correctly
-- scoped - a jobseeker sees 0 rows belonging to anyone else.
-- =============================================================

BEGIN;

-- ── 1. promo_codes ────────────────────────────────────────────
-- "Promo codes publicly readable" USING (true) let any visitor enumerate every
-- code, its discount_type/discount_value, and remaining uses. Nothing in the
-- browser bundle reads this table (grep for from("promo_codes") returns
-- nothing) - redemption is validated server-side against the service role - so
-- no browser-facing role needs access at all.

DROP POLICY IF EXISTS "Promo codes publicly readable" ON public.promo_codes;

REVOKE ALL ON public.promo_codes FROM anon;
REVOKE ALL ON public.promo_codes FROM authenticated;


-- ── 2. feedback ───────────────────────────────────────────────
-- The landing page renders these as testimonials, so the rating and comment
-- must stay publicly readable. The reviewer's email must not: it was being
-- shipped to every visitor's browser and used to derive a display name.
-- RLS is row-level and cannot exclude a column, so use column-level grants.

REVOKE SELECT ON public.feedback FROM anon;
REVOKE SELECT ON public.feedback FROM authenticated;

GRANT SELECT (id, user_id, user_type, rating, comment, created_at)
  ON public.feedback TO anon;
GRANT SELECT (id, user_id, user_type, rating, comment, created_at)
  ON public.feedback TO authenticated;

-- INSERT/UPDATE grants are deliberately left intact: FeedbackPopup upserts
-- user_email and does not chain .select(), so it never reads the column back.

-- The Super Admin console legitimately needs the reviewer's email. Route that
-- through a SECURITY DEFINER function rather than widening the column grant.
-- Returning SETOF lets PostgREST keep applying .eq/.order/.range as before.
CREATE OR REPLACE FUNCTION public.admin_feedback()
RETURNS SETOF public.feedback
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.feedback WHERE public.is_super_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.admin_feedback() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_feedback() TO authenticated;

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<any-jobseeker-uuid>","role":"authenticated"}';
--   SELECT rating, comment FROM public.feedback LIMIT 1;   -- expect OK
--   SELECT user_email     FROM public.feedback LIMIT 1;    -- expect ERROR 42501
--   SELECT * FROM public.promo_codes LIMIT 1;              -- expect ERROR 42501
