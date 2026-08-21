import { calculatePlanPrice, sbInsert, PaymentError, json } from "../shared/payments.mjs";

/*
 * POST /api/payments/create-order
 * Port of create_razorpay_order() from backend/notifications_api.py.
 *
 * Razorpay's Orders API is a plain REST call with HTTP Basic auth, so no SDK is
 * needed. The response shape is kept identical to the Python service because
 * PaymentGatewayPage reads order_id / amount / key_id straight off it.
 */
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error("[create-order] Razorpay credentials missing from the environment");
    return json({ detail: "Payment gateway is not configured. Please contact support." }, 500);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ detail: "Invalid request body." }, 400);
  }

  const { plan_id: planId, recruiter_id: recruiterId, promo_code: promoCode } = body;
  if (!planId || !recruiterId) {
    return json({ detail: "plan_id and recruiter_id are required." }, 400);
  }

  try {
    const price = calculatePlanPrice(planId, promoCode);
    // Razorpay works in paise and rejects anything under ₹1.
    const amountInPaise = Math.max(100, price.total_amount * 100);

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    let res;
    try {
      res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${String(recruiterId).slice(0, 8)}_${Math.floor(Date.now() / 1000)}`,
          notes: {
            recruiter_id: recruiterId,
            plan_id: planId,
            promo_code: promoCode || "",
          },
        }),
      });
    } catch (networkErr) {
      console.error("[create-order] could not reach Razorpay:", networkErr.message);
      return json({ detail: "Could not reach the payment gateway. Please try again." }, 502);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[create-order] Razorpay ${res.status}:`, errText);
      return json({ detail: `Razorpay order creation failed: ${errText}` }, 502);
    }

    const order = await res.json();

    // Record the pending transaction. Best-effort, as in the original: the
    // customer should not be blocked from paying because our bookkeeping row
    // failed to write, and verify-payment inserts one if it is missing.
    try {
      await sbInsert(
        "payment_transactions",
        {
          recruiter_id: recruiterId,
          plan_id: planId,
          amount: price.base_price,
          promo_code: promoCode || null,
          discount_amount: price.discount_amount,
          final_amount: price.total_amount,
          status: "pending",
          payment_method: "razorpay",
          transaction_ref: order.id,
        },
        { returning: false },
      );
    } catch (err) {
      console.warn("[create-order] pending transaction not recorded:", err.message);
    }

    return json(
      {
        order_id: order.id,
        amount: amountInPaise,
        currency: "INR",
        key_id: keyId,
        plan_id: planId,
        final_amount: price.total_amount,
        discount_amount: price.discount_amount,
        base_price: price.base_price,
        gst_amount: price.gst_amount,
      },
      200,
    );
  } catch (err) {
    if (err instanceof PaymentError) {
      return json({ detail: err.message }, err.status);
    }
    console.error("[create-order] unhandled:", err);
    return json({ detail: "Could not create the payment order. Please try again." }, 500);
  }
};

export const config = { path: "/api/payments/create-order" };
