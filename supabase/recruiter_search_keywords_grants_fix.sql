-- =============================================================
-- RhirePro — create recruiter_search_keywords and grant access
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- Turns out the table never existed in this database at all —
-- add_recruiter_search_keywords.sql was written but never actually run.
-- That means log_recruiter_keywords() has been failing on every single
-- call (INSERT into a table that doesn't exist raises, the transaction
-- rolls back), which silently took the keywords_used counter update in
-- the same function down with it — that's the real reason the count
-- "wasn't showing for either of them": it was never incrementing for
-- anyone, admin included.
--
-- This migration creates the table (IF NOT EXISTS, so harmless if it
-- turns out to exist after all), (re)creates log_recruiter_keywords() so
-- it definitely matches, and adds the GRANT that add_recruiter_search_
-- keywords.sql never included either — the same missing-grant pattern
-- found repeatedly this session on email_logs, api_request_logs,
-- admin_audit_log and support_tickets: a table created by pasting raw SQL
-- doesn't get the grant the Studio Table Editor adds automatically, so
-- `authenticated` couldn't have read it directly even once the table
-- existed. The RLS policies below are fully permissive (USING (true)) —
-- they were never the problem.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.recruiter_search_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recruiter_search_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.recruiter_search_keywords;
CREATE POLICY "Allow select for authenticated users"
  ON public.recruiter_search_keywords
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.recruiter_search_keywords;
CREATE POLICY "Allow insert for authenticated users"
  ON public.recruiter_search_keywords
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_recruiter_keywords(p_recruiter_id uuid, p_keywords text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
BEGIN
  FOREACH k IN ARRAY p_keywords
  LOOP
    INSERT INTO public.recruiter_search_keywords (recruiter_id, keyword)
    VALUES (p_recruiter_id, k);
  END LOOP;

  UPDATE public.recruiter_profiles
  SET keywords_used = COALESCE(keywords_used, 0) + COALESCE(array_length(p_keywords, 1), 0)
  WHERE id = p_recruiter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_recruiter_keywords(uuid, text[]) TO authenticated;
GRANT SELECT, INSERT ON public.recruiter_search_keywords TO authenticated;

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SELECT count(*) FROM public.recruiter_search_keywords;
