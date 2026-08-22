-- =============================================================
-- RhirePro — Let notifications carry the events the app actually sends
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- The table only permits four notification types:
--
--   CHECK (type = ANY (ARRAY['application','message','status_change','job_alert']))
--
-- but the application inserts more than that, and references two columns that
-- do not exist. RecruiterDashboard's repost handler writes:
--
--   type: "reposted", notification_key: "job:<id>:reposted:<ts>", job_id: <id>
--
-- which fails three ways at once — unknown type, unknown notification_key,
-- unknown job_id. The insert error is only console.warn'd, so job repost
-- notifications have simply never been delivered.
--
-- src/lib/supabase.ts already declares the wider set as the Notification type,
-- so the schema is what is behind, not the code.
-- =============================================================

BEGIN;

-- ── 1. Allow the types the app sends ──────────────────────────
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'application',
    'message',
    'status_change',
    'job_alert',
    'expiry_warning',
    'expired',
    'reposted',
    'profile_view'
  ]));

-- ── 2. The columns the repost handler already writes ──────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notification_key TEXT;

-- Unique so `upsert` on notification_key actually de-duplicates instead of
-- inserting a second row. Partial, because most notifications carry no key and
-- NULLs would otherwise all be distinct anyway — this documents the intent.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_notification_key_uidx
  ON public.notifications (notification_key)
  WHERE notification_key IS NOT NULL;

COMMENT ON COLUMN public.notifications.notification_key IS
  'Stable de-duplication key so repeat events (a job reposted twice, a recruiter reopening the same profile) update one row instead of stacking up.';

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   INSERT INTO public.notifications (user_id, user_type, title, message, type)
--   VALUES ('<a profile id>', 'jobseeker', 'x', 'y', 'profile_view');  -- expect OK
