import bcrypt from "bcryptjs";
import crypto from "crypto";

// Best-effort log for the Super Admin "API Monitoring" module.
async function logApiRequest(supabaseUrl, serviceKey, { function_name, status_code, duration_ms, error_message }) {
  if (!supabaseUrl || !serviceKey) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/api_request_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ function_name, status_code, duration_ms, error_message: error_message ?? null }),
    });
  } catch {
    // Logging is best-effort only.
  }
}

export default async (request) => {
  const requestStart = Date.now();

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { email, otp_hash, otp, user_type, purpose } = await request.json();
  const cleanEmail = (email || "").trim().toLowerCase();
  
  // Resolve incoming OTP hash (client SHA-256 pre-hash preferred, fallback to computing sha256 if plain otp sent)
  const incomingHash = (otp_hash || (otp ? crypto.createHash("sha256").update((otp || "").trim()).digest("hex") : "")).trim();

  if (!cleanEmail || !incomingHash) {
    return new Response(JSON.stringify({ error: "Email and OTP verification hash are required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Database service key is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isSignup = purpose === "signup";

  try {
    if (isSignup) {
      // Query pending_otps table
      const res = await fetch(`${supabaseUrl}/rest/v1/pending_otps?email=ilike.${encodeURIComponent(cleanEmail)}&select=otp_code,otp_expires_at`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const data = res.ok ? await res.json() : [];

      if (!data || data.length === 0 || !data[0].otp_code) {
        await logApiRequest(supabaseUrl, serviceKey, {
          function_name: "/api/verify-otp", status_code: 400, duration_ms: Date.now() - requestStart, error_message: "No OTP found",
        });
        return new Response(JSON.stringify({ error: "No OTP found. Please request a new one." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const record = data[0];
      if (new Date(record.otp_expires_at) < new Date()) {
        await logApiRequest(supabaseUrl, serviceKey, {
          function_name: "/api/verify-otp", status_code: 400, duration_ms: Date.now() - requestStart, error_message: "OTP expired",
        });
        return new Response(JSON.stringify({ error: "OTP has expired. Please request a new one." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isValid = bcrypt.compareSync(incomingHash, record.otp_code);
      if (!isValid) {
        await logApiRequest(supabaseUrl, serviceKey, {
          function_name: "/api/verify-otp", status_code: 400, duration_ms: Date.now() - requestStart, error_message: "Invalid OTP",
        });
        return new Response(JSON.stringify({ error: "Invalid OTP. Please try again." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Delete from pending_otps on success
      await fetch(`${supabaseUrl}/rest/v1/pending_otps?email=ilike.${encodeURIComponent(cleanEmail)}`, {
        method: "DELETE",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });

      await logApiRequest(supabaseUrl, serviceKey, {
        function_name: "/api/verify-otp", status_code: 200, duration_ms: Date.now() - requestStart,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Login or password reset OTP verification
      let targetTable = user_type === "recruiter" ? "recruiter_profiles" : "profiles";
      let userRes = await fetch(`${supabaseUrl}/rest/v1/${targetTable}?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,otp_code,otp_expires_at`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      let userData = userRes.ok ? await userRes.json() : [];

      if ((!userData || userData.length === 0 || !userData[0].otp_code) && !user_type) {
        targetTable = targetTable === "profiles" ? "recruiter_profiles" : "profiles";
        userRes = await fetch(`${supabaseUrl}/rest/v1/${targetTable}?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,otp_code,otp_expires_at`, {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        });
        userData = userRes.ok ? await userRes.json() : [];
      }

      if (!userData || userData.length === 0 || !userData[0].otp_code) {
        await logApiRequest(supabaseUrl, serviceKey, {
          function_name: "/api/verify-otp", status_code: 400, duration_ms: Date.now() - requestStart, error_message: "No OTP found",
        });
        return new Response(JSON.stringify({ error: "No OTP found. Please request a new one." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const user = userData[0];
      if (new Date(user.otp_expires_at) < new Date()) {
        await logApiRequest(supabaseUrl, serviceKey, {
          function_name: "/api/verify-otp", status_code: 400, duration_ms: Date.now() - requestStart, error_message: "OTP expired",
        });
        return new Response(JSON.stringify({ error: "OTP has expired. Please request a new one." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isValid = bcrypt.compareSync(incomingHash, user.otp_code);
      if (!isValid) {
        await logApiRequest(supabaseUrl, serviceKey, {
          function_name: "/api/verify-otp", status_code: 400, duration_ms: Date.now() - requestStart, error_message: "Invalid OTP",
        });
        return new Response(JSON.stringify({ error: "Invalid OTP. Please try again." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Clear OTP on successful verification
      await fetch(`${supabaseUrl}/rest/v1/${targetTable}?id=eq.${user.id}`, {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp_code: null, otp_expires_at: null }),
      });

      await logApiRequest(supabaseUrl, serviceKey, {
        function_name: "/api/verify-otp", status_code: 200, duration_ms: Date.now() - requestStart,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    await logApiRequest(supabaseUrl, serviceKey, {
      function_name: "/api/verify-otp", status_code: 500, duration_ms: Date.now() - requestStart, error_message: err.message,
    });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/verify-otp" };
