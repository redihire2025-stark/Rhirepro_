import bcrypt from "bcryptjs";
import crypto from "crypto";
import { enforceRateLimit, clientIp } from "../shared/rateLimit.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const limited = await enforceRateLimit([[`reset-send:ip:${clientIp(request)}`, 10, 3600]]);
  if (limited) return limited;

  const { email, user_type } = await request.json();
  const cleanEmail = (email || "").trim().toLowerCase();
  const limitedEmail = cleanEmail ? await enforceRateLimit([[`reset-send:email:${cleanEmail}`, 3, 900]]) : null;
  if (limitedEmail) return limitedEmail;


  if (!cleanEmail) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const senderEmail = process.env.RESEND_SENDER_EMAIL || process.env.VITE_RESEND_SENDER_EMAIL || "support@rhirepro.com";
  const senderName = process.env.RESEND_SENDER_NAME || process.env.VITE_RESEND_SENDER_NAME || "RhirePro";
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Database configuration missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Lookup user profile across all candidate locations
  let targetTable = user_type === "recruiter" ? "recruiter_profiles" : "profiles";
  let userRes = await fetch(`${supabaseUrl}/rest/v1/${targetTable}?email=ilike.${encodeURIComponent(cleanEmail)}&select=id`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  let userData = userRes.ok ? await userRes.json() : [];

  if (!userData || userData.length === 0) {
    const fallbackTable = targetTable === "profiles" ? "recruiter_profiles" : "profiles";
    userRes = await fetch(`${supabaseUrl}/rest/v1/${fallbackTable}?email=ilike.${encodeURIComponent(cleanEmail)}&select=id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const fallbackData = userRes.ok ? await userRes.json() : [];
    if (fallbackData && fallbackData.length > 0) {
      targetTable = fallbackTable;
      userData = fallbackData;
    }
  }

  if (!userData || userData.length === 0) {
    const pendingRes = await fetch(`${supabaseUrl}/rest/v1/pending_otps?email=ilike.${encodeURIComponent(cleanEmail)}&select=id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const pendingData = pendingRes.ok ? await pendingRes.json() : [];
    if (pendingData && pendingData.length > 0) {
      targetTable = "pending_otps";
      userData = pendingData;
    } else {
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const authData = authRes.ok ? await authRes.json() : null;
      const authUser = authData?.users?.find(u => (u.email || "").toLowerCase() === cleanEmail);
      if (authUser) {
        targetTable = "pending_otps";
        userData = [{ id: authUser.id }];
      }
    }
  }

  if (!userData || userData.length === 0) {
    return new Response(JSON.stringify({ error: "No account found with this email address." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = userData[0];
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const sha256Otp = crypto.createHash("sha256").update(generatedOtp).digest("hex");
  const otpHash = bcrypt.hashSync(sha256Otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (targetTable === "pending_otps") {
    await fetch(`${supabaseUrl}/rest/v1/pending_otps?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ email: cleanEmail, otp_code: otpHash, otp_expires_at: expiresAt }),
    });
  } else {
    await fetch(`${supabaseUrl}/rest/v1/${targetTable}?id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ otp_code: otpHash, otp_expires_at: expiresAt }),
    });
  }

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Resend email service key is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: `${senderName} <${senderEmail}>`,
      to: [cleanEmail],
      subject: `Your RhirePro Password Reset Code`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#FF2B2B;margin-bottom:8px;">RhirePro</h2>
          <p style="color:#333;">Hi <strong>${cleanEmail}</strong>,</p>
          <p style="color:#333;">Your password reset code is:</p>
          <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#FF2B2B;">${generatedOtp}</span>
          </div>
          <p style="color:#666;font-size:14px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color:#666;font-size:14px;">If you didn't request a password reset, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errorMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      errorMsg = parsed.message || parsed.error || errText;
    } catch {}
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/send-reset-otp" };
