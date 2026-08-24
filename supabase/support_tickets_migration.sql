-- =============================================================
-- RhirePro — extend support_tickets for public ticket intake
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- support_tickets already exists (super_admin_phase2_migration.sql) but only
-- as an internal admin tool — the Super Admin page could log a ticket by
-- hand for something that "came in outside the app (email, phone)". There
-- was no way for a job seeker or recruiter to raise one themselves, no
-- category field, no screenshot attachment, and no email sent back to the
-- submitter when it's resolved. This adds exactly those pieces on top of
-- the existing table instead of creating a second, conflicting one.
--
-- Same missing-GRANT issue as email_logs/api_request_logs earlier: this
-- table was also created by pasting raw SQL, so it never got the grant the
-- Studio Table Editor adds automatically. The existing "Users read own
-- support tickets" / "Super admins manage support tickets" RLS policies
-- have had nothing to actually authorize without it.
-- =============================================================

BEGIN;

ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS screenshot_path text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolution_summary text;

-- A pre-signin visitor raising a ticket is neither a recruiter nor a
-- jobseeker yet — the existing check constraint didn't have anywhere to put them.
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_requester_type_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_requester_type_check
  CHECK (requester_type IN ('recruiter', 'jobseeker', 'guest', 'other'));

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;


-- ── Storage bucket for screenshots ──────────────────────────────
-- Private: only super admins can read attachments, and only the
-- create-support-ticket function (service role) can write them.

INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Super admins read ticket screenshots" ON storage.objects;
CREATE POLICY "Super admins read ticket screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-attachments'
    AND public.is_super_admin(auth.uid())
  );

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SELECT count(*) FROM public.support_tickets;
