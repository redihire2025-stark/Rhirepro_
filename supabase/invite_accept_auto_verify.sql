-- =============================================================
-- RhirePro — auto-verify recruiters invited into an organization
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- recruiter_profiles.verification_status defaults to 'Pending' on every new
-- row (per the comment in RecruiterSignIn.tsx's approval gate — the column
-- itself was added directly against the live database at some point, no
-- migration file in this repo defines it), so a recruiter invited by an
-- org admin was hitting the same "awaiting approval from our team" wall as
-- a brand-new solo signup — even though the org admin already vetted them
-- by inviting them. Super Admin approval should stay required for solo
-- recruiter signups and anyone without a plan; it was never meant to also
-- gate someone an already-verified org admin brought onto their own team.
--
-- accept_recruiter_invitation() (invitation_accept_fix.sql) is the one
-- place that links a new signup to an org — re-created here with
-- verification_status set to 'Verified' at that same moment. Everything
-- else in the function is unchanged.
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
    RETURN jsonb_build_object('ok', inv.status = 'accepted', 'error', inv.status);
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.recruiter_profiles rp
    WHERE rp.id = caller AND lower(rp.email) = lower(inv.invited_email)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  UPDATE public.recruiter_profiles
  SET org_admin_id        = inv.org_admin_id,
      org_role            = COALESCE(NULLIF(inv.role, ''), 'member'),
      -- Being invited onto an already-verified org admin's team is the
      -- vetting — no separate Super Admin review needed on top of that.
      verification_status = 'Verified',
      verified_at          = now(),
      rejection_reason     = NULL,
      rejected_at          = NULL,
      rejected_by          = NULL
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
-- Team members who already accepted an invite before this fix, but are
-- still stuck Pending, get unblocked too — org_admin_id being set at all
-- is proof they went through the invite flow, not a solo signup.
UPDATE public.recruiter_profiles
SET verification_status = 'Verified', verified_at = COALESCE(verified_at, now())
WHERE org_admin_id IS NOT NULL
  AND verification_status = 'Pending';

COMMIT;
