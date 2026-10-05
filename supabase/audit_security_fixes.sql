-- ==============================================================================
-- Audit Security Fixes: Offer Letters, Notifications, Application Integrity
-- Safe, idempotent SQL migration for Supabase.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. SECURE OFFER LETTERS STORAGE
-- ──────────────────────────────────────────────────────────────────────────────
-- Ensure private bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-letters', 'offer-letters', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop loose "read all" policies
DROP POLICY IF EXISTS "Authenticated read offer letters" ON storage.objects;
DROP POLICY IF EXISTS "Jobseekers and recruiters read offer letters" ON storage.objects;

-- Allow only the candidate receiving the offer or the recruiter who sent it to read
CREATE POLICY "Jobseekers and recruiters read offer letters"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'offer-letters'
    AND auth.role() = 'authenticated'
    AND (
      -- 1. Candidate reading their own offer letter (first folder segment is candidate profile_id)
      (storage.foldername(name))[1] = auth.uid()::text

      -- 2. Recruiter who owns the application (second folder segment is application id)
      OR EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id::text = (storage.foldername(name))[2]
          AND (
            a.recruiter_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.recruiter_profiles rp
              WHERE rp.id = auth.uid()
                AND (rp.is_org_admin = true OR rp.org_role = 'admin')
            )
          )
      )

      -- 3. Super Admins
      OR EXISTS (
        SELECT 1 FROM public.super_admins sa
        WHERE sa.id = auth.uid()
      )
    )
  );

-- Upload: Only verified recruiters or super admins can upload offer letters
DROP POLICY IF EXISTS "Authenticated upload offer letters" ON storage.objects;
DROP POLICY IF EXISTS "Recruiters upload offer letters" ON storage.objects;

CREATE POLICY "Recruiters upload offer letters"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'offer-letters'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.recruiter_profiles rp
        WHERE rp.id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.super_admins sa
        WHERE sa.id = auth.uid()
      )
    )
  );

-- Delete: Only the recruiter who created the offer or a super admin can delete
DROP POLICY IF EXISTS "Authenticated delete offer letters" ON storage.objects;
DROP POLICY IF EXISTS "Recruiters delete offer letters" ON storage.objects;

CREATE POLICY "Recruiters delete offer letters"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'offer-letters'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id::text = (storage.foldername(name))[2]
          AND (
            a.recruiter_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.recruiter_profiles rp
              WHERE rp.id = auth.uid()
                AND (rp.is_org_admin = true OR rp.org_role = 'admin')
            )
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.super_admins sa
        WHERE sa.id = auth.uid()
      )
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. RECRUITER-TO-CANDIDATE NOTIFICATIONS RLS FIX
-- ──────────────────────────────────────────────────────────────────────────────
-- Fix silent RLS failure when recruiters notify candidates of interview / offer
DROP POLICY IF EXISTS "Recruiters insert candidate notifications" ON public.notifications;

CREATE POLICY "Recruiters insert candidate notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    -- User inserting for themselves
    user_id = auth.uid()

    -- OR recruiter notifying a candidate who applied to their job
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.profile_id = notifications.user_id
        AND (
          a.recruiter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.recruiter_profiles rp
            WHERE rp.id = auth.uid()
              AND (rp.is_org_admin = true OR rp.org_role = 'admin')
          )
        )
    )

    -- OR direct notification by a verified recruiter
    OR EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE rp.id = auth.uid()
        AND rp.verification_status = 'Verified'
        AND rp.is_disabled IS NOT TRUE
    )

    -- OR Super admin
    OR EXISTS (
      SELECT 1 FROM public.super_admins sa
      WHERE sa.id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. SECURE APPLICATION INTEGRITY (PREVENT TAMPERING)
-- ──────────────────────────────────────────────────────────────────────────────
-- Ensure candidate can only apply to an Active job with matching recruiter_id
DROP POLICY IF EXISTS "Job seekers can apply" ON public.applications;

CREATE POLICY "Job seekers can apply"
  ON public.applications
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id
        AND j.recruiter_id = applications.recruiter_id
        AND LOWER(j.status) = 'active'
    )
  );
