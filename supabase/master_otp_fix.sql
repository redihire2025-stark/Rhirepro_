-- =============================================================
-- RhirePro — Complete Supabase OTP & Password Reset Fix Script
-- Copy and paste this entire script into:
-- Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
-- =============================================================

-- ── 1. Ensure OTP Columns Exist on Profiles ───────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

ALTER TABLE public.recruiter_profiles ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE public.recruiter_profiles ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- ── 2. Create pending_otps Table for Signup & Reset ────────────
CREATE TABLE IF NOT EXISTS public.pending_otps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  otp_code       TEXT NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_otps_email_idx ON public.pending_otps(email);

ALTER TABLE public.pending_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role and admin pending_otps" ON public.pending_otps;
CREATE POLICY "Allow service role and admin pending_otps"
  ON public.pending_otps FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 3. Create email_logs Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  email_type      TEXT NOT NULL,
  subject         TEXT,
  status          TEXT NOT NULL,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for email_logs" ON public.email_logs;
CREATE POLICY "Allow all for email_logs"
  ON public.email_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 4. Create api_request_logs Table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  duration_ms   INTEGER,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for api_request_logs" ON public.api_request_logs;
CREATE POLICY "Allow all for api_request_logs"
  ON public.api_request_logs FOR ALL
  USING (true)
  WITH CHECK (true);
