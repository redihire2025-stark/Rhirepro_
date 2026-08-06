-- =============================================================
-- RhirePro — Company Manual Verification Workflow Migration
-- =============================================================

-- ── 1. ADD VERIFICATION COLUMNS TO RECRUITER_PROFILES ───────────

ALTER TABLE public.recruiter_profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'Pending'
    CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_verification_status 
  ON public.recruiter_profiles(verification_status);

-- ── 2. BACKFILL EXISTING PROFILES AS VERIFIED ───────────────────
-- Ensure pre-existing registered recruiters are not locked out
UPDATE public.recruiter_profiles
SET verification_status = 'Verified'
WHERE verification_status IS NULL OR verification_status = 'Pending';

-- ── 3. UPDATE GET_SUPER_ADMIN_COMPANIES RPC ─────────────────────

DROP FUNCTION IF EXISTS public.get_super_admin_companies();
DROP FUNCTION IF EXISTS public.get_super_admin_companies(text, text);

CREATE OR REPLACE FUNCTION public.get_super_admin_companies(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  company_name        text,
  verification_status text,
  rejection_reason    text,
  rejected_at         timestamptz,
  rejected_by         uuid,
  verified_at         timestamptz,
  verified_by         uuid,
  recruiter_count     bigint,
  jobs_count          bigint,
  applications_count  bigint,
  industry            text,
  location            text,
  logo_url            text,
  email               text,
  phone               text,
  website             text,
  address             text,
  gst                 text,
  subscription_plan   text,
  payment_status      text,
  latest_created_at   timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  RETURN QUERY
  WITH company_agg AS (
    SELECT
      coalesce(nullif(trim(rp.company_name), ''), 'Unaffiliated') AS c_name,
      -- Get primary/org admin row values if present, else first profile values
      (ARRAY_AGG(rp.verification_status ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_verification_status,
      (ARRAY_AGG(rp.rejection_reason ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_rejection_reason,
      (ARRAY_AGG(rp.rejected_at ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_rejected_at,
      (ARRAY_AGG(rp.rejected_by ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_rejected_by,
      (ARRAY_AGG(rp.verified_at ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_verified_at,
      (ARRAY_AGG(rp.verified_by ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_verified_by,
      count(DISTINCT rp.id)::bigint AS c_recruiter_count,
      count(DISTINCT j.id)::bigint AS c_jobs_count,
      count(DISTINCT a.id)::bigint AS c_applications_count,
      max(rp.industry) AS c_industry,
      max(rp.location) AS c_location,
      max(rp.logo_url) AS c_logo_url,
      (ARRAY_AGG(rp.email ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_email,
      (ARRAY_AGG(rp.phone ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_phone,
      (ARRAY_AGG(rp.website ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_website,
      (ARRAY_AGG(rp.location ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_address,
      (ARRAY_AGG(rp.cin ORDER BY rp.is_org_admin DESC, rp.created_at ASC))[1] AS c_gst,
      max(rp.created_at) AS c_latest_created_at,
      -- Fetch subscription info
      (ARRAY_AGG(rs.plan_id ORDER BY rs.created_at DESC NULLS LAST))[1] AS c_subscription_plan,
      (ARRAY_AGG(rs.status ORDER BY rs.created_at DESC NULLS LAST))[1] AS c_payment_status
    FROM public.recruiter_profiles rp
    LEFT JOIN public.jobs j ON j.recruiter_id = rp.id
    LEFT JOIN public.applications a ON a.recruiter_id = rp.id
    LEFT JOIN public.recruiter_subscriptions rs ON rs.recruiter_id = rp.id
    GROUP BY coalesce(nullif(trim(rp.company_name), ''), 'Unaffiliated')
  )
  SELECT
    c_name AS company_name,
    c_verification_status AS verification_status,
    c_rejection_reason AS rejection_reason,
    c_rejected_at AS rejected_at,
    c_rejected_by AS rejected_by,
    c_verified_at AS verified_at,
    c_verified_by AS verified_by,
    c_recruiter_count AS recruiter_count,
    c_jobs_count AS jobs_count,
    c_applications_count AS applications_count,
    c_industry AS industry,
    c_location AS location,
    c_logo_url AS logo_url,
    c_email AS email,
    c_phone AS phone,
    c_website AS website,
    c_address AS address,
    c_gst AS gst,
    coalesce(c_subscription_plan, 'Free Trial') AS subscription_plan,
    coalesce(c_payment_status, 'Active') AS payment_status,
    c_latest_created_at AS latest_created_at
  FROM company_agg
  WHERE (p_status IS NULL OR c_verification_status = p_status)
    AND (p_search IS NULL OR c_name ILIKE '%' || p_search || '%' OR c_industry ILIKE '%' || p_search || '%')
  ORDER BY 
    CASE WHEN c_verification_status = 'Pending' THEN 0 ELSE 1 END ASC,
    c_latest_created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_super_admin_companies(text, text) TO authenticated;
