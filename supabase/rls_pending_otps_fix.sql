-- =============================================================
-- RhirePro — CRITICAL: close anonymous write access to pending_otps
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- create_pending_otps.sql shipped this policy:
--
--   CREATE POLICY "Allow service role and admin pending_otps"
--     ON public.pending_otps FOR ALL USING (true) WITH CHECK (true);
--
-- FOR ALL + USING(true) + WITH CHECK(true) grants every role - including anon -
-- full read AND write. Confirmed against production with the public anon key:
--
--   POST   /rest/v1/pending_otps  -> HTTP 201   (row forged)
--   DELETE /rest/v1/pending_otps  -> HTTP 204   (row removed)
--
-- Impact: signup verification can be defeated. verify-otp resolves a signup by
-- looking up pending_otps by email and bcrypt-comparing, so an attacker could
-- insert a row for someone else's address with a hash of an OTP they chose,
-- then verify it and register as that person. Deleting rows also denies service
-- to legitimate signups in progress.
--
-- The table is only ever touched by send-otp / verify-otp / send-reset-otp using
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely, so no browser-facing
-- role needs any privilege here.
-- =============================================================

BEGIN;

DROP POLICY IF EXISTS "Allow service role and admin pending_otps" ON public.pending_otps;

ALTER TABLE public.pending_otps ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pending_otps FROM anon;
REVOKE ALL ON public.pending_otps FROM authenticated;

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
-- With the anon key, all four must fail:
--   GET    /rest/v1/pending_otps
--   POST   /rest/v1/pending_otps
--   PATCH  /rest/v1/pending_otps
--   DELETE /rest/v1/pending_otps
-- Signup must still work end to end, since the functions use the service role.
