-- =============================================================
-- RhirePro — Let Super Admins read the newsletter subscriber list
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- Signups work: the table holds 12 rows and new ones arrive correctly. But the
-- Super Admin newsletter page shows a count of 0, because the table has RLS
-- enabled and only two policies, both INSERT:
--
--   [INSERT] Allow anonymous newsletter signup
--   [INSERT] Allow authenticated newsletter signup
--
-- With RLS on, no SELECT policy means no SELECT for anyone — so the list and
-- the count come back empty.
--
-- This also silently broke two other things:
--   * newsletterBroadcast.ts reads this table to build its recipient list, so a
--     broadcast would have found zero subscribers and sent nothing.
--   * newsletter.ts pre-checks for an existing email before inserting; that
--     check always came back empty. Harmless in practice - email is UNIQUE, so
--     a duplicate is rejected by the constraint instead - and there are no
--     duplicate rows in the table.
--
-- Deliberately NOT granting SELECT to anon: the subscriber list is a set of
-- personal email addresses and must not be readable from the public site. The
-- pre-check stays broken for anonymous visitors by design; the UNIQUE
-- constraint is what actually prevents duplicates.
-- =============================================================

BEGIN;

DROP POLICY IF EXISTS "Super admins read newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Super admins read newsletter subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Managing a mailing list means being able to honour an unsubscribe request,
-- which is impossible with SELECT alone.
DROP POLICY IF EXISTS "Super admins remove newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Super admins remove newsletter subscribers"
  ON public.newsletter_subscribers FOR DELETE
  USING (public.is_super_admin(auth.uid()));

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   as a super admin  -> SELECT count(*) returns every row
--   as anon           -> SELECT count(*) returns 0
--   as anon           -> INSERT still succeeds (signup must keep working)
