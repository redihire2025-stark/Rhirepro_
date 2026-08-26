import crypto from "crypto";
import { activateJobseekerPlan, resolveCaller, PaymentError, json } from "../shared/jobseekerPayments.mjs";

/*
 * POST /api/jobseeker-payments-verify-payment
 *
 * Razorpay signs "<order_id>|<payment_id>" with HMAC-SHA256 keyed on the API
 * secret — that signature is verified first. The plan is then activated for
 * whoever the CALLER'S OWN session token resolves to, never for a
 * client-supplied id, so a forged request cannot activate premium for an
 * account it doesn't hold the session for.
 */
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("[jobseeker-verify-payment] RAZORPAY_KEY_SECRET missing from the environment");
    return json({ detail: "Payment gateway is not configured. Please contact support." }, 500);
  }

  const caller = await resolveCaller(request);
  if (!caller) {
    return json({ detail: "Please sign in to complete this purchase." }, 401);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ detail: "Invalid request body." }, 400);
  }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = body;

  if (!orderId || !paymentId || !signature) {
    return json({ detail: "Missing required payment verification fields." }, 400);
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const provided = String(signature);
  const matches =
    provided.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));

  if (!matches) {
    console.warn(`[jobseeker-verify-payment] signature mismatch for order ${orderId}`);
    return json({ detail: "Invalid Razorpay signature." }, 400);
  }

  try {
    const result = await activateJobseekerPlan({ profileId: caller.id, orderId, paymentId });
    return json(
      {
        success: true,
        message: "Payment verified and Premium activated successfully.",
        transaction_ref: paymentId,
        expires_at: result.expiresAt,
      },
      200,
    );
  } catch (err) {
    console.error(`[jobseeker-verify-payment] activation failed after valid payment ${paymentId}:`, err);
    const detail =
      err instanceof PaymentError
        ? err.message
        : "Payment succeeded but activating Premium failed. Please contact support.";
    return json({ detail, transaction_ref: paymentId }, 500);
  }
};

export const config = { path: "/api/jobseeker-payments-verify-payment" };
