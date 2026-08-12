-- Optional migration: Add last_active_at and updated_at columns to profiles table

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Create indices to optimize candidate activity filtering in search queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);
