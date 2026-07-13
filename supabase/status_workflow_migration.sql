-- =============================================================
-- Applicant Status Workflow Enhancement — Migration
-- Run in: Supabase Dashboard → SQL Editor → Run
-- =============================================================

-- ── 1. Update applications status CHECK constraint ──────────
-- Drop the old constraint and add a new one that accepts both
-- legacy and new standardized status values.

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    -- New standardized statuses
    'Applied',
    'Under Review',
    'Shortlisted',
    'Interview Scheduled',
    'Interview Completed',
    'Interview Selected',
    'Interview Rejected',
    'Offered',
    'Joined',
    'Rejected',
    'On Hold',
    -- Legacy statuses (backward compatibility)
    'New',
    'Reviewed',
    'Screening',
    'Hired'
  ));

-- ── 2. Status History Table ─────────────────────────────────
-- Tracks every status change with old/new values, timestamp,
-- and who made the change.

CREATE TABLE IF NOT EXISTS application_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by   UUID  -- auth.uid() of the user who triggered the change
);

CREATE INDEX IF NOT EXISTS idx_status_history_application
  ON application_status_history(application_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_history_changed_by
  ON application_status_history(changed_by, changed_at DESC);

-- RLS: recruiters can read/write history for their own applications;
-- job seekers can read history for their own applications.
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters manage status history" ON application_status_history;
CREATE POLICY "Recruiters manage status history"
  ON application_status_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_status_history.application_id
        AND a.recruiter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Job seekers read own status history" ON application_status_history;
CREATE POLICY "Job seekers read own status history"
  ON application_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_status_history.application_id
        AND a.profile_id = auth.uid()
    )
  );

-- ── 3. Auto-log status changes via trigger ──────────────────
CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO application_status_history(application_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_status_history ON applications;
CREATE TRIGGER on_application_status_history
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION log_application_status_change();

-- ── 4. Update the notification trigger to handle new statuses ─
-- The existing notify_candidate_on_status_change() already fires
-- on any status change and inserts the new status text into the
-- notification message, so it inherently supports the new values.
-- No changes needed to that function.
