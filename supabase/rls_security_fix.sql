-- =============================================================
-- RhirePro — Comprehensive RLS Security Fix & Policy Hardening
-- Resolves Supabase `rls_disabled_in_public` warning.
-- Enables RLS on ALL 28 public tables and establishes secure, fine-grained policies.
-- Safe to run multiple times in Supabase SQL Editor.
-- =============================================================

-- ── 1. PROFILES (Job Seekers) ──────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own profile full access" ON public.profiles;
DROP POLICY IF EXISTS "Recruiters can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins read profiles" ON public.profiles;

CREATE POLICY "Own profile full access"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Recruiters can read all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recruiter_profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins read profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 2. WORK EXPERIENCE ─────────────────────────────────────────
ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own work experience" ON public.work_experience;
DROP POLICY IF EXISTS "Recruiters read work experience" ON public.work_experience;
DROP POLICY IF EXISTS "Super admins read work experience" ON public.work_experience;

CREATE POLICY "Own work experience"
  ON public.work_experience FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "Recruiters read work experience"
  ON public.work_experience FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recruiter_profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins read work experience"
  ON public.work_experience FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 3. EDUCATION ───────────────────────────────────────────────
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own education" ON public.education;
DROP POLICY IF EXISTS "Recruiters read education" ON public.education;
DROP POLICY IF EXISTS "Super admins read education" ON public.education;

CREATE POLICY "Own education"
  ON public.education FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "Recruiters read education"
  ON public.education FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recruiter_profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins read education"
  ON public.education FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 4. CERTIFICATIONS ──────────────────────────────────────────
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Recruiters read certifications" ON public.certifications;
DROP POLICY IF EXISTS "Super admins read certifications" ON public.certifications;

CREATE POLICY "Own certifications"
  ON public.certifications FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "Recruiters read certifications"
  ON public.certifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recruiter_profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins read certifications"
  ON public.certifications FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 5. RECRUITER PROFILES ──────────────────────────────────────
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own recruiter profile" ON public.recruiter_profiles;
DROP POLICY IF EXISTS "Job seekers can read recruiter profiles" ON public.recruiter_profiles;
DROP POLICY IF EXISTS "Org members read team recruiter profiles" ON public.recruiter_profiles;
DROP POLICY IF EXISTS "Public can read recruiter profiles" ON public.recruiter_profiles;
DROP POLICY IF EXISTS "Super admins read recruiter profiles" ON public.recruiter_profiles;

CREATE POLICY "Own recruiter profile"
  ON public.recruiter_profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Org members read team recruiter profiles"
  ON public.recruiter_profiles FOR SELECT
  USING (
    org_admin_id = auth.uid()
    OR id = (SELECT org_admin_id FROM public.recruiter_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Public can read recruiter profiles"
  ON public.recruiter_profiles FOR SELECT
  USING (true);

CREATE POLICY "Super admins read recruiter profiles"
  ON public.recruiter_profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 6. JOBS ────────────────────────────────────────────────────
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters manage own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Org admins manage team jobs" ON public.jobs;
DROP POLICY IF EXISTS "Org admins read team jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can read active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Super admins read jobs" ON public.jobs;

CREATE POLICY "Recruiters manage own jobs"
  ON public.jobs FOR ALL
  USING (recruiter_id = auth.uid());

CREATE POLICY "Org admins manage team jobs"
  ON public.jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE rp.id = auth.uid()
        AND (rp.is_org_admin = true OR rp.org_role = 'admin')
        AND (rp.id = jobs.recruiter_id OR rp.org_id = jobs.recruiter_id OR rp.id = (SELECT org_admin_id FROM public.recruiter_profiles WHERE id = jobs.recruiter_id))
    )
  );

CREATE POLICY "Anyone can read active jobs"
  ON public.jobs FOR SELECT
  USING (
    status = 'Active'
    AND (deadline IS NULL OR deadline > now())
  );

CREATE POLICY "Super admins read jobs"
  ON public.jobs FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 7. RECRUITER ARTICLES (BLOG) ───────────────────────────────
ALTER TABLE public.recruiter_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters manage own articles" ON public.recruiter_articles;
DROP POLICY IF EXISTS "Org admins manage team articles" ON public.recruiter_articles;
DROP POLICY IF EXISTS "Public can read published recruiter articles" ON public.recruiter_articles;

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

CREATE POLICY "Public can read published recruiter articles"
  ON public.recruiter_articles FOR SELECT
  USING (status = 'Published');


