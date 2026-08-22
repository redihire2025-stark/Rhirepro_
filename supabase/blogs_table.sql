-- =============================================================
-- RhirePro — Separate `blogs` table for Super Admin authored posts
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- QA reported Blogs and Articles behaving inconsistently. The cause is that
-- they were never separate: no blogs table existed, and BlogPage,
-- BlogDetailPage and LandingPage all read `recruiter_articles`. Blogs (written
-- by the Super Admin) and Articles (written by recruiters) were literally the
-- same nine rows, so "View More" could only ever lead to one of them.
--
-- This adds the missing table. recruiter_articles is left completely untouched
-- and continues to back Articles.
--
-- The column list intentionally mirrors recruiter_articles so the existing
-- card/detail rendering can be reused without reshaping the UI.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.blogs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID REFERENCES public.super_admins(id) ON DELETE SET NULL,
  -- Display byline. Kept separate from author_id so a post keeps its author
  -- name if the admin account is later removed.
  author_name      TEXT,
  title            TEXT NOT NULL,
  category         TEXT,
  tags             TEXT[] DEFAULT '{}',
  summary          TEXT,
  key_takeaway     TEXT,
  content          TEXT NOT NULL DEFAULT '',
  cover_image_url  TEXT,
  cover_image_name TEXT,
  read_time        INTEGER NOT NULL DEFAULT 5,
  status           TEXT NOT NULL DEFAULT 'Draft',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at     TIMESTAMPTZ,
  CONSTRAINT blogs_status_check CHECK (status IN ('Published', 'Draft'))
);

CREATE INDEX IF NOT EXISTS blogs_status_published_idx
  ON public.blogs (status, published_at DESC NULLS LAST, created_at DESC);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Visitors see published posts only; drafts stay invisible until published.
DROP POLICY IF EXISTS "Public can read published blogs" ON public.blogs;
CREATE POLICY "Public can read published blogs"
  ON public.blogs FOR SELECT
  USING (status = 'Published');

-- Super admins manage everything, drafts included.
DROP POLICY IF EXISTS "Super admins manage blogs" ON public.blogs;
CREATE POLICY "Super admins manage blogs"
  ON public.blogs FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Grants. Blog content is public by design and holds no personal data, so no
-- column-level restriction is needed here — unlike recruiter_profiles, where
-- the row is public but the email column is not. RLS above still limits
-- browsers to published rows.
GRANT SELECT ON public.blogs TO anon;
GRANT SELECT ON public.blogs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blogs TO authenticated;

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SET LOCAL ROLE anon;
--   SELECT count(*) FROM public.blogs;              -- published rows only
--   INSERT INTO public.blogs (title) VALUES ('x');  -- expect failure
--   RESET ROLE;
