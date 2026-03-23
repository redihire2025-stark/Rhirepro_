import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { getPlanById } from "../../lib/plans";
import { Button } from "../components/ui/button";
import {
  CheckCircle, XCircle, RefreshCw, ArrowLeft,
  ShieldCheck, Smartphone, Zap, Lock, TestTube2,
} from "lucide-react";
import logoImage from "../../logo/logo.png";
import phonePeQR from "../../logo/qr.jpg";

// ── Main Payment Page — redirects to PhonePe ──────────────────────────────────
export default function PaymentGatewayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { recruiterProfile } = useAuth();

  const planId      = searchParams.get("plan")     ?? "standard";
  const amount      = Number(searchParams.get("amount"))   || 0;
  const finalAmount = Number(searchParams.get("final"))    || amount;
  const discount    = Number(searchParams.get("discount")) || 0;
  const promoCode   = searchParams.get("promo")    ?? "";

  const plan = getPlanById(planId);

  const [status, setStatus] = useState<"idle" | "loading" | "failed" | "success">("idle");
  const [txnRef, setTxnRef] = useState<string>("");

  const handlePay = useCallback(async () => {
    if (!recruiterProfile?.id) return;
    setStatus("loading");

    // ── TEST MODE: RHIRE20 bypasses PhonePe and activates plan directly ──────
    if (promoCode.toUpperCase() === "RHIRE20") {
      try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const testRef = `TEST_${recruiterProfile.id}_${Date.now()}`;

        // Insert payment transaction
        const { data: txn, error: txnErr } = await supabase
          .from("payment_transactions")
          .insert({
            recruiter_id:    recruiterProfile.id,
            plan_id:         planId,
            amount,
            promo_code:      promoCode,
            discount_amount: discount,
            final_amount:    finalAmount,
            status:          "success",
            payment_method:  "test",
            transaction_ref: testRef,
            completed_at:    now.toISOString(),
          })
          .select("id")
          .single();

        if (txnErr) throw txnErr;

        // Cancel any existing active subscription
        await supabase
          .from("recruiter_subscriptions")
          .update({ status: "cancelled" })
          .eq("recruiter_id", recruiterProfile.id)
          .eq("status", "active");

        // Activate new subscription
        const { error: subErr } = await supabase
          .from("recruiter_subscriptions")
          .insert({
            recruiter_id:    recruiterProfile.id,
            plan_id:         planId,
            status:          "active",
            started_at:      now.toISOString(),
            expires_at:      expiresAt.toISOString(),
            daily_job_posts: plan?.dailyJobPosts ?? null,
            payment_id:      txn.id,
          });

        if (subErr) throw subErr;

        setTxnRef(testRef);
        setStatus("success");
      } catch (err) {
        console.error("Test activation error:", err);
        setStatus("failed");
      }
      return;
    }

    // ── LIVE MODE: redirect to PhonePe ────────────────────────────────────────
    try {
      const merchantTransactionId = `TXN_${recruiterProfile.id}_${Date.now()}`;

      sessionStorage.setItem("pp_txn", JSON.stringify({
        merchantTransactionId,
        recruiter_id:    recruiterProfile.id,
        plan_id:         planId,
        amount,
        final_amount:    finalAmount,
        discount_amount: discount,
        promo_code:      promoCode,
        daily_job_posts: plan?.dailyJobPosts ?? null,
      }));

      const redirectUrl = `${window.location.origin}/recruiter/payment/status`;

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          amount: finalAmount,
          merchantTransactionId,
          redirectUrl,
          recruiter_id: recruiterProfile.id,
        },
      });

      if (error || !data?.redirectUrl) {
        throw new Error(error?.message ?? "Could not initiate PhonePe payment");
      }

      window.location.href = data.redirectUrl;
    } catch (err) {
      console.error("PhonePe init error:", err);
      setStatus("failed");
    }
  }, [recruiterProfile, planId, amount, finalAmount, discount, promoCode, plan]);

  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <div className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <TestTube2 className="h-3.5 w-3.5" /> Test Mode — RHIRE20
          </div>
          <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Plan Activated!</h2>
          <p className="text-[#8A8A8A] mb-2">Your <span className="font-semibold text-[#3A1F1F]">{plan?.name}</span> plan is now active for 30 days.</p>
          {txnRef && (
            <p className="text-xs text-[#8A8A8A] bg-gray-50 rounded-lg px-3 py-2 mb-6 font-mono break-all">
              Ref: {txnRef}
            </p>
          )}
          <Button
            onClick={() => navigate("/recruiter/dashboard/plans")}
            className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6"
          >
            Go to My Plans
          </Button>
          <button
            onClick={() => navigate("/recruiter/dashboard")}
            className="w-full mt-3 text-sm text-[#8A8A8A] hover:text-[#3A1F1F] transition-colors py-2"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle className="h-10 w-10 text-[#FF2B2B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Could Not Connect</h2>
          <p className="text-[#8A8A8A] mb-8">Failed to reach PhonePe. Please try again.</p>
          <div className="space-y-3">
            <Button onClick={() => setStatus("idle")}
              className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6">
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline"
              className="w-full border-gray-200 rounded-full py-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> Change Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
            <div className="text-2xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8A8A8A]">
            <ShieldCheck className="h-4 w-4 text-green-500" /> Secure Payment
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* PhonePe header */}
          <div className="bg-[#5F259F] px-6 py-5 flex items-center justify-between text-white">
            <div>
              <div className="text-xl font-bold">PhonePe Business</div>
              <div className="text-purple-200 text-xs">Secure UPI Payment</div>
            </div>
            <Smartphone className="h-7 w-7 text-white/80" />
          </div>

          <div className="p-6 space-y-5">
            {/* QR */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-[#8A8A8A] mb-3">Or scan to pay directly via any UPI app</p>
              <div className="border-2 border-gray-100 rounded-xl overflow-hidden">
                <img src={phonePeQR} alt="PhonePe QR" className="w-44 h-44 object-contain" />
              </div>
            </div>

            {/* Order info */}
            <div className="flex justify-between items-center bg-[#F6F6F6] rounded-xl px-4 py-3">
              <div>
                <p className="text-xs text-[#8A8A8A]">{plan?.name} · 30 days</p>
                {discount > 0 && (
                  <p className="text-xs text-green-600 font-medium">Saved ₹{discount}</p>
                )}
              </div>
              <div className="text-right">
                {discount > 0 && (
                  <p className="text-sm text-[#8A8A8A] line-through">₹{amount}</p>
                )}
                <p className="text-2xl font-bold text-[#FF2B2B]">₹{finalAmount}</p>
              </div>
            </div>

            {/* Pay button */}
            <Button
              onClick={handlePay}
              disabled={status === "loading"}
              className="w-full bg-[#5F259F] hover:bg-[#4e1e82] text-white rounded-full py-7 text-base font-semibold"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redirecting to PhonePe…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5" /> Pay ₹{finalAmount} via PhonePe
                </span>
              )}
            </Button>

            <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-[#8A8A8A]">
                <Lock className="h-3.5 w-3.5" /> 256-bit SSL
              </div>
              <div className="flex items-center gap-1 text-xs text-[#8A8A8A]">
                <ShieldCheck className="h-3.5 w-3.5" /> PhonePe secured
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="w-full flex items-center justify-center gap-2 text-sm text-[#8A8A8A] hover:text-[#3A1F1F] transition-colors mt-4 py-2"
        >
          <ArrowLeft className="h-4 w-4" /> Change plan or apply promo
        </button>
      </div>
    </div>
  );
}
