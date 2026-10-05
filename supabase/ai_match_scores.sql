-- =============================================================
-- RhirePro — Cache for AI profile/job match scores
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- "How well does this profile fit this job" is the same question whether a
-- recruiter is looking at an applicant or a seeker is looking at a recommended
-- job, so one cache serves both surfaces.
--
-- Caching is not an optimisation here, it is what makes the feature viable:
-- a recruiter's applicant list and a seeker's recommendations both render many
-- rows at once, and scoring each one live would mean a model call per row per
-- render — slow, expensive, and rate-limited. Scores are computed on demand for
-- a single pair and reused afterwards.
--
-- Writes only ever happen through the /api/match-score function using the
-- service role, so no INSERT/UPDATE policy is granted to end users.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_match_scores (
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id       UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  score        SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  summary      TEXT,
  -- Strengths and gaps the model called out, so the UI can explain the number
  -- rather than just asserting it.
  strengths    TEXT[] DEFAULT '{}',
  gaps         TEXT[] DEFAULT '{}',
  model        TEXT,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, job_id)
);

COMMENT ON TABLE public.ai_match_scores IS
  'AI-computed fit between a candidate profile and a job. Written only by the match-score function; read by both the recruiter applicant view and the seeker recommendations.';

CREATE INDEX IF NOT EXISTS ai_match_scores_job_idx ON public.ai_match_scores (job_id);
CREATE INDEX IF NOT EXISTS ai_match_scores_profile_idx ON public.ai_match_scores (profile_id);

ALTER TABLE public.ai_match_scores ENABLE ROW LEVEL SECURITY;

-- A seeker may see their own scores.
DROP POLICY IF EXISTS "Seekers read own match scores" ON public.ai_match_scores;
CREATE POLICY "Seekers read own match scores" ON public.ai_match_scores
  FOR SELECT USING (profile_id = auth.uid());

-- A recruiter may see scores against jobs they own. Scoped through jobs rather
-- than granted broadly, so a recruiter cannot read how a candidate scores
-- against someone else's posting.
DROP POLICY IF EXISTS "Recruiters read scores for their jobs" ON public.ai_match_scores;
CREATE POLICY "Recruiters read scores for their jobs" ON public.ai_match_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = ai_match_scores.job_id
        AND (
          j.recruiter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.recruiter_profiles m
            WHERE m.id = j.recruiter_id AND m.org_admin_id = auth.uid()
          )
        )
    )
  );

REVOKE ALL ON TABLE public.ai_match_scores FROM anon;
GRANT SELECT ON TABLE public.ai_match_scores TO authenticated;

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SELECT count(*) FROM public.ai_match_scores;
