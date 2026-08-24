/*
 * Pricing and plan activation, ported from backend/notifications_api.py.
 *
 * The Python service this replaces was never deployed anywhere, so the frontend
 * has been calling http://localhost:8000 in production and every recruiter plan
 * purchase failed with "Payment Failed - Failed to fetch". Netlify Functions
 * cannot run Python, but nothing here needed it: the original used urllib, hmac
 * and hashlib, which map directly onto fetch and node:crypto.
 *
 * The arithmetic below is a deliberate line-for-line port. It decides what a
 * customer is charged, so it must not be "tidied up" - in particular GST is
 * calculated on the ORIGINAL base price, not the discounted price, and is
 * skipped entirely for set_price promos. That is how the Python behaved.
 */

export const PLANS = {
  basic: { id: "basic", name: "Basic Plan", price: 1000, dailyJobPosts: 10, maxSeats: 1 },
  standard: { id: "standard", name: "Standard Plan", price: 1000, dailyJobPosts: 50, maxSeats: 5 },
  premium: { id: "premium", name: "Premium Plan", price: 3000, dailyJobPosts: null, maxSeats: 10 },
};

export const PROMO_CODES = {
  RHIRE10: { discountType: "percentage", discountValue: 10 },
  RHIRE20: { discountType: "percentage", discountValue: 20 },
  HIRE50: { discountType: "percentage", discountValue: 50 },
  NEWJOIN: { discountType: "fixed", discountValue: 100 },
  RHIRE99: { discountType: "set_price", discountValue: 1 },
};

/** Thrown for conditions the original raised HTTPException(400) for. */
export class PaymentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Python's round() is banker's rounding, but every call site here operates on
// values that never land on a .5 boundary (18% of an integer, and integer
// percentage discounts of 350/1000/3000), so Math.round is equivalent.
export function calculatePlanPrice(planId, promoCode) {
  const plan = PLANS[String(planId || "").toLowerCase()];
  if (!plan) throw new PaymentError(`Invalid plan ID: ${planId}`);

  const basePrice = plan.price;
  const gstRate = 0.18;
  let discountAmount = 0;
  let isSetPrice = false;
  let discountedBase = basePrice;

  const code = String(promoCode || "").trim().toUpperCase();
  if (code) {
    const promo = PROMO_CODES[code];
    if (promo) {
      if (promo.discountType === "percentage") {
        discountedBase = Math.round(basePrice * (1 - promo.discountValue / 100));
      } else if (promo.discountType === "set_price") {
        discountedBase = promo.discountValue;
        isSetPrice = true;
      } else {
        discountedBase = Math.max(1, basePrice - promo.discountValue);
      }
      discountAmount = basePrice - discountedBase;
    }
    // An unrecognised code is ignored rather than rejected, as before.
  }

  const gstAmount = isSetPrice ? 0 : Math.round(basePrice * gstRate);

  return {
    base_price: basePrice,
    discount_amount: discountAmount,
    gst_amount: gstAmount,
    total_amount: discountedBase + gstAmount,
    daily_job_posts: plan.dailyJobPosts,
    plan_name: plan.name,
  };
}

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
 * Mark the payment successful and switch the recruiter onto the new plan.
 * Mirrors activate_recruiter_plan(): reuse the pending transaction created at
 * order time when it exists, cancel any current subscription, insert the new
 * one, promote the recruiter to org admin, and notify them.
 */
export async function activateRecruiterPlan({ recruiterId, planId, orderId, paymentId }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const plan = PLANS[String(planId || "").toLowerCase()] || null;

  const existing = await sbSelect(
    `payment_transactions?select=id&or=(transaction_ref.eq.${encodeURIComponent(orderId)},transaction_ref.eq.${encodeURIComponent(paymentId)})`,
  );

  let txnId = null;
  if (Array.isArray(existing) && existing.length > 0) {
    txnId = existing[0].id;
    await sbPatch("payment_transactions", `id=eq.${txnId}`, {
      status: "success",
      payment_method: "razorpay",
      transaction_ref: paymentId,
      completed_at: now.toISOString(),
    });
  } else {
    const inserted = await sbInsert("payment_transactions", {
      recruiter_id: recruiterId,
      plan_id: planId,
      amount: plan ? plan.price : 0,
      final_amount: plan ? plan.price : 0,
      status: "success",
      payment_method: "razorpay",
      transaction_ref: paymentId,
      completed_at: now.toISOString(),
    });
    if (Array.isArray(inserted) && inserted.length > 0) txnId = inserted[0].id;
  }

  await sbPatch(
    "recruiter_subscriptions",
    `recruiter_id=eq.${recruiterId}&status=eq.active`,
    { status: "cancelled" },
  );

  await sbInsert(
    "recruiter_subscriptions",
    {
      recruiter_id: recruiterId,
      plan_id: planId,
      status: "active",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      daily_job_posts: plan ? plan.dailyJobPosts : null,
      payment_id: txnId,
    },
    { returning: false },
  );

  await sbPatch("recruiter_profiles", `id=eq.${recruiterId}`, {
    org_role: "admin",
    max_seats: plan ? plan.maxSeats : 1,
    is_org_admin: true,
  });

  // Best-effort, exactly as the Python treated it.
  try {
    await sbInsert(
      "notifications",
      {
        user_id: recruiterId,
        user_type: "recruiter",
        title: "Subscription Activated!",
        message: `Your ${plan ? plan.name : planId} subscription has been activated successfully.`,
        type: "status_change",
        is_read: false,
      },
      { returning: false },
    );
  } catch (err) {
    console.warn("[payments] notification insert failed:", err.message);
  }

  return { txnId };
}

export const json = (payload, status) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
