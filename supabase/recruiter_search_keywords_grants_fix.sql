-- =============================================================
-- RhirePro — grant access to recruiter_search_keywords
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- Same missing-grant bug found repeatedly this session on email_logs,
-- api_request_logs, admin_audit_log and support_tickets: this table was
-- also created by pasting raw SQL, so `authenticated` never got the table
-- grant the Studio Table Editor adds automatically. Its RLS policies are
-- fully permissive (USING (true)), so they were never the problem —
-- Postgres was rejecting the query before RLS was ever evaluated.
--
-- log_recruiter_keywords() itself was unaffected (SECURITY DEFINER
-- functions run as their owner, bypassing this) — this only blocked the
-- Org Admin panel's DIRECT read of a team member's keyword history
-- (`.from("recruiter_search_keywords").select(...)`), which is why it
-- looked like keyword tracking "worked for the admin but not the team
-- member": the admin's own browser sometimes had stale localStorage from
-- an earlier client-side fallback masking the same 403 underneath.
-- =============================================================

BEGIN;

GRANT SELECT, INSERT ON public.recruiter_search_keywords TO authenticated;

COMMIT;
