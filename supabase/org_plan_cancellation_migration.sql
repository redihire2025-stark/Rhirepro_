-- =============================================================
-- RhirePro — org admin plan cancellation / expiry unwind
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHAT THIS DOES
-- ---------------
-- When an org admin's plan is cancelled (by a super admin) or expires
-- naturally, their team needs to be unwound:
--   1. Team members' jobs are reassigned to the admin's own account, so
--      the job listings and application history survive under the admin
--      instead of disappearing with the member.
--   2. Team members are DEACTIVATED (is_active = false) — not deleted.
--      This is reversible: if the cancellation turns out to be a mistake
--      or the admin renews quickly, support can flip is_active back
--      rather than having to recreate accounts that no longer exist.
--   3. The admin is demoted: is_org_admin = false and max_seats reset to
--      the solo-recruiter default. The existing hasPaidAccess guard in
--      RecruiterDashboard.tsx already redirects a recruiter with no active
--      plan and no org-admin flag to the Plans page and blocks job
--      posting — so "treated as a normal Recruiter, can't post jobs until
--      they get a plan" falls out of this for free, no new UI needed.
--
-- unwind_org_admin_plan() is idempotent — calling it on an account that
-- was already unwound (or was never an org admin) is a no-op that returns
-- zero rows.
--
-- Team members get an in-app notification immediately (same pattern as
-- job_expiry_scheduler.sql's expiry warnings — pure SQL, no external
-- dependency). Actually emailing them is handled by the caller: the
-- manual (super-admin-initiated) path does this synchronously in
-- netlify/functions/org-plan-cancelled.mjs, using the recipient list this
-- function returns. The natural-expiry cron path below does the same data
-- unwind and in-app notification but does NOT attempt to send email —
-- that would need either Netlify Scheduled Functions or a pg_net call to
-- an HTTP endpoint, and shipping an unverifiable automated email pipeline
-- against real accounts isn't a call to make without confirming the
-- mechanism first.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.unwind_org_admin_plan(p_admin_id uuid)
RETURNS TABLE (
  member_id     uuid,
  member_email  text,
  member_name   text,
  admin_email   text,
  company_name  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email   text;
  v_company_name  text;
BEGIN
  -- Idempotent guard: only unwind an account that is actually (still) an
  -- org admin. Calling this twice, or on a solo recruiter, does nothing.
  IF NOT EXISTS (
    SELECT 1 FROM public.recruiter_profiles rp
    WHERE rp.id = p_admin_id AND rp.is_org_admin IS TRUE
  ) THEN
    RETURN;
  END IF;

  SELECT rp.email, rp.company_name INTO v_admin_email, v_company_name
  FROM public.recruiter_profiles rp WHERE rp.id = p_admin_id;

  -- Capture the affected members BEFORE deactivating them, so the caller
  -- has emails/names to notify even after this function locks them out.
  CREATE TEMP TABLE IF NOT EXISTS _unwind_members ON COMMIT DROP AS
  SELECT m.id, m.email, m.recruiter_name
  FROM public.recruiter_profiles m
  WHERE m.org_admin_id = p_admin_id AND m.is_active IS TRUE;

  -- 1. Jobs follow ownership to the admin so listings/applications survive.
  UPDATE public.jobs
  SET recruiter_id = p_admin_id
  WHERE recruiter_id IN (SELECT id FROM public.recruiter_profiles WHERE org_admin_id = p_admin_id);

  -- 2. In-app notification while we still know who's affected.
  INSERT INTO public.notifications (user_id, user_type, title, message, type, is_read)
  SELECT
    id,
    'recruiter',
    'Your organization plan has ended',
    'The plan for ' || COALESCE(v_company_name, 'your organization') ||
      ' has ended, and you are no longer participating in RhirePro through this organization. Contact support if you''d like to continue.',
    'status_change',
    false
  FROM _unwind_members;

  -- 3. Deactivate the team — reversible, not a delete.
  UPDATE public.recruiter_profiles
  SET is_active = false
  WHERE org_admin_id = p_admin_id AND is_active IS TRUE;

  -- 4. Demote the admin back to a normal (unpaid, no-team) recruiter.
  UPDATE public.recruiter_profiles
  SET is_org_admin = false, max_seats = 5
  WHERE id = p_admin_id;

  RETURN QUERY
  SELECT um.id, um.email, um.recruiter_name, v_admin_email, v_company_name
  FROM _unwind_members um;
END;
$$;

-- Deliberately no GRANT to authenticated — this is only ever called with
-- the service role, from the super-admin-verified Netlify function or the
-- cron job below. It should not be reachable from the client at all.


-- ── Natural expiry sweep ─────────────────────────────────────────
-- Runs alongside the existing mark-expired-jobs job. Finds org admins
-- whose active subscription has passed its expiry, marks that
-- subscription 'expired', and runs the same unwind.

CREATE OR REPLACE FUNCTION public.sweep_expired_org_admin_plans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (rs.recruiter_id) rs.id, rs.recruiter_id
    FROM public.recruiter_subscriptions rs
    JOIN public.recruiter_profiles rp ON rp.id = rs.recruiter_id
    WHERE rs.status = 'active'
      AND rs.expires_at <= now()
      AND rp.is_org_admin IS TRUE
    ORDER BY rs.recruiter_id, rs.expires_at DESC
  LOOP
    UPDATE public.recruiter_subscriptions SET status = 'expired' WHERE id = r.id;
    PERFORM public.unwind_org_admin_plan(r.recruiter_id);
  END LOOP;
END;
$$;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id FROM cron.job WHERE jobname = 'sweep-expired-org-admin-plans' LIMIT 1;
  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'sweep-expired-org-admin-plans',
  '*/10 * * * *',
  $$SELECT public.sweep_expired_org_admin_plans();$$
);

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SELECT * FROM cron.job WHERE jobname = 'sweep-expired-org-admin-plans';
--   -- Manual test against a specific admin (service role / SQL editor only):
--   SELECT * FROM public.unwind_org_admin_plan('<recruiter_profiles.id of an org admin>');
