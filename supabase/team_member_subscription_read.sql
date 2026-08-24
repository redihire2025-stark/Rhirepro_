-- =============================================================
-- RhirePro — let a team member read their org admin's subscription
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- Invited team members don't buy their own plan — they're covered by the
-- org admin's subscription. The recruiter dashboard now checks the admin's
-- recruiter_subscriptions row (instead of the member's own, which never has
-- one) so members can see the real plan name and daily post quota instead
-- of "Free plan · 1 post/day".
--
-- But recruiter_subscriptions only had:
--   USING (recruiter_id = auth.uid())
-- which blocks exactly that read — a member querying the admin's row gets
-- silently filtered out by RLS (no error, just zero rows), so without this
-- policy the client-side fix has nothing to read.
-- =============================================================

BEGIN;

DROP POLICY IF EXISTS "Team members read org admin subscription" ON public.recruiter_subscriptions;
CREATE POLICY "Team members read org admin subscription"
  ON public.recruiter_subscriptions FOR SELECT
  USING (
    recruiter_id = (SELECT org_admin_id FROM public.recruiter_profiles WHERE id = auth.uid())
  );

COMMIT;
