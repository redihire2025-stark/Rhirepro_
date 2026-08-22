-- =============================================================
-- RhirePro — Let an invited recruiter actually accept their invitation
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- RecruiterInviteAccept marks the invitation accepted with a plain update:
--
--   supabase.from("recruiter_invitations").update({ status: "accepted" })
--
-- but the only UPDATE policy on that table is
--
--   Admins manage own org invitations  USING (org_admin_id = auth.uid())
--
-- so the write is silently dropped for everyone except the admin who sent it —
-- and the client never checked the error. Every invitee who joined stayed in
-- "Pending Invitations" forever: all 7 pending rows already have an account,
-- and two of them are correctly linked to the inviting org.
--
-- A SECURITY DEFINER function keeps the table locked down while letting the
-- one person holding the token complete their own invitation.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.accept_recruiter_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  inv    public.recruiter_invitations%ROWTYPE;
BEGIN
  IF caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.recruiter_invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF inv.status NOT IN ('pending', 'link_opened') THEN
    -- Already accepted is not an error: re-running must be harmless.
    RETURN jsonb_build_object('ok', inv.status = 'accepted', 'error', inv.status);
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  /*
   * The token alone is not enough — it must be redeemed by the person it was
   * addressed to. Without this check anyone holding a leaked link could attach
   * their own account to the organisation.
   */
  IF NOT EXISTS (
    SELECT 1 FROM public.recruiter_profiles rp
    WHERE rp.id = caller AND lower(rp.email) = lower(inv.invited_email)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  UPDATE public.recruiter_profiles
  SET org_admin_id = inv.org_admin_id,
      org_role     = COALESCE(NULLIF(inv.role, ''), 'member')
  WHERE id = caller;

  UPDATE public.recruiter_invitations
  SET status = 'accepted'
  WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_recruiter_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_recruiter_invitation(text) TO authenticated;


-- ── Backfill ──────────────────────────────────────────────────
-- Only rows where the invitee's profile is already linked to the inviting
-- admin. Those people demonstrably completed the flow and the status write is
-- the only step that failed. Invitations whose email happens to match an
-- unrelated existing account are deliberately left alone — linking those would
-- pull accounts into an organisation that never accepted.
UPDATE public.recruiter_invitations i
SET status = 'accepted'
WHERE i.status IN ('pending', 'link_opened')
  AND EXISTS (
    SELECT 1 FROM public.recruiter_profiles rp
    WHERE lower(rp.email) = lower(i.invited_email)
      AND rp.org_admin_id = i.org_admin_id
  );

COMMIT;


-- ── VERIFY ────────────────────────────────────────────────────
--   SELECT status, count(*) FROM public.recruiter_invitations GROUP BY 1;
