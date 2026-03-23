// ─── Shared Plan Constants & Helpers ─────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  price: number;           // in rupees
  period: string;
  dailyJobPosts: number | null; // null = unlimited
  features: string[];
  popular: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic Plan",
    price: 320,
    period: "month",
    dailyJobPosts: 10,
    features: [
      "10 daily job posts",
      "Basic Analytics",
      "Email Support",
      "1 Team Member",
    ],
    popular: false,
  },
  {
    id: "standard",
    name: "Standard Plan",
    price: 950,
    period: "month",
    dailyJobPosts: 50,
    features: [
      "50 daily job posts",
      "100+ job templates",
      "Advanced Analytics",
      "Priority Support",
      "5 Team Members",
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium Plan",
    price: 2200,
    period: "month",
    dailyJobPosts: null,
    features: [
      "Unlimited job posts",
      "Advanced hiring tools",
      "Dedicated Account Manager",
      "24/7 Premium Support",
      "Unlimited Team Members",
    ],
    popular: false,
  },
];

export const FREE_DAILY_POST_LIMIT = 1;

export interface ClientPromoCode {
  code: string;
  discountType: "percentage" | "fixed" | "set_price";
  discountValue: number; // % for percentage, rupees for fixed, final price for set_price
  label: string;
}

// Client-side promo codes for instant validation (mirrors DB seed data)
export const PROMO_CODES: ClientPromoCode[] = [
  { code: "RHIRE20", discountType: "percentage", discountValue: 20,  label: "20% off" },
  { code: "HIRE50",  discountType: "percentage", discountValue: 50,  label: "50% off" },
  { code: "NEWJOIN", discountType: "fixed",      discountValue: 100, label: "₹100 off" },
  { code: "RHIRE99", discountType: "set_price",  discountValue: 1,   label: "Pay only ₹1" },
];

export function validatePromo(input: string): ClientPromoCode | null {
  const code = input.trim().toUpperCase();
  return PROMO_CODES.find(p => p.code === code) ?? null;
}

export function applyPromo(price: number, promo: ClientPromoCode): number {
  if (promo.discountType === "percentage") {
    return Math.round(price * (1 - promo.discountValue / 100));
  }
  if (promo.discountType === "set_price") {
    return promo.discountValue; // set final price directly
  }
  return Math.max(1, price - promo.discountValue);
}

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find(p => p.id === id);
}
