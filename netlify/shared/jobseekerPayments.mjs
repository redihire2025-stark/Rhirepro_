/*
 * Job seeker premium plan — pricing, order/activation, and identity
 * resolution. Mirrors netlify/shared/payments.mjs (the recruiter flow), with
 * one deliberate difference: recruiter_id / plan ownership there is trusted
 * straight from the client request body, with no verification that the
 * caller IS that recruiter. This flow does not repeat that — every function
 * that touches money or activates a plan resolves the paying identity from
 * the caller's own Supabase auth token (see resolveCaller below), never from
 * a client-supplied id.
 */

// A single premium plan. basePrice is what it reverts to once the launch
// offer ends — flip launchOfferActive to false (and this file is the only
// place that needs to change) when told to stop discounting.
export const JOBSEEKER_PLAN = {
  id: "premium",
  name: "Premium",
  basePrice: 399,
  launchOfferActive: true,
  launchPrice: 199,
};

export function getJobseekerPlanPrice() {
  return JOBSEEKER_PLAN.launchOfferActive ? JOBSEEKER_PLAN.launchPrice : JOBSEEKER_PLAN.basePrice;
}

// Mirrors the recruiter PROMO_CODES in netlify/shared/payments.mjs. Add or
// remove entries here to add/remove a coupon — this object is the single
// source of truth server-side; src/lib/jobseekerPlan.ts mirrors it for
// instant client-side preview only, the actual charge is always computed
// here, never trusted from the client.
export const PROMO_CODES = {
  RHIRE10: { discountType: "percentage", discountValue: 10 },
  RHIRE20: { discountType: "percentage", discountValue: 20 },
  HIRE50: { discountType: "percentage", discountValue: 50 },
  NEWJOIN: { discountType: "fixed", discountValue: 100 },
  RHIRE99: { discountType: "set_price", discountValue: 1 },
};

/** Discount is applied to the CURRENT effective price (launch price while
 * the launch offer is active), not the original base price — a coupon on
 * top of an already-discounted launch price, not instead of it. */
export function calculateJobseekerPrice(promoCode) {
  const basePrice = getJobseekerPlanPrice();
  let discountedPrice = basePrice;

  const code = String(promoCode || "").trim().toUpperCase();
  if (code) {
    const promo = PROMO_CODES[code];
    if (promo) {
      if (promo.discountType === "percentage") {
        discountedPrice = Math.round(basePrice * (1 - promo.discountValue / 100));
      } else if (promo.discountType === "set_price") {
        discountedPrice = promo.discountValue;
      } else {
        discountedPrice = Math.max(1, basePrice - promo.discountValue);
      }
    }
    // An unrecognised code is ignored rather than rejected.
  }

  return {
    base_price: basePrice,
    discount_amount: basePrice - discountedPrice,
    total_amount: discountedPrice,
  };
}

export class PaymentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const json = (payload, status) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// ── Supabase REST helpers (service role — bypasses RLS) ────────────────────────

