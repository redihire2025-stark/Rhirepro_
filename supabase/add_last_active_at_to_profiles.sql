-- Production migration: Candidate Activity Tracking for Supabase
-- 1. Add activity columns to profiles table if they don't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- 2. Create indices to optimize candidate activity filtering and sorting in search queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);

-- 3. Automatic Trigger Function to update activity timestamps on row modification
CREATE OR REPLACE FUNCTION public.update_profiles_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.last_active_at IS NULL THEN
    NEW.last_active_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_update_profiles_last_active ON public.profiles;
CREATE TRIGGER trigger_update_profiles_last_active
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_last_active();
