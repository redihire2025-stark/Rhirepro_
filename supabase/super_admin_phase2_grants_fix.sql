-- =============================================================
-- RhirePro — grant table access that super_admin_phase2_migration.sql missed
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- email_logs, api_request_logs and admin_audit_log were all created by
-- pasting raw SQL into the SQL Editor. Each got an RLS policy, but RLS is
-- only evaluated *after* Postgres checks the table-level GRANT — and none
-- of the three ever received one for the `authenticated` role. (Tables
-- created through the Supabase Studio Table Editor get that grant added
-- automatically; tables created by running SQL directly do not.)
--
-- The result: any super admin session querying these tables gets a flat
-- "permission denied for table ..." (42501) before the "Super admins
-- read ..." policy is ever consulted — which is exactly the error seen on
-- the Emails page. The same wall blocks the Audit Logs and API Monitoring
-- pages (admin_audit_log / api_request_logs), even though nothing in this
-- conversation has exercised those yet.
--
-- notifications and jobs/applications/etc. were unaffected because they're
-- older tables that already carried the standard grant from project setup;
-- only these three new phase-2 tables were missing it.
-- =============================================================

BEGIN;

GRANT SELECT ON public.email_logs TO authenticated;
GRANT SELECT ON public.api_request_logs TO authenticated;

-- admin_audit_log also has a client-side INSERT policy ("Super admins write
-- own audit log"), so it needs both grants — SELECT alone would leave writes
-- blocked by the same 42501 wall.
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;

COMMIT;

-- ── VERIFY (run as yourself, in the SQL Editor, which bypasses RLS/grants
--    entirely — so this only confirms the tables exist, not that the fix
--    worked. Re-check the actual Super Admin pages in the browser after.) ──
--   SELECT count(*) FROM public.email_logs;
--   SELECT count(*) FROM public.api_request_logs;
--   SELECT count(*) FROM public.admin_audit_log;