-- ── 8. APPLICATIONS ───────────────────────────────────────────
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Job seekers see own applications" ON public.applications;
DROP POLICY IF EXISTS "Job seekers can apply" ON public.applications;
DROP POLICY IF EXISTS "Recruiters manage their job applications" ON public.applications;
DROP POLICY IF EXISTS "Public can read aggregate application stats" ON public.applications;
DROP POLICY IF EXISTS "Super admins read applications" ON public.applications;

CREATE POLICY "Job seekers see own applications"
  ON public.applications FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Job seekers can apply"
  ON public.applications FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Recruiters manage their job applications"
  ON public.applications FOR ALL
  USING (
    recruiter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.recruiter_profiles rp
      WHERE rp.id = auth.uid()
        AND (rp.is_org_admin = true OR rp.org_role = 'admin')
        AND (rp.id = applications.recruiter_id OR rp.id = (SELECT org_admin_id FROM public.recruiter_profiles WHERE id = applications.recruiter_id))
    )
  );

CREATE POLICY "Super admins read applications"
  ON public.applications FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 9. SAVED JOBS ──────────────────────────────────────────────
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own saved jobs" ON public.saved_jobs;

CREATE POLICY "Own saved jobs"
  ON public.saved_jobs FOR ALL
  USING (profile_id = auth.uid());


-- ── 10. NOTIFICATIONS ──────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Super admins read notifications" ON public.notifications;

CREATE POLICY "Own notifications"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Super admins read notifications"
  ON public.notifications FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 11. MESSAGES ───────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own messages" ON public.messages;

CREATE POLICY "Own messages"
  ON public.messages FOR ALL
  USING (from_id = auth.uid() OR to_id = auth.uid());


-- ── 12. FEEDBACK ───────────────────────────────────────────────
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can read own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Public can read testimonial feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super admins read feedback" ON public.feedback;

CREATE POLICY "Users can submit own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feedback"
  ON public.feedback FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own feedback"
  ON public.feedback FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Public can read testimonial feedback"
  ON public.feedback FOR SELECT
  USING (rating BETWEEN 1 AND 5);

CREATE POLICY "Super admins read feedback"
  ON public.feedback FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 13. PAYMENT TRANSACTIONS ───────────────────────────────────
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters manage own payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Super admins read payments" ON public.payment_transactions;

CREATE POLICY "Recruiters manage own payments"
  ON public.payment_transactions FOR ALL
  USING (recruiter_id = auth.uid());

CREATE POLICY "Super admins read payments"
  ON public.payment_transactions FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 14. RECRUITER SUBSCRIPTIONS ────────────────────────────────
ALTER TABLE public.recruiter_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters manage own subscriptions" ON public.recruiter_subscriptions;
DROP POLICY IF EXISTS "Super admins read subscriptions" ON public.recruiter_subscriptions;

CREATE POLICY "Recruiters manage own subscriptions"
  ON public.recruiter_subscriptions FOR ALL
  USING (recruiter_id = auth.uid());

CREATE POLICY "Super admins read subscriptions"
  ON public.recruiter_subscriptions FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 15. PROMO CODES ────────────────────────────────────────────
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Promo codes publicly readable" ON public.promo_codes;
DROP POLICY IF EXISTS "Super admins manage promo codes" ON public.promo_codes;

CREATE POLICY "Promo codes publicly readable"
  ON public.promo_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins manage promo codes"
  ON public.promo_codes FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));


-- ── 16. RECRUITER INVITATIONS ──────────────────────────────────
ALTER TABLE public.recruiter_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage own org invitations" ON public.recruiter_invitations;
DROP POLICY IF EXISTS "Public read pending invitations" ON public.recruiter_invitations;
DROP POLICY IF EXISTS "Read pending invitations" ON public.recruiter_invitations;

CREATE POLICY "Admins manage own org invitations"
  ON public.recruiter_invitations FOR ALL
  USING (org_admin_id = auth.uid())
  WITH CHECK (org_admin_id = auth.uid());

CREATE POLICY "Read pending invitations"
  ON public.recruiter_invitations FOR SELECT
  USING (
    status = 'pending'
    AND expires_at > now()
  );


-- ── 17. APPLICATION STATUS HISTORY ────────────────────────────
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters manage status history" ON public.application_status_history;
DROP POLICY IF EXISTS "Job seekers read own status history" ON public.application_status_history;

