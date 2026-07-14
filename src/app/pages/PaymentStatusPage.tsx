// PhonePe callback page — reads sessionStorage, verifies payment, activates plan
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { calculateGst, getPlanById } from "../../lib/plans";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, RefreshCw, Home, Loader2 } from "lucide-react";
import logoImage from "../../logo/logo.png";
import { useAuth } from "../../lib/auth-context";

type Status = "verifying" | "success" | "failed";

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<Status>("verifying");
  const [txnRef, setTxnRef] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [receipt, setReceipt] = useState<{
    planName: string;
    basePrice: number;
    gstAmount: number;
    discountAmount: number;
    totalPaid: number;
  } | null>(null);
  const verified = useRef(false);

  useEffect(() => {
    if (verified.current) return;
    verified.current = true;

    async function verify() {
      const raw = sessionStorage.getItem("pp_txn");
      if (!raw) {
        setErrorMsg("No transaction context found. Please try again.");
        setStatus("failed");
        return;
      }

      let ctx: {
        merchantTransactionId: string;
        recruiter_id: string;
        plan_id: string;
        amount: number;
        final_amount: number;
        discount_amount: number;
        promo_code: string;
        daily_job_posts: number | null;
      };

      try {
        ctx = JSON.parse(raw);
        const plan = getPlanById(ctx.plan_id);
        const basePrice = plan?.price ?? ctx.amount;
        setReceipt({
          planName: plan?.name ?? ctx.plan_id,
          basePrice,
          gstAmount: calculateGst(basePrice),
          discountAmount: ctx.discount_amount ?? 0,
          totalPaid: ctx.final_amount,
        });
      } catch {
        setErrorMsg("Invalid transaction data. Please try again.");
        setStatus("failed");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: ctx,
        });

        if (error || !data?.success) {
          throw new Error(data?.message ?? error?.message ?? "Verification failed");
        }

        // Make user an admin in the database
        const { error: profileErr } = await supabase
          .from("recruiter_profiles")
          .update({
            org_role: "admin",
            max_seats: 10,
            is_org_admin: true,
          })
          .eq("id", ctx.recruiter_id);

        if (profileErr) throw profileErr;

        // Refresh profile context
        await refreshProfile();

        setTxnRef(data.transaction_ref ?? ctx.merchantTransactionId);
        sessionStorage.removeItem("pp_txn");
        setStatus("success");
      } catch (err) {
        const msg = (err as Error).message ?? "Could not verify payment";
        setErrorMsg(msg);
        setStatus("failed");
      }
    }

    verify();
  }, []);

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        navigate("/recruiter/admin");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/")}>
          <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
          <div className="text-2xl font-bold text-[#3A1F1F]">
            Rhire<span className="text-[#FF2B2B]">Pro</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">

          {/* Verifying */}
          {status === "verifying" && (
            <>
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Loader2 className="h-10 w-10 text-[#5F259F] animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Verifying Payment</h2>
              <p className="text-[#8A8A8A]">Please wait while we confirm your payment with PhonePe…</p>
            </>
          )}

          {/* Success */}
          {status === "success" && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Payment Successful!</h2>
              <p className="text-[#8A8A8A] mb-2">Your plan has been activated.</p>
              {receipt && (
                <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-left text-sm">
                  <div className="mb-2 flex justify-between">
                    <span className="text-[#8A8A8A]">Plan</span>
                    <span className="font-medium text-[#3A1F1F]">{receipt.planName}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold">
                    <span className="text-[#3A1F1F]">Total Paid</span>
                    <span className="text-[#FF2B2B]">₹{receipt.totalPaid}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center justify-center gap-3 text-sm text-[#FF2B2B] bg-[#FF2B2B]/5 border border-[#FF2B2B]/10 rounded-2xl py-5 px-4 mb-6">
                <RefreshCw className="h-6 w-6 animate-spin text-[#FF2B2B]" />
                <span className="font-semibold text-[#3A1F1F]">Navigating to Team Admin Panel...</span>
              </div>
              {txnRef && (
                <p className="text-xs text-[#8A8A8A] bg-gray-50 rounded-lg px-3 py-2 font-mono break-all">
                  Ref: {txnRef}
                </p>
              )}
            </>
          )}

          {/* Failed */}
          {status === "failed" && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <XCircle className="h-10 w-10 text-[#FF2B2B]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3A1F1F] mb-2">Payment Failed</h2>
              <p className="text-[#8A8A8A] mb-6">
                {errorMsg || "Something went wrong. Your account has not been charged."}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate(-1)}
                  className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full py-6"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                </Button>
                <Button
                  onClick={() => navigate("/recruiter/dashboard")}
                  variant="outline"
                  className="w-full border-gray-200 rounded-full py-6"
                >
                  <Home className="mr-2 h-4 w-4" /> Go to Dashboard
                </Button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
