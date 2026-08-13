-- =============================================================
-- RhirePro — Create pending_otps table for Signup OTP verification
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
-- =============================================================

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
