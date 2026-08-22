-- =============================================================
-- RhirePro — Let recruiters decline a candidate before the interview stage
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- The pipeline only allowed a candidate to be turned down once they had
-- reached "Interview Completed":
--
--   Applied         -> Under Review
--   Under Review    -> Shortlisted
--   Shortlisted     -> Interview Scheduled
--
-- so a recruiter reviewing a clearly unsuitable application had no way to
-- close it out and had to drag every candidate to interview first. This adds
-- a "Not Shortlisted" outcome for the two screening stages, and a reason
-- column so the decision is recorded rather than being silent.
-- =============================================================

BEGIN;

-- ── 1. Allow the new outcome ──────────────────────────────────
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status = ANY (ARRAY[
    'Applied',
    'Under Review',
    'Shortlisted',
    'Not Shortlisted',
    'Interview Scheduled',
    'Interview Completed',
    'Interview Selected',
    'Interview Rejected',
    'Offered',
    'Joined',
    'Rejected',
    'On Hold',
    -- Legacy spellings still present in the table; kept so existing rows and
    -- the client's status-write fallbacks continue to validate.
    'New',
    'Reviewed',
    'Screening',
    'Hired'
  ]));

-- ── 2. Record why, and when ───────────────────────────────────
-- Free text: the recruiter types a short note in the decline dialog. Nullable
-- because most transitions (Shortlisted, Offered, Joined) carry no reason.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.applications.status_reason IS
  'Recruiter''s note explaining a decline — captured when moving to Not Shortlisted, Interview Rejected or Rejected. NULL for advancing transitions.';
COMMENT ON COLUMN public.applications.status_updated_at IS
  'When status last changed. NULL for rows that have not moved since this column was added.';

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   UPDATE public.applications SET status = 'Not Shortlisted' WHERE id = '<id>';  -- expect OK
--   SELECT status, count(*) FROM public.applications GROUP BY 1;