const SUPABASE_URL = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra = {}) {
  const key = SERVICE_KEY();
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

export async function sbSelect(path) {
  const res = await fetch(`${SUPABASE_URL()}/rest/v1/${path}`, { headers: sbHeaders() });
  if (!res.ok) return [];
  return res.json().catch(() => []);
}

export async function sbInsert(table, row, { returning = true } = {}) {
  const res = await fetch(`${SUPABASE_URL()}/rest/v1/${table}`, {
    method: "POST",
    headers: sbHeaders({ Prefer: returning ? "return=representation" : "return=minimal" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    throw new PaymentError(`insert into ${table} failed (${res.status}): ${await res.text().catch(() => "")}`, 500);
  }
  return returning ? res.json().catch(() => []) : [];
}

export async function sbPatch(table, query, patch) {
  const res = await fetch(`${SUPABASE_URL()}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: sbHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new PaymentError(`update ${table} failed (${res.status}): ${await res.text().catch(() => "")}`, 500);
  }
}

/**
 * Resolve the calling job seeker's identity from their own Supabase session
 * token — never from anything the client claims in a request body. This is
 * what makes plan purchase/activation "carefully validated": a forged
 * request can only ever activate a plan for the account whose token it
 * carries.
 */
export async function resolveCaller(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const res = await fetch(`${SUPABASE_URL()}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY(), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  if (!user?.id) return null;
  return { id: user.id, email: user.email || null };
}

/**
 * Whether this job seeker currently has an active plan — checked live
 * against status + expiry, the same "no cron, check at read time" approach
 * the recruiter side uses.
 *
 * Defensive secondary check: if this Supabase project does not have
 * automatic account-linking enabled for matching emails across auth
 * providers, a job seeker who purchased while signed in with email/password
 * and later signs in with Google (or vice versa) can end up with a SECOND
 * `auth.users` row / profile for the same email, and `caller.id` here would
 * be that second, unpaid profile. To guard against silently losing access,
 * when no active plan is found under the caller's own id, we also look for
 * any OTHER profile sharing the same verified email with an active plan.
 * This never grants access based on email alone without an actual paid
 * subscription existing somewhere behind that email.
 */
export async function getActiveSubscriptionForCaller(caller) {
  const now = new Date().toISOString();

  const direct = await sbSelect(
    `jobseeker_subscriptions?profile_id=eq.${encodeURIComponent(caller.id)}` +
      `&status=eq.active&expires_at=gte.${encodeURIComponent(now)}` +
      `&select=*&order=created_at.desc&limit=1`,
  );
  if (Array.isArray(direct) && direct.length > 0) {
    return { subscription: direct[0], viaLinkedEmail: false };
  }

  if (!caller.email) return { subscription: null, viaLinkedEmail: false };

  const siblingProfiles = await sbSelect(
    `profiles?email=eq.${encodeURIComponent(caller.email)}&id=neq.${encodeURIComponent(caller.id)}&select=id`,
  );
  if (!Array.isArray(siblingProfiles) || siblingProfiles.length === 0) {
    return { subscription: null, viaLinkedEmail: false };
  }

  const idFilter = siblingProfiles.map((p) => p.id).join(",");
  const viaEmail = await sbSelect(
    `jobseeker_subscriptions?profile_id=in.(${idFilter})` +
      `&status=eq.active&expires_at=gte.${encodeURIComponent(now)}` +
      `&select=*&order=created_at.desc&limit=1`,
  );
  if (Array.isArray(viaEmail) && viaEmail.length > 0) {
    return { subscription: viaEmail[0], viaLinkedEmail: true };
  }

  return { subscription: null, viaLinkedEmail: false };
}

/**
 * Mark the payment successful and activate the job seeker's plan. Mirrors
 * activateRecruiterPlan(): reuse the pending transaction created at order
 * time when it exists, cancel any current subscription, insert the new one.
 */
export async function activateJobseekerPlan({ profileId, orderId, paymentId, amount, discountAmount, finalAmount, promoCode }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const existing = await sbSelect(
    `jobseeker_payment_transactions?select=id&or=(transaction_ref.eq.${encodeURIComponent(orderId)},transaction_ref.eq.${encodeURIComponent(paymentId)})`,
  );

  let txnId = null;
  if (Array.isArray(existing) && existing.length > 0) {
    txnId = existing[0].id;
    await sbPatch("jobseeker_payment_transactions", `id=eq.${txnId}`, {
      status: "success",
      payment_method: "razorpay",
      transaction_ref: paymentId,
      completed_at: now.toISOString(),
    });
  } else {
    const inserted = await sbInsert("jobseeker_payment_transactions", {
      profile_id: profileId,
      plan_id: JOBSEEKER_PLAN.id,
      amount: amount ?? getJobseekerPlanPrice(),
      promo_code: promoCode || null,
      discount_amount: discountAmount ?? 0,
      final_amount: finalAmount ?? amount ?? getJobseekerPlanPrice(),
      status: "success",
      payment_method: "razorpay",
      transaction_ref: paymentId,
      completed_at: now.toISOString(),
    });
    if (Array.isArray(inserted) && inserted.length > 0) txnId = inserted[0].id;
  }

  await sbPatch(
    "jobseeker_subscriptions",
    `profile_id=eq.${profileId}&status=eq.active`,
    { status: "cancelled" },
  );

  await sbInsert(
    "jobseeker_subscriptions",
    {
      profile_id: profileId,
      plan_id: JOBSEEKER_PLAN.id,
      status: "active",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_id: txnId,
    },
    { returning: false },
  );

  try {
    await sbInsert(
      "notifications",
      {
        user_id: profileId,
        user_type: "jobseeker",
        title: "Premium Activated!",
        message: "Your RhirePro Premium plan is now active for the next 30 days.",
        type: "status_change",
        is_read: false,
      },
      { returning: false },
    );
  } catch (err) {
    console.warn("[jobseekerPayments] notification insert failed:", err.message);
  }

  return { txnId, expiresAt: expiresAt.toISOString() };
}
