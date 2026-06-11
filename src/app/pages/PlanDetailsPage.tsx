import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { PLANS, PROMO_CODES, validatePromo, getPlanById, getPlanPriceBreakdown } from "../../lib/plans";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  CheckCircle2, Tag, ArrowLeft, ArrowRight,
  Shield, Zap, Star, Clock,
} from "lucide-react";
import logoImage from "../../logo/logo.png";

export default function PlanDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const planId = searchParams.get("plan") || "standard";
  const plan = getPlanById(planId) ?? PLANS[1];

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<typeof PROMO_CODES[0] | null>(null);
  const [promoSuccess, setPromoSuccess] = useState("");

  const priceBreakdown = getPlanPriceBreakdown(plan, appliedPromo);
  const { basePrice, discountAmount, gstAmount, totalAmount } = priceBreakdown;

  const handleApplyPromo = () => {
    const found = validatePromo(promoInput);
    if (!found) {
      setPromoError("Invalid promo code. Try RHIRE10, RHIRE20, HIRE50, or NEWJOIN.");
      setAppliedPromo(null);
      setPromoSuccess("");
      return;
    }
    setAppliedPromo(found);
    setPromoError("");
    setPromoSuccess(`Code applied! You save ${found.label}`);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
    setPromoSuccess("");
  };

  const handlePurchase = () => {
    const params = new URLSearchParams({
      plan: plan.id,
      amount: String(basePrice),
      final: String(totalAmount),
      discount: String(discountAmount),
      promo: appliedPromo?.code ?? "",
    });
    navigate(`/recruiter/payment?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
            <div className="text-2xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-[#8A8A8A] hover:text-[#3A1F1F] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#8A8A8A] mb-8">
          <span className="cursor-pointer hover:text-[#FF2B2B]" onClick={() => navigate("/")}>Home</span>
          <span>/</span>
          <span className="cursor-pointer hover:text-[#FF2B2B]" onClick={() => navigate(-1)}>Plans</span>
          <span>/</span>
          <span className="text-[#3A1F1F] font-medium">{plan.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* ── Left: Plan Details ── */}
          <div className="space-y-6">
            <div>
              {plan.popular && (
                <span className="inline-flex items-center gap-1 bg-[#FF2B2B] text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">
                  <Star className="h-3 w-3" /> MOST POPULAR
                </span>
              )}
              <h1 className="text-3xl font-bold text-[#3A1F1F]">{plan.name}</h1>
              <p className="text-[#8A8A8A] mt-1">Everything you need to hire smarter, faster.</p>
            </div>

            {/* Plan card */}
            <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-[#FF2B2B]">
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-bold text-[#3A1F1F]">₹{basePrice}</span>
                <span className="text-[#8A8A8A]">/{plan.period}</span>
              </div>
              <p className="text-xs text-[#8A8A8A] mb-3">+ 18% GST</p>
              {plan.dailyJobPosts !== null ? (
                <p className="text-sm text-[#FF2B2B] font-medium mb-5">
                  Up to {plan.dailyJobPosts} job posts per day
                </p>
              ) : (
                <p className="text-sm text-[#FF2B2B] font-medium mb-5">Unlimited daily job posts</p>
              )}
              <ul className="space-y-3">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#FF2B2B] flex-shrink-0" />
                    <span className="text-[#3A1F1F]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Compare plans link */}
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-[#FF2B2B] hover:underline"
            >
              ← Compare all plans
            </button>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "Secure Payment" },
                { icon: Zap, label: "Instant Activation" },
                { icon: Clock, label: "Cancel Anytime" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 bg-white rounded-xl p-3 shadow-sm text-center">
                  <Icon className="h-5 w-5 text-[#FF2B2B]" />
                  <span className="text-xs text-[#8A8A8A]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-[#3A1F1F] mb-6">Order Summary</h2>

            {/* Line items */}
            <div className="space-y-3 pb-4 mb-4 border-b border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-[#8A8A8A]">Plan Price</span>
                <span className="text-[#3A1F1F] font-medium">₹{basePrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8A8A8A]">GST (18%)</span>
                <span className="text-[#3A1F1F] font-medium">₹{gstAmount}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> Promo ({appliedPromo?.code})
                  </span>
                  <span className="text-green-600 font-medium">−₹{discountAmount}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-baseline mb-6">
              <span className="font-semibold text-[#3A1F1F]">Total Due</span>
              <div className="text-right">
                {discountAmount > 0 && (
                  <p className="text-sm text-[#8A8A8A] line-through">₹{basePrice + gstAmount}</p>
                )}
                <p className="text-3xl font-bold text-[#FF2B2B]">₹{totalAmount}</p>
                <p className="text-xs text-[#8A8A8A]">Billed monthly</p>
              </div>
            </div>

            {/* Promo Code */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#3A1F1F] mb-2">
                Promo Code
              </label>
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-700">{appliedPromo.code}</p>
                      <p className="text-xs text-green-600">{promoSuccess}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    className="text-xs text-red-500 hover:underline ml-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={promoInput}
                    onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    placeholder="Enter promo code"
                    className="rounded-xl border-gray-200 uppercase font-mono tracking-wider"
                    onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                  />
                  <Button
                    onClick={handleApplyPromo}
                    variant="outline"
                    className="border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-xl whitespace-nowrap"
                  >
                    Apply
                  </Button>
                </div>
              )}
              {promoError && (
                <p className="text-xs text-red-500 mt-1.5">{promoError}</p>
              )}
              {!appliedPromo && !promoError && (
                <p className="text-xs text-[#8A8A8A] mt-1.5">
                  Try: <span className="font-mono text-[#3A1F1F] cursor-pointer hover:text-[#FF2B2B]" onClick={() => setPromoInput("RHIRE10")}>RHIRE10</span>
                  {", "}
                  <span className="font-mono text-[#3A1F1F] cursor-pointer hover:text-[#FF2B2B]" onClick={() => setPromoInput("RHIRE20")}>RHIRE20</span>
                  {" "}or{" "}
                  <span className="font-mono text-[#3A1F1F] cursor-pointer hover:text-[#FF2B2B]" onClick={() => setPromoInput("NEWJOIN")}>NEWJOIN</span>
                </p>
              )}
            </div>

            <Button
              onClick={handlePurchase}
              className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6 text-base font-semibold"
            >
              Proceed to Payment <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-[#8A8A8A] mt-3">
              Secure checkout · 30-day access · Cancel anytime
            </p>

            {/* Payment methods */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-3">
              <span className="text-xs text-[#8A8A8A]">Pay via</span>
              <div className="bg-[#5F259F] text-white text-xs font-bold px-3 py-1 rounded-md">PhonePe</div>
              <span className="text-xs text-[#8A8A8A]">UPI / QR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
