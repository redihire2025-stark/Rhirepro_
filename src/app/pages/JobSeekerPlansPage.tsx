import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../lib/auth-context";
import {
  useJobseekerPlan,
  JOBSEEKER_PLAN,
  getJobseekerPlanPrice,
  validateJobseekerPromo,
  applyJobseekerPromo,
  JOBSEEKER_PROMO_CODES,
} from "../../lib/jobseekerPlan";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { CheckCircle, Crown, Loader2, Sparkles, Tag, XCircle } from "lucide-react";
import logoImage from "../../logo/logo.png";

export default function JobSeekerPlansPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isPremium, expiresAt, loading } = useJobseekerPlan();

  const basePrice = getJobseekerPlanPrice();
  const hasLaunchOffer = JOBSEEKER_PLAN.launchOfferActive;

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState("");

  const promo = appliedPromo ? validateJobseekerPromo(appliedPromo) : null;
  const price = promo ? applyJobseekerPromo(basePrice, promo) : basePrice;
  const discount = basePrice - price;

  const handleApplyPromo = () => {
    const found = validateJobseekerPromo(promoInput);
    if (!found) {
      setPromoError("Invalid or expired coupon code.");
      setAppliedPromo(null);
      return;
    }
    setPromoError("");
    setAppliedPromo(found.code);
  };

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/jobseeker/dashboard")}>
            <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
            <div className="text-2xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </div>
          <Button variant="outline" className="rounded-full border-gray-200" onClick={() => navigate("/jobseeker/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#3A1F1F] mb-2">RhirePro Premium</h1>
          <p className="text-[#8A8A8A]">Stand out to recruiters and get AI-powered career guidance.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#8A8A8A]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Checking your plan...
          </div>
        ) : isPremium ? (
          <div className="bg-gradient-to-r from-[#FF2B2B] to-[#c41e1e] rounded-2xl p-6 text-white mb-8 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5" />
              <span className="font-bold text-lg">You're on Premium</span>
            </div>
            <p className="text-white/90 text-sm">
              {daysLeft !== null
                ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining on your current plan.`
                : "Your plan is active."}
            </p>
            {expiresAt && (
              <p className="text-white/70 text-xs mt-1">
                Renews or expires on {new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        ) : null}

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-[#3A1F1F] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#FF2B2B]" /> {JOBSEEKER_PLAN.name}
              </h2>
              {hasLaunchOffer && !promo && (
                <span className="bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  Launch Offer · 50% off
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              {(hasLaunchOffer || promo) && (
                <span className="text-lg text-gray-400 line-through">₹{promo ? basePrice : JOBSEEKER_PLAN.basePrice}</span>
              )}
              <span className="text-4xl font-bold text-[#FF2B2B]">₹{price}</span>
              <span className="text-sm text-[#8A8A8A]">/ {JOBSEEKER_PLAN.period}</span>
            </div>
            {promo && (
              <p className="text-sm text-green-600 font-medium mt-1">Saved ₹{discount} with {promo.code}</p>
            )}
          </div>

          <div className="p-6">
            <ul className="space-y-3 mb-6">
              {JOBSEEKER_PLAN.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#3A1F1F]">{feature}</span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <Button disabled className="w-full bg-green-100 text-green-700 rounded-full py-6 cursor-not-allowed">
                <CheckCircle className="h-4 w-4 mr-2" /> Current Plan
              </Button>
            ) : (
              <Button
                onClick={() => navigate(`/jobseeker/payment${promo ? `?promo=${promo.code}` : ""}`)}
                disabled={!profile}
                className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6 text-base font-semibold shadow-md hover:shadow-lg"
              >
                Upgrade to Premium — ₹{price}
              </Button>
            )}
            <p className="text-xs text-[#8A8A8A] text-center mt-3">
              Valid for 30 days from purchase. Secure payment via Razorpay.
            </p>
          </div>
        </div>

        {/* Coupon code — a request to remove any of these is a one-line edit
            in JOBSEEKER_PROMO_CODES (src/lib/jobseekerPlan.ts) and the
            matching PROMO_CODES object in netlify/shared/jobseekerPayments.mjs. */}
        {!isPremium && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-[#FF2B2B]" />
              <span className="text-sm font-semibold text-[#3A1F1F]">Have a coupon code?</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setPromoError("");
                }}
                placeholder="Enter coupon code"
                className="rounded-full border-gray-200"
              />
              <Button
                onClick={handleApplyPromo}
                disabled={!promoInput.trim()}
                variant="outline"
                className="rounded-full border-gray-200 shrink-0"
              >
                Apply
              </Button>
            </div>
            {promoError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
                <XCircle className="h-3.5 w-3.5" /> {promoError}
              </p>
            )}
            {promo && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                <CheckCircle className="h-3.5 w-3.5" /> Coupon {promo.code} applied — {promo.label}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {JOBSEEKER_PROMO_CODES.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    setPromoInput(p.code);
                    setPromoError("");
                    setAppliedPromo(p.code);
                  }}
                  className="text-xs bg-[#F6F6F6] hover:bg-[#ECECF4] text-[#3A1F1F] px-3 py-1.5 rounded-full transition-colors"
                >
                  {p.code} · {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
