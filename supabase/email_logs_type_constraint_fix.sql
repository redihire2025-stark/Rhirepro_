-- =============================================================
-- RhirePro — widen email_logs.email_type to match what's actually logged
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- email_logs was created with:
--   check (email_type in ('otp', 'reset_otp', 'invite', 'other'))
--
-- but the Netlify functions that log emails send several more values:
--   profile-view-email.mjs      -> 'profile_view'
--   recruiter-status-email.mjs  -> 'recruiter_approved' | 'recruiter_declined'
--                                   | 'recruiter_disabled' | 'recruiter_enabled'
--   send-newsletter.mjs         -> 'newsletter'
--   send-recruiter-email.mjs    -> 'recruiter_outreach'
--
-- Every insert using one of those values violates the CHECK constraint and
-- is rejected by Postgres. logEmail() in each function treats logging as
-- best-effort and swallows the failure, so the email still sends via Resend
-- but never appears in email_logs — which is why the Super Admin Emails and
-- Communications pages report far fewer (often zero) emails than have
-- actually gone out.
-- =============================================================

BEGIN;

ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN (
    'otp',
    'reset_otp',
    'invite',
    'profile_view',
    'recruiter_approved',
    'recruiter_declined',
    'recruiter_disabled',
    'recruiter_enabled',
    'newsletter',
    'recruiter_outreach',
    'other'
  ));

COMMIT;

-- ── VERIFY ────────────────────────────────────────────────────
--   SELECT count(*) FROM public.email_logs;   -- should be > 0 once new emails send
