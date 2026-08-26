import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// Mirrors netlify/shared/jobseekerPayments.mjs — display-only here; the
// price actually charged is decided server-side in jobseeker-payments-
// create-order.mjs, never trusted from the client.
export const JOBSEEKER_PLAN = {
  id: "premium",
  name: "Premium",
  basePrice: 399,
  launchOfferActive: true,
  launchPrice: 199,
  period: "30 days",
  features: [
    "Get better visibility and improve your chances of standing out to recruiters.",
    "Get AI-powered insights into your profile, strengths, gaps, and areas for improvement.",
    "Discover certifications that match your career goals, skills, and target job roles.",
    "Identify the most valuable skills you should learn to become more job-ready and competitive.",
    "Access professionally designed resume templates to create a stronger, recruiter-friendly resume.",
  ],
};

export function getJobseekerPlanPrice(): number {
  return JOBSEEKER_PLAN.launchOfferActive ? JOBSEEKER_PLAN.launchPrice : JOBSEEKER_PLAN.basePrice;
}

// Mirrors netlify/shared/jobseekerPayments.mjs PROMO_CODES — client-side
// copy for instant preview only. To add or remove a coupon, edit both this
// array and the one in jobseekerPayments.mjs (the server copy is what
// actually decides the charge).
export interface JobseekerPromoCode {
  code: string;
  discountType: "percentage" | "fixed" | "set_price";
  discountValue: number;
  label: string;
}

export const JOBSEEKER_PROMO_CODES: JobseekerPromoCode[] = [
  { code: "RHIRE10", discountType: "percentage", discountValue: 10, label: "10% off" },
  { code: "RHIRE20", discountType: "percentage", discountValue: 20, label: "20% off" },
  { code: "HIRE50", discountType: "percentage", discountValue: 50, label: "50% off" },
  { code: "NEWJOIN", discountType: "fixed", discountValue: 100, label: "₹100 off" },
  { code: "RHIRE99", discountType: "set_price", discountValue: 1, label: "Pay only ₹1" },
];

export function validateJobseekerPromo(input: string): JobseekerPromoCode | null {
  const code = input.trim().toUpperCase();
  return JOBSEEKER_PROMO_CODES.find((p) => p.code === code) ?? null;
}

export function applyJobseekerPromo(price: number, promo: JobseekerPromoCode): number {
  if (promo.discountType === "percentage") {
    return Math.round(price * (1 - promo.discountValue / 100));
  }
  if (promo.discountType === "set_price") {
    return promo.discountValue;
  }
  return Math.max(1, price - promo.discountValue);
}

export interface JobseekerPlanStatus {
  isPremium: boolean;
  expiresAt: string | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * Canonical "does this job seeker have Premium" check. Always asks the
 * server (jobseeker-plan-status), which resolves identity from the current
 * session token — never trust a locally-cached flag for gating a paid
 * feature. Defaults to `isPremium: false` while loading and on any error, so
 * a slow network never accidentally unlocks premium content.
 */
export function useJobseekerPlan(): JobseekerPlanStatus {
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          if (active) {
            setIsPremium(false);
            setExpiresAt(null);
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/jobseeker-plan-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json().catch(() => null);
        if (!active) return;
        setIsPremium(!!payload?.isPremium);
        setExpiresAt(payload?.expiresAt ?? null);
      } catch {
        if (active) {
          setIsPremium(false);
          setExpiresAt(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [nonce]);

  return { isPremium, expiresAt, loading, refresh };
}
