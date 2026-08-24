import { describe, it, expect } from "vitest";
import crypto from "crypto";
// @ts-expect-error — plain .mjs module shared with the Netlify Functions
import { calculatePlanPrice, PLANS, PROMO_CODES } from "../../netlify/shared/payments.mjs";

/**
 * These lock the pricing the plan cards charge today (₹1180 / ₹1180 / ₹3540).
 * If someone "simplifies" the GST or discount arithmetic, customers get billed
 * the wrong amount, so pin it.
 */
describe("calculatePlanPrice — ported from the Python service", () => {
  it("charges base + 18% GST when no promo is applied", () => {
    expect(calculatePlanPrice("basic")).toMatchObject({ base_price: 1000, gst_amount: 180, total_amount: 1180 });
    expect(calculatePlanPrice("standard")).toMatchObject({ base_price: 1000, gst_amount: 180, total_amount: 1180 });
    expect(calculatePlanPrice("premium")).toMatchObject({ base_price: 3000, gst_amount: 540, total_amount: 3540 });
  });

  it("applies percentage discounts to the base only", () => {
    expect(calculatePlanPrice("basic", "RHIRE10")).toMatchObject({ discount_amount: 100, total_amount: 1080 });
    expect(calculatePlanPrice("standard", "HIRE50")).toMatchObject({ discount_amount: 500, total_amount: 680 });
  });

  it("applies fixed discounts", () => {
    expect(calculatePlanPrice("basic", "NEWJOIN")).toMatchObject({ discount_amount: 100, total_amount: 1080 });
  });

  it("charges GST on the ORIGINAL base price, not the discounted price", () => {
    // 10% off ₹1000 is ₹900, but GST stays ₹180 (18% of 1000), not ₹162.
    expect(calculatePlanPrice("basic", "RHIRE10").gst_amount).toBe(180);
  });

  it("skips GST entirely for set_price promos", () => {
    expect(calculatePlanPrice("basic", "RHIRE99")).toMatchObject({ gst_amount: 0, total_amount: 1 });
    expect(calculatePlanPrice("premium", "RHIRE99")).toMatchObject({ gst_amount: 0, total_amount: 1 });
  });

  it("ignores an unrecognised promo instead of failing the purchase", () => {
    expect(calculatePlanPrice("basic", "NOT_A_CODE").total_amount).toBe(1180);
  });

  it("is case-insensitive for plan id and promo code", () => {
    expect(calculatePlanPrice("BASIC", "rhire10").total_amount).toBe(1080);
  });

  it("rejects an unknown plan", () => {
    expect(() => calculatePlanPrice("enterprise")).toThrow(/Invalid plan ID/);
  });

  it("exposes the three plans and five promo codes the Python defined", () => {
    expect(Object.keys(PLANS).sort()).toEqual(["basic", "premium", "standard"]);
    expect(Object.keys(PROMO_CODES).sort()).toEqual(["HIRE50", "NEWJOIN", "RHIRE10", "RHIRE20", "RHIRE99"]);
  });
});

describe("Razorpay signature verification", () => {
  // Razorpay signs "<order_id>|<payment_id>" with HMAC-SHA256 keyed on the secret.
  const sign = (secret: string, orderId: string, paymentId: string) =>
    crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

  it("produces a 64-char hex digest over order|payment", () => {
    const sig = sign("test_secret", "order_ABC", "pay_XYZ");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(sig).toBe(sign("test_secret", "order_ABC", "pay_XYZ"));
  });

  it("changes if any part of the payload or the secret changes", () => {
    const base = sign("test_secret", "order_ABC", "pay_XYZ");
    expect(sign("other_secret", "order_ABC", "pay_XYZ")).not.toBe(base);
    expect(sign("test_secret", "order_DEF", "pay_XYZ")).not.toBe(base);
    expect(sign("test_secret", "order_ABC", "pay_QQQ")).not.toBe(base);
  });
});
