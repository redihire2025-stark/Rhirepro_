-- =============================================================
-- RhirePro — Vector embeddings for semantic matching & search
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- Keyword filters miss "backend engineer" vs "server-side developer". Profiles
-- and jobs each get a 768-dim OpenAI embedding (text-embedding-3-small, shortened to 768); cosine
-- similarity then ranks jobs for a seeker, applicants for a job, and free-text
-- queries ("remote React roles, good work-life balance") for search.
--
-- Embeddings are written only by /api/embed-sync with the service role, and
-- ranked only through the RPCs below (service role), so no client ever reads
-- another user's vector.
-- =============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS embedding extensions.vector(768),
  ADD COLUMN IF NOT EXISTS embedding_hash TEXT,
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS embedding extensions.vector(768),
  ADD COLUMN IF NOT EXISTS embedding_hash TEXT,
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS jobs_embedding_idx
  ON public.jobs USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX IF NOT EXISTS profiles_embedding_idx
  ON public.profiles USING hnsw (embedding extensions.vector_cosine_ops);

-- Active jobs most similar to a query/profile vector.
CREATE OR REPLACE FUNCTION public.match_jobs(
  p_embedding extensions.vector(768),
  p_count     INTEGER DEFAULT 20
) RETURNS TABLE (job_id UUID, similarity DOUBLE PRECISION)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT j.id, 1 - (j.embedding <=> p_embedding)
  FROM public.jobs j
  WHERE j.embedding IS NOT NULL
    AND j.status = 'Active'
    AND (j.deadline IS NULL OR j.deadline > now())
  ORDER BY j.embedding <=> p_embedding
  LIMIT LEAST(GREATEST(p_count, 1), 50);
$$;

-- Applicants of ONE job ranked by similarity to it. Deliberately scoped to
-- people who applied: it ranks candidates a recruiter is already entitled to
-- see, and never exposes the wider profile table.
CREATE OR REPLACE FUNCTION public.match_applicants(
  p_job_id UUID,
  p_count  INTEGER DEFAULT 50
) RETURNS TABLE (profile_id UUID, similarity DOUBLE PRECISION)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT p.id, 1 - (p.embedding <=> j.embedding)
  FROM public.jobs j
  JOIN public.applications a ON a.job_id = j.id
  JOIN public.profiles p ON p.id = a.profile_id
  WHERE j.id = p_job_id
    AND j.embedding IS NOT NULL
    AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> j.embedding
  LIMIT LEAST(GREATEST(p_count, 1), 200);
$$;

REVOKE ALL ON FUNCTION public.match_jobs(extensions.vector, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_applicants(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_jobs(extensions.vector, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_applicants(UUID, INTEGER) TO service_role;

COMMIT;
