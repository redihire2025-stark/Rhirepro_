-- 1. Create recruiter_search_keywords table
CREATE TABLE IF NOT EXISTS public.recruiter_search_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on the table (optional but good practice)
ALTER TABLE public.recruiter_search_keywords ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select/insert history rows (can restrict further if needed)
CREATE POLICY "Allow select for authenticated users" 
  ON public.recruiter_search_keywords 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow insert for authenticated users" 
  ON public.recruiter_search_keywords 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- 3. Create log_recruiter_keywords security-definer function
CREATE OR REPLACE FUNCTION public.log_recruiter_keywords(p_recruiter_id uuid, p_keywords text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
BEGIN
  -- Log each keyword into recruiter_search_keywords history
  FOREACH k IN ARRAY p_keywords
  LOOP
    INSERT INTO public.recruiter_search_keywords (recruiter_id, keyword)
    VALUES (p_recruiter_id, k);
  END LOOP;

  -- Increment recruiter aggregate count
  UPDATE public.recruiter_profiles
  SET keywords_used = COALESCE(keywords_used, 0) + COALESCE(array_length(p_keywords, 1), 0)
  WHERE id = p_recruiter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_recruiter_keywords(uuid, text[]) TO authenticated;
