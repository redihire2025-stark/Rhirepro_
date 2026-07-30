-- =============================================================
-- RhirePro — Blog Management Module Migration
-- Adds org_id and tags columns to recruiter_articles table,
-- updates RLS policies for Org Admin management & public read access.
-- Safe to run multiple times.
-- =============================================================

-- 1. Add org_id and tags columns to recruiter_articles
ALTER TABLE public.recruiter_articles
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.recruiter_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags   TEXT[] DEFAULT '{}';

-- 2. Index for org_id lookups
CREATE INDEX IF NOT EXISTS recruiter_articles_org_id_idx ON public.recruiter_articles(org_id);

-- 3. Backfill org_id for existing articles using recruiter's org_id or recruiter_id
UPDATE public.recruiter_articles ra
SET org_id = COALESCE(rp.org_id, rp.id)
FROM public.recruiter_profiles rp
WHERE ra.recruiter_id = rp.id
  AND ra.org_id IS NULL;

-- 4. Enable RLS on recruiter_articles
ALTER TABLE public.recruiter_articles ENABLE ROW LEVEL SECURITY;

-- 5. Drop old recruiter policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Recruiters manage own articles" ON public.recruiter_articles;
DROP POLICY IF EXISTS "Org admins manage team articles" ON public.recruiter_articles;
DROP POLICY IF EXISTS "Public can read published recruiter articles" ON public.recruiter_articles;

-- 6. Recruiter & Org Admin Management Policy
-- Allows recruiters to manage their own articles, and Org Admins to manage all articles in their org.
CREATE POLICY "Org admins manage team articles"
  ON public.recruiter_articles FOR ALL
  USING (
    recruiter_id = auth.uid()
    OR org_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE rp.id = auth.uid()
        AND (rp.is_org_admin = true OR rp.org_role = 'admin')
        AND (rp.id = recruiter_articles.org_id OR rp.org_id = recruiter_articles.org_id)
    )
  )
  WITH CHECK (
    recruiter_id = auth.uid()
    OR org_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE rp.id = auth.uid()
        AND (rp.is_org_admin = true OR rp.org_role = 'admin')
        AND (rp.id = recruiter_articles.org_id OR rp.org_id = recruiter_articles.org_id)
    )
  );

-- 7. Public Read Policy
CREATE POLICY "Public can read published recruiter articles"
  ON public.recruiter_articles FOR SELECT
  USING (status = 'Published');