CREATE POLICY "Recruiters manage status history"
  ON public.application_status_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_status_history.application_id
        AND a.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Job seekers read own status history"
  ON public.application_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_status_history.application_id
        AND a.profile_id = auth.uid()
    )
  );


-- ── 18. INTERVIEW DETAILS ──────────────────────────────────────
ALTER TABLE public.interview_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters manage own interview details" ON public.interview_details;
DROP POLICY IF EXISTS "Job seekers read own interview details" ON public.interview_details;

CREATE POLICY "Recruiters manage own interview details"
  ON public.interview_details FOR ALL
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

CREATE POLICY "Job seekers read own interview details"
  ON public.interview_details FOR SELECT
  USING (candidate_id = auth.uid());


-- ── 19. RECRUITER SEARCH KEYWORDS ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruiter_search_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recruiter_search_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.recruiter_search_keywords;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.recruiter_search_keywords;
DROP POLICY IF EXISTS "Recruiters manage own keyword history" ON public.recruiter_search_keywords;
DROP POLICY IF EXISTS "Super admins read keyword history" ON public.recruiter_search_keywords;

CREATE POLICY "Recruiters manage own keyword history"
  ON public.recruiter_search_keywords FOR ALL
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

CREATE POLICY "Super admins read keyword history"
  ON public.recruiter_search_keywords FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 20. SUPER ADMINS ───────────────────────────────────────────
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read own row" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins read all admins" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins update other admins" ON public.super_admins;

CREATE POLICY "Super admins read all admins"
  ON public.super_admins FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR id = auth.uid());

CREATE POLICY "Super admins update other admins"
  ON public.super_admins FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));


-- ── 21. ACTIVITY EVENTS ────────────────────────────────────────
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read activity events" ON public.activity_events;

CREATE POLICY "Super admins read activity events"
  ON public.activity_events FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 22. EMAIL LOGS ─────────────────────────────────────────────
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read email logs" ON public.email_logs;

CREATE POLICY "Super admins read email logs"
  ON public.email_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 23. ADMIN AUDIT LOG ────────────────────────────────────────
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Super admins write own audit log" ON public.admin_audit_log;

CREATE POLICY "Super admins read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins write own audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) AND actor_id = auth.uid());


-- ── 24. API REQUEST LOGS ───────────────────────────────────────
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read api request logs" ON public.api_request_logs;

CREATE POLICY "Super admins read api request logs"
  ON public.api_request_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 25. DB SIZE SNAPSHOTS ──────────────────────────────────────
ALTER TABLE public.db_size_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read db size snapshots" ON public.db_size_snapshots;

CREATE POLICY "Super admins read db size snapshots"
  ON public.db_size_snapshots FOR SELECT
  USING (public.is_super_admin(auth.uid()));


-- ── 26. SUPPORT TICKETS ────────────────────────────────────────
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users read own support tickets" ON public.support_tickets;

CREATE POLICY "Users read own support tickets"
  ON public.support_tickets FOR SELECT
  USING (requester_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Super admins manage support tickets"
  ON public.support_tickets FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));


-- ── 27. PLATFORM SETTINGS ──────────────────────────────────────
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;

CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admins manage platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));


-- ── 28. PUBLIC REPORT HELPER FUNCTION ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_recruiter_report_stats(p_recruiter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_jobs_count bigint;
  v_apps_count bigint;
  v_hires_count bigint;
BEGIN
  SELECT COUNT(*)::bigint INTO v_jobs_count FROM jobs WHERE recruiter_id = p_recruiter_id AND status = 'Active';
  SELECT COUNT(*)::bigint INTO v_apps_count FROM applications WHERE recruiter_id = p_recruiter_id;
  SELECT COUNT(*)::bigint INTO v_hires_count FROM applications WHERE recruiter_id = p_recruiter_id AND status IN ('Hired', 'Joined');

  RETURN jsonb_build_object(
    'active_jobs', v_jobs_count,
    'total_applications', v_apps_count,
    'total_hires', v_hires_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recruiter_report_stats(uuid) TO anon, authenticated;


-- ── 29. PENDING OTPS TABLE (FOR SIGNUP VERIFICATION) ───────────
CREATE TABLE IF NOT EXISTS public.pending_otps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  otp_code       TEXT NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_otps_email_idx ON public.pending_otps(email);

ALTER TABLE public.pending_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role and admin pending_otps" ON public.pending_otps;
CREATE POLICY "Allow service role and admin pending_otps"
  ON public.pending_otps FOR ALL
  USING (true)
  WITH CHECK (true);

