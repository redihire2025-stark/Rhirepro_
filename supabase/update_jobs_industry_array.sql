-- ── Migration to support array-based industries on jobs table ──

-- 1. Add industries column as text array if it does not exist
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS industries text[];

-- 2. Convert and copy existing comma-separated industry string data into the industries array
-- Only update if the industries array is currently empty or NULL
UPDATE public.jobs
SET industries = string_to_array(industry, ', ')
WHERE industry IS NOT NULL AND (industries IS NULL OR cardinality(industries) = 0);
