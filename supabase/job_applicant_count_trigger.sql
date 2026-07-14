-- ==============================================================================
-- RhirePro - Trigger-backed applicant count on jobs table
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Add applicant_count column to jobs table if it does not exist
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS applicant_count INTEGER DEFAULT 0;

-- 2. Synchronize count values for all existing applications
UPDATE public.jobs j
SET applicant_count = (
  SELECT COUNT(*)
  from public.applications a
  WHERE a.job_id = j.id
);

-- 3. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_application_count_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.jobs
    SET applicant_count = COALESCE(applicant_count, 0) + 1
    WHERE id = NEW.job_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.jobs
    SET applicant_count = GREATEST(0, COALESCE(applicant_count, 0) - 1)
    WHERE id = OLD.job_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on applications table
DROP TRIGGER IF EXISTS on_application_count_change ON public.applications;
CREATE TRIGGER on_application_count_change
  AFTER INSERT OR DELETE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_application_count_change();
