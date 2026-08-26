import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { JOBSEEKER_PLAN, getJobseekerPlanPrice, validateJobseekerPromo, applyJobseekerPromo } from "../../lib/jobseekerPlan";
import { Button } from "../components/ui/button";
import {
  CheckCircle, XCircle, RefreshCw, ArrowLeft,
  ShieldCheck, Zap, Lock, CreditCard, TestTube2,
} from "lucide-react";
import logoImage from "../../logo/logo.png";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function JobSeekerPaymentGatewayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, refreshProfile } = useAuth();

  const promoCode = searchParams.get("promo") || "";
  const promo = promoCode ? validateJobseekerPromo(promoCode) : null;
  const basePrice = getJobseekerPlanPrice();
  const price = promo ? applyJobseekerPromo(basePrice, promo) : basePrice;
  const discount = basePrice - price;

  const [status, setStatus] = useState<"idle" | "loading" | "failed" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [txnRef, setTxnRef] = useState<string>("");

  const isLiveMode = useMemo(() => {
    const key = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TOksXioBHbSu5W";
    return key.startsWith("rzp_live");
  }, []);

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        navigate("/jobseeker/dashboard");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  const handlePay = useCallback(async () => {
    if (!profile?.id) {
      setErrorMsg("Please sign in to purchase Premium.");
      setStatus("failed");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Failed to load Razorpay SDK. Check your internet connection.");
      }

      // 1. Create the Razorpay order server-side. The server resolves who is
      // paying from this same access token — nothing about identity is sent
      // in the body here.
      const res = await fetch("/api/jobseeker-payments-create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ promo_code: promoCode || undefined }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Could not create Razorpay order");
      }

      const orderData = await res.json();

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TOksXioBHbSu5W",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Redihire",
        description: `${JOBSEEKER_PLAN.name} Plan Subscription`,
        image: logoImage,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            setStatus("loading");
            // 3. Verify the payment signature server-side, again resolving
            // the account from the same access token.
            const verifyRes = await fetch("/api/jobseeker-payments-verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const errJson = await verifyRes.json().catch(() => ({}));
              throw new Error(errJson.detail || "Payment verification failed");
            }

            await refreshProfile();
            setTxnRef(response.razorpay_payment_id);
            setStatus("success");
          } catch (err: any) {
            console.error("Payment verification error:", err);
            setErrorMsg(err.message || "Payment verification failed.");
            setStatus("failed");
          }
        },
        prefill: {
          name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
          email: profile.email || "",
          contact: profile.phone || "",
        },
        notes: {
          plan_id: JOBSEEKER_PLAN.id,
          profile_id: profile.id,
        },
        theme: {
          color: "#FF2B2B",
        },
        modal: {
          ondismiss: function () {
            setStatus("idle");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay init error:", err);
      setErrorMsg(err.message || "Failed to initialize Razorpay checkout");
      setStatus("failed");
    }
  }, [profile, refreshProfile]);

  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <TestTube2 className="h-3.5 w-3.5" /> {isLiveMode ? "Razorpay Live Mode" : "Razorpay Test Mode"}
          </div>
          <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Payment Successful!</h2>
          <p className="text-[#8A8A8A] mb-6">
            Your <span className="font-semibold text-[#3A1F1F]">Premium</span> plan is now active for the next 30 days.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 text-sm text-[#FF2B2B] bg-[#FF2B2B]/5 border border-[#FF2B2B]/10 rounded-2xl py-5 px-4 mb-6">
            <RefreshCw className="h-6 w-6 animate-spin text-[#FF2B2B]" />
            <span className="font-semibold text-[#3A1F1F]">Returning to your dashboard...</span>
          </div>
          {txnRef && (
            <p className="text-xs text-[#8A8A8A] bg-gray-50 rounded-lg px-3 py-2 font-mono break-all">
              Ref: {txnRef}
            </p>
          )}
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
          <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Payment Failed</h2>
          <p className="text-[#8A8A8A] mb-3">{errorMsg || "Could not complete payment. Please try again."}</p>
          <p className="text-sm text-[#8A8A8A] mb-8">
            If you were charged, contact{" "}
            <a href="mailto:redihire2025@gmail.com" className="text-[#FF2B2B] font-medium hover:underline">
              redihire2025@gmail.com
            </a>{" "}
            with your payment reference.
          </p>
          <div className="space-y-3">
            <Button onClick={() => setStatus("idle")}
              className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6">
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
            <Button onClick={() => navigate("/jobseeker/plans")} variant="outline"
              className="w-full border-gray-200 rounded-full py-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Plans
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
          <div className="bg-[#0C2340] px-6 py-5 flex items-center justify-between text-white">
            <div>
              <div className="text-xl font-bold flex items-center gap-2">
                Razorpay Checkout
              </div>
              <div className="text-blue-200 text-xs">UPI · Cards · Netbanking · Wallets</div>
            </div>
            <div className="bg-blue-900/60 border border-blue-400/30 text-blue-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-mono">
              <TestTube2 className="h-3.5 w-3.5 text-yellow-400" /> {isLiveMode ? "Live Mode" : "Test Mode"}
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
              <CreditCard className="h-8 w-8 text-[#FF2B2B] mb-2" />
              <p className="text-sm font-semibold text-[#3A1F1F]">Razorpay Secure Payment Gateway</p>
              <p className="text-xs text-[#8A8A8A] mt-0.5">
                {isLiveMode ? "Pay safely using UPI, Card, Netbanking, or Wallets" : "Pay safely using Test Cards, UPI, or Netbanking"}
              </p>
            </div>

            <div className="flex justify-between items-center bg-[#F6F6F6] rounded-xl px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-[#3A1F1F]">{JOBSEEKER_PLAN.name} · 30 days</p>
                {promo ? (
                  <p className="text-xs text-green-600 font-medium">Saved ₹{discount} ({promo.code})</p>
                ) : JOBSEEKER_PLAN.launchOfferActive && (
                  <p className="text-xs text-green-600 font-medium">Launch offer applied</p>
                )}
              </div>
              <div className="text-right">
                {(promo || JOBSEEKER_PLAN.launchOfferActive) && (
                  <p className="text-sm text-[#8A8A8A] line-through">₹{promo ? basePrice : JOBSEEKER_PLAN.basePrice}</p>
                )}
                <p className="text-2xl font-bold text-[#FF2B2B]">₹{price}</p>
              </div>
            </div>

            <Button
              onClick={handlePay}
              disabled={status === "loading"}
              className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-7 text-base font-semibold transition-all shadow-md hover:shadow-lg"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Opening Razorpay…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5" /> Pay ₹{price} via Razorpay
                </span>
              )}
            </Button>

            <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-[#8A8A8A]">
                <Lock className="h-3.5 w-3.5 text-gray-500" /> 256-bit SSL
              </div>
              <div className="flex items-center gap-1 text-xs text-[#8A8A8A]">
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> Razorpay Secured
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/jobseeker/plans")}
          className="w-full flex items-center justify-center gap-2 text-sm text-[#8A8A8A] hover:text-[#3A1F1F] transition-colors mt-4 py-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to plans
        </button>
      </div>
    </div>
  );
}
