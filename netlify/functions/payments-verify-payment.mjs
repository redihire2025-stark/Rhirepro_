import crypto from "crypto";
import { activateRecruiterPlan, PaymentError, json } from "../shared/payments.mjs";

/*
 * POST /api/payments/verify-payment
 * Port of verify_razorpay_payment() from backend/notifications_api.py.
 *
 * Razorpay signs "<order_id>|<payment_id>" with HMAC-SHA256 keyed on the API
 * secret. This is the only thing standing between a forged client callback and
 * a free subscription, so the signature is checked before anything is written.
 */
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("[verify-payment] RAZORPAY_KEY_SECRET missing from the environment");
    return json({ detail: "Payment gateway is not configured. Please contact support." }, 500);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ detail: "Invalid request body." }, 400);
  }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    recruiter_id: recruiterId,
    plan_id: planId,
  } = body;

  if (!orderId || !paymentId || !signature || !recruiterId || !planId) {
    return json({ detail: "Missing required payment verification fields." }, 400);
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  // timingSafeEqual throws on length mismatch, so compare lengths first.
  const provided = String(signature);
  const matches =
    provided.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));

  if (!matches) {
    console.warn(`[verify-payment] signature mismatch for order ${orderId}`);
    return json({ detail: "Invalid Razorpay signature." }, 400);
  }

  try {
    await activateRecruiterPlan({ recruiterId, planId, orderId, paymentId });
    return json(
      {
        success: true,
        message: "Payment verified and plan activated successfully.",
        transaction_ref: paymentId,
      },
      200,
    );
  } catch (err) {
    // The signature was valid, so the customer has genuinely paid — surface the
    // failure loudly rather than silently leaving them without a subscription.
    console.error(`[verify-payment] activation failed after valid payment ${paymentId}:`, err);
    const detail =
      err instanceof PaymentError
        ? err.message
        : "Payment succeeded but activating the plan failed. Please contact support.";
    return json({ detail, transaction_ref: paymentId }, 500);
  }
};

export const config = { path: "/api/payments/verify-payment" };
