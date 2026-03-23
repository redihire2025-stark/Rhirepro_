// Supabase Edge Function: verify-payment (PhonePe PG)
// Checks transaction status with PhonePe, then activates the plan in DB

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MERCHANT_ID            = Deno.env.get("PHONEPE_MERCHANT_ID")!;
const SALT_KEY               = Deno.env.get("PHONEPE_SALT_KEY")!;
const SALT_INDEX             = Deno.env.get("PHONEPE_SALT_INDEX") ?? "1";
const IS_UAT                 = Deno.env.get("PHONEPE_ENV") !== "PROD";
const SUPABASE_URL           = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BASE_URL = IS_UAT
  ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
  : "https://api.phonepe.com/apis/hermes";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      merchantTransactionId,
      recruiter_id,
      plan_id,
      amount,
      final_amount,
      discount_amount,
      promo_code,
      daily_job_posts,
    } = await req.json();

    // 1. Verify payment status with PhonePe
    const path      = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
    const checksum  = (await sha256hex(path + SALT_KEY)) + "###" + SALT_INDEX;

    const res  = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY":     checksum,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
    });

    const data = await res.json();

    if (!data?.success || data?.code !== "PAYMENT_SUCCESS") {
      return new Response(
        JSON.stringify({ success: false, message: data?.message ?? "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const txnRef = data?.data?.transactionId ?? merchantTransactionId;

    // 2. Activate plan in DB using service-role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { data: txn, error: txnErr } = await supabase
      .from("payment_transactions")
      .insert({
        recruiter_id,
        plan_id,
        amount,
        promo_code:      promo_code || null,
        discount_amount: discount_amount ?? 0,
        final_amount,
        status:          "success",
        payment_method:  "phonepe",
        transaction_ref: txnRef,
        completed_at:    new Date().toISOString(),
      })
      .select()
      .single();

    if (txnErr) throw txnErr;

    // Cancel existing active subscription
    await supabase
      .from("recruiter_subscriptions")
      .update({ status: "cancelled" })
      .eq("recruiter_id", recruiter_id)
      .eq("status", "active");

    // Create new 30-day subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: subErr } = await supabase
      .from("recruiter_subscriptions")
      .insert({
        recruiter_id,
        plan_id,
        status:          "active",
        started_at:      new Date().toISOString(),
        expires_at:      expiresAt.toISOString(),
        daily_job_posts: daily_job_posts ?? null,
        payment_id:      txn.id,
      });

    if (subErr) throw subErr;

    return new Response(
      JSON.stringify({ success: true, transaction_ref: txnRef }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
