import { calculateJobseekerPrice, JOBSEEKER_PLAN, resolveCaller, sbInsert, PaymentError, json } from "../shared/jobseekerPayments.mjs";

/*
 * POST /api/jobseeker-payments-create-order
 *
 * Unlike the recruiter equivalent, the paying identity (profile_id) is never
 * read from the request body — it is resolved from the caller's own
 * Supabase session token, so this endpoint can only ever create an order for
 * the signed-in user themselves.
 */
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error("[jobseeker-create-order] Razorpay credentials missing from the environment");
    return json({ detail: "Payment gateway is not configured. Please contact support." }, 500);
  }

  const caller = await resolveCaller(request);
  if (!caller) {
    return json({ detail: "Please sign in to purchase Premium." }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const promoCode = typeof body?.promo_code === "string" ? body.promo_code : undefined;

  try {
    // The discount is computed here from PROMO_CODES, never trusted from the
    // client — a client could send any promo_code string, but only a
    // recognised one changes the price actually charged.
    const price = calculateJobseekerPrice(promoCode);
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
          receipt: `js_rcpt_${String(caller.id).slice(0, 8)}_${Math.floor(Date.now() / 1000)}`,
          notes: {
            profile_id: caller.id,
            plan_id: JOBSEEKER_PLAN.id,
            promo_code: promoCode || "",
          },
        }),
      });
    } catch (networkErr) {
      console.error("[jobseeker-create-order] could not reach Razorpay:", networkErr.message);
      return json({ detail: "Could not reach the payment gateway. Please try again." }, 502);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[jobseeker-create-order] Razorpay ${res.status}:`, errText);
      return json({ detail: `Razorpay order creation failed: ${errText}` }, 502);
    }

    const order = await res.json();

    // Best-effort pending row, exactly as the recruiter flow does.
    try {
      await sbInsert(
        "jobseeker_payment_transactions",
        {
          profile_id: caller.id,
          plan_id: JOBSEEKER_PLAN.id,
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
      console.warn("[jobseeker-create-order] pending transaction not recorded:", err.message);
    }

    return json(
      {
        order_id: order.id,
        amount: amountInPaise,
        currency: "INR",
        key_id: keyId,
        plan_id: JOBSEEKER_PLAN.id,
        base_price: price.base_price,
        discount_amount: price.discount_amount,
        final_amount: price.total_amount,
      },
      200,
    );
  } catch (err) {
    if (err instanceof PaymentError) {
      return json({ detail: err.message }, err.status);
    }
    console.error("[jobseeker-create-order] unhandled:", err);
    return json({ detail: "Could not create the payment order. Please try again." }, 500);
  }
};

export const config = { path: "/api/jobseeker-payments-create-order" };
