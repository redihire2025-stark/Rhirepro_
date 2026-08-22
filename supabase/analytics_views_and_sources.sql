-- =============================================================
-- RhirePro — Give the recruiter Analytics real data to report on
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- QA reported the Analytics tiles as "dummy/static data". They are not static —
-- they are computed from the database. The problem is the database has nothing
-- to compute from:
--
--   jobs.views          0 of 1016 rows non-zero — nothing ever increments it
--   applications.source column does not exist
--
-- So Job Views and CTR are permanently 0, and Application Sources was being
-- invented in the client with DEFAULT_SOURCES[idx % 5], a round robin. That is
-- why the split always looked like 23/23/23/15/15.
--
-- profiles.profile_views works correctly (67 rows populated) via the existing
-- increment_recruiter_profiles_viewed function, so this mirrors that pattern.
-- =============================================================

BEGIN;

-- ── 1. Let a job view be counted ──────────────────────────────
-- SECURITY DEFINER because visitors are anonymous and have no UPDATE rights on
-- jobs. It only ever bumps a counter by one for a single id, so exposing it to
-- anon cannot leak or damage anything else.
CREATE OR REPLACE FUNCTION public.increment_job_views(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.jobs
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_job_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_job_views(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_job_views(uuid) TO authenticated;


-- ── 2. Record where an application actually came from ─────────
-- Free text rather than an enum so a new surface can start reporting itself
-- without a migration. Existing rows stay NULL and are reported as "Unknown"
-- rather than being back-filled with a guess.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN public.applications.source IS
  'Where the candidate applied from: Job Detail Page, Job Search, Recommended Jobs, Saved Jobs, Job Alert Email. NULL for rows created before this existed.';

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SELECT public.increment_job_views('<a job id>');
--   SELECT views FROM public.jobs WHERE id = '<that job id>';   -- expect +1
--   SELECT source, count(*) FROM public.applications GROUP BY 1;
