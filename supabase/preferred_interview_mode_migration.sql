-- Add preferred interview mode to candidate profile preferences (allow multiple values)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_interview_mode text[];
