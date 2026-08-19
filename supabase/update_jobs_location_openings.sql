-- ── Migration to support array-based locations and positive openings ──

-- 1. Add locations column as text array if it does not exist
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS locations text[];

-- 2. Convert and copy existing comma-separated location string data into the locations array
-- Only update if the locations array is currently empty or NULL
UPDATE public.jobs
SET locations = string_to_array(location, ', ')
WHERE location IS NOT NULL AND (locations IS NULL OR cardinality(locations) = 0);

-- 3. Add constraint on openings to accept only positive whole numbers
-- First, ensure any invalid/negative/zero values are corrected to at least 1
UPDATE public.jobs
SET openings = 1
WHERE openings IS NULL OR openings <= 0;

-- Drop check constraint if it already exists, then recreate it
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_openings_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_openings_check CHECK (openings > 0);
