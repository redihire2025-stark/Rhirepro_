import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
  override: true,
});

const PORT = 3001;

console.log("  ✉  BREVO_API_KEY  :", process.env.BREVO_API_KEY?.slice(0, 18) + "...");
console.log("  ✉  SENDER EMAIL   :", process.env.BREVO_SENDER_EMAIL);
console.log("  ✉  SERVICE KEY    :", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) + "...");

function adminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

async function sendBrevoEmail(to_email, to_name, subject, htmlContent) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || "RhirePro", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to_email, name: to_name || to_email }],
      subject,
      htmlContent,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Brevo error:", err);
    throw new Error(err);
  }
}

function otpHtml(toName, toEmail, otpCode, expiryMinutes, type) {
  const isReset = type === "reset";
  const label = isReset ? "Password Reset OTP" : "Login OTP";
  const desc = isReset
    ? "Use the code below to reset your RhirePro password. Do not share this with anyone."
    : "Use the code below to complete your sign-in to RhirePro.";
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#FF2B2B;margin-bottom:4px;">RhirePro</h2>
      <p style="color:#333;margin-top:0;">Hi <strong>${toName || toEmail}</strong>,</p>
      <p style="color:#555;">${desc}</p>
      <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <p style="color:#888;font-size:12px;margin:0 0 8px;">${label}</p>
        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#FF2B2B;">${otpCode}</span>
      </div>
      <p style="color:#666;font-size:14px;">Expires in <strong>${expiryMinutes} minutes</strong>.</p>
      <p style="color:#666;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
      <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
    </div>`;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const ok = (data) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
  const fail = (status, msg) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: msg })); };

  // ── POST /api/send-otp  (Login OTP — generated client-side) ─────────────────
  if (req.method === "POST" && req.url === "/api/send-otp") {
    const { to_email, to_name, otp_code, expiry_minutes } = await readBody(req);
    try {
      await sendBrevoEmail(
        to_email, to_name,
        `RhirePro Login OTP: ${otp_code}`,
        otpHtml(to_name, to_email, otp_code, expiry_minutes, "login")
      );
      ok({ success: true });
    } catch (err) { fail(500, err.message); }
    return;
  }

  // ── POST /api/send-reset-otp  (generate OTP server-side, store in DB, send) ─
  if (req.method === "POST" && req.url === "/api/send-reset-otp") {
    const { email, user_type } = await readBody(req);
    try {
      const admin = adminClient();
      const table = user_type === "recruiter" ? "recruiter_profiles" : "profiles";
      const nameCol = user_type === "recruiter" ? "recruiter_name" : "first_name";

      const { data: user, error: lookupErr } = await admin
        .from(table).select(`id, ${nameCol}`).eq("email", email).single();

      if (lookupErr || !user)
        return fail(404, "No account found with this email address.");

      const otp = generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: storeErr } = await admin.from(table)
        .update({ otp_code: otp, otp_expires_at: expires }).eq("id", user.id);
      if (storeErr) throw new Error("Failed to store OTP: " + storeErr.message);

      const name = user[nameCol] || email;
      await sendBrevoEmail(
        email, name,
        `RhirePro Password Reset OTP: ${otp}`,
        otpHtml(name, email, otp, 10, "reset")
      );
      ok({ success: true });
    } catch (err) { fail(500, err.message); }
    return;
  }

  // ── POST /api/reset-password  (verify OTP, update password) ─────────────────
  if (req.method === "POST" && req.url === "/api/reset-password") {
    const { email, otp, new_password, user_type } = await readBody(req);
    try {
      const admin = adminClient();
      const table = user_type === "recruiter" ? "recruiter_profiles" : "profiles";

      const { data: user, error: lookupErr } = await admin
        .from(table).select("id, otp_code, otp_expires_at").eq("email", email).single();

      if (lookupErr || !user) return fail(404, "No account found with this email address.");
      if (!user.otp_code) return fail(400, "No OTP found. Please request a new one.");
      if (new Date(user.otp_expires_at) < new Date()) return fail(400, "OTP has expired. Please request a new one.");
      if (user.otp_code !== otp) return fail(400, "Invalid OTP. Please try again.");

      const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, { password: new_password });
      if (updateErr) throw new Error("Failed to update password: " + updateErr.message);

      await admin.from(table).update({ otp_code: null, otp_expires_at: null }).eq("id", user.id);

      ok({ success: true });
    } catch (err) { fail(500, err.message); }
    return;
  }

  res.writeHead(404); res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`  ✉  Email server ready → http://localhost:${PORT}`);
});
