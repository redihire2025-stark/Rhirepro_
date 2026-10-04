import bcrypt from "bcryptjs";
import crypto from "crypto";
import { enforceRateLimit, clientIp } from "../shared/rateLimit.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const limited = await enforceRateLimit([[`reset-pw:ip:${clientIp(request)}`, 20, 900]]);
  if (limited) return limited;

  const { email, otp_hash, otp, new_password, user_type } = await request.json();
  const cleanEmail = (email || "").trim().toLowerCase();
  const limitedEmail = cleanEmail ? await enforceRateLimit([[`reset-pw:email:${cleanEmail}`, 5, 900]]) : null;
  if (limitedEmail) return limitedEmail;

  const incomingHash = (otp_hash || (otp ? crypto.createHash("sha256").update((otp || "").trim()).digest("hex") : "")).trim();

  if (!cleanEmail || !incomingHash || !new_password) {
    return new Response(JSON.stringify({ error: "Missing required fields." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Database configuration missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let targetTable = user_type === "recruiter" ? "recruiter_profiles" : "profiles";
  let userRes = await fetch(`${supabaseUrl}/rest/v1/${targetTable}?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,otp_code,otp_expires_at`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  let userData = userRes.ok ? await userRes.json() : [];

  if (!userData || userData.length === 0 || !userData[0].otp_code) {
    const fallbackTable = targetTable === "profiles" ? "recruiter_profiles" : "profiles";
    userRes = await fetch(`${supabaseUrl}/rest/v1/${fallbackTable}?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,otp_code,otp_expires_at`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const fallbackData = userRes.ok ? await userRes.json() : [];
    if (fallbackData && fallbackData.length > 0 && fallbackData[0].otp_code) {
      targetTable = fallbackTable;
      userData = fallbackData;
    }
  }

  if (!userData || userData.length === 0 || !userData[0].otp_code) {
    userRes = await fetch(`${supabaseUrl}/rest/v1/pending_otps?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,otp_code,otp_expires_at`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const pendingData = userRes.ok ? await userRes.json() : [];
    if (pendingData && pendingData.length > 0 && pendingData[0].otp_code) {
      targetTable = "pending_otps";
      userData = pendingData;
    }
  }

  if (!userData || userData.length === 0 || !userData[0].otp_code) {
    return new Response(JSON.stringify({ error: "No OTP found. Please request a new one." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = userData[0];
  if (new Date(user.otp_expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "OTP has expired. Please request a new one." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let isValid = false;
  if (user.otp_code.startsWith("$2b$") || user.otp_code.startsWith("$2a$")) {
    isValid = bcrypt.compareSync(incomingHash, user.otp_code);
    if (!isValid && otp) {
      const directSha = crypto.createHash("sha256").update(otp.trim()).digest("hex");
      isValid = bcrypt.compareSync(directSha, user.otp_code);
    }
  } else {
    isValid = (user.otp_code === incomingHash) || (user.otp_code === (otp || "").trim());
  }

  if (!isValid) {
    return new Response(JSON.stringify({ error: "Invalid OTP. Please try again." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Find user Auth ID if user.id was from pending_otps
  let authUserId = user.id;
  if (targetTable === "pending_otps") {
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const listData = listRes.ok ? await listRes.json() : null;
    const authUser = listData?.users?.find(u => (u.email || "").toLowerCase() === cleanEmail);
    if (authUser) authUserId = authUser.id;
  }

  // Update password in Supabase Auth via Admin REST API
  let updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
    method: "PUT",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: new_password }),
  });

  if (!updateRes.ok) {
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: authUserId,
        email: cleanEmail,
        password: new_password,
        email_confirm: true,
        user_metadata: { role: targetTable === "recruiter_profiles" ? "recruiter" : "jobseeker" },
      }),
    });
    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({ message: "Failed to update password" }));
      return new Response(JSON.stringify({ error: errData.message || errData.msg || "Failed to update password" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Clear OTP
  if (targetTable === "pending_otps") {
    await fetch(`${supabaseUrl}/rest/v1/pending_otps?email=ilike.${encodeURIComponent(cleanEmail)}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
  } else {
    await fetch(`${supabaseUrl}/rest/v1/${targetTable}?id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ otp_code: null, otp_expires_at: null }),
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/reset-password" };
