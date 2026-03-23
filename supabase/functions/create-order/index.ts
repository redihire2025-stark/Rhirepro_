// Supabase Edge Function: create-order (PhonePe PG)
// Generates checksum & initiates payment — salt key never exposed to frontend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MERCHANT_ID    = Deno.env.get("PHONEPE_MERCHANT_ID")!;
const SALT_KEY       = Deno.env.get("PHONEPE_SALT_KEY")!;
const SALT_INDEX     = Deno.env.get("PHONEPE_SALT_INDEX") ?? "1";
const IS_UAT         = Deno.env.get("PHONEPE_ENV") !== "PROD";

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
    const { amount, merchantTransactionId, redirectUrl, recruiter_id } = await req.json();

    const payload = {
      merchantId:            MERCHANT_ID,
      merchantTransactionId,
      merchantUserId:        `USER_${recruiter_id}`,
      amount:                amount * 100, // paise
      redirectUrl,
      redirectMode:          "REDIRECT",
      paymentInstrument:     { type: "PAY_PAGE" },
    };

    const base64Payload = btoa(JSON.stringify(payload));
    const checksumStr   = base64Payload + "/pg/v1/pay" + SALT_KEY;
    const checksum      = (await sha256hex(checksumStr)) + "###" + SALT_INDEX;

    const res = await fetch(`${BASE_URL}/pg/v1/pay`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY":     checksum,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const data = await res.json();

    if (!data?.success) {
      throw new Error(data?.message ?? "PhonePe order creation failed");
    }

    const redirectPayUrl = data.data?.instrumentResponse?.redirectInfo?.url;
    return new Response(JSON.stringify({ redirectUrl: redirectPayUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
