import bcrypt from "bcryptjs";
import crypto from "crypto";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { email, otp_hash, otp, new_password, user_type } = await request.json();
  const cleanEmail = (email || "").trim().toLowerCase();
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

  // Update password in Supabase Auth via Admin REST API
  const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: new_password }),
  });

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({ message: "Failed to update password" }));
    return new Response(JSON.stringify({ error: errData.message || "Failed to update password" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Clear OTP
  await fetch(`${supabaseUrl}/rest/v1/${targetTable}?id=eq.${user.id}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ otp_code: null, otp_expires_at: null }),
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/reset-password" };
