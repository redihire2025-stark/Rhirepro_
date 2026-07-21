import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
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

// Best-effort log for the Super Admin "Emails" module — never allowed to
// break the actual send if it fails (e.g. table not migrated yet).
async function logEmail(admin, { recipient_email, email_type, subject, status, error_message }) {
  try {
    await admin.from("email_logs").insert({
      recipient_email, email_type, subject, status, error_message: error_message ?? null,
    });
  } catch {
    // Logging is best-effort only.
  }
}

async function sendBrevoEmail(to_email, to_name, subject, htmlContent, emailType = "other") {
  const admin = adminClient();
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
    await logEmail(admin, { recipient_email: to_email, email_type: emailType, subject, status: "failed", error_message: err });
    throw new Error(err);
  }
  await logEmail(admin, { recipient_email: to_email, email_type: emailType, subject, status: "sent" });
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

// Best-effort log for the Super Admin "API Monitoring" module.
function logApiRequest({ function_name, status_code, duration_ms, error_message }) {
  adminClient()
    .from("api_request_logs")
    .insert({ function_name, status_code, duration_ms, error_message: error_message ?? null })
    .then(() => {}, () => {});
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const requestStart = Date.now();
  const routeName = (req.url || "unknown").split("?")[0];

  const ok = (data) => {
    logApiRequest({ function_name: routeName, status_code: 200, duration_ms: Date.now() - requestStart });
    res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(data));
  };
  const fail = (status, msg) => {
    logApiRequest({ function_name: routeName, status_code: status, duration_ms: Date.now() - requestStart, error_message: msg });
    res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: msg }));
  };

  // ── POST /api/send-otp  (Login OTP — generated client-side) ─────────────────
  if (req.method === "POST" && req.url === "/api/send-otp") {
    const { to_email, to_name, otp_code, expiry_minutes } = await readBody(req);
    try {
      await sendBrevoEmail(
        to_email, to_name,
        `RhirePro Login OTP: ${otp_code}`,
        otpHtml(to_name, to_email, otp_code, expiry_minutes, "login"),
        "otp"
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
        otpHtml(name, email, otp, 10, "reset"),
        "reset_otp"
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

  // ── POST /api/send-invite  (org admin invite — mirrors Netlify function) ────
  if (req.method === "POST" && req.url === "/api/send-invite") {
    const { org_admin_id, company_name, invited_email, invited_by_name } = await readBody(req);
    try {
      if (!org_admin_id || !company_name || !invited_email)
        return fail(400, "Missing required fields.");

      const admin = adminClient();

      // Fetch org admin profile to verify domains match
      const { data: adminProfile, error: adminErr } = await admin
        .from("recruiter_profiles")
        .select("email")
        .eq("id", org_admin_id)
        .maybeSingle();

      if (adminErr || !adminProfile) {
        return fail(404, "Org admin profile not found.");
      }

      const adminDomain = adminProfile.email.split("@")[1]?.toLowerCase();
      const inviteDomain = invited_email.split("@")[1]?.toLowerCase();

      if (!adminDomain || !inviteDomain || adminDomain !== inviteDomain) {
        return fail(400, `You can only invite users with a matching email domain (@${adminDomain || ""})`);
      }

      const token = randomBytes(32).toString("hex");
      const { error: insertErr } = await admin.from("recruiter_invitations").insert({
        org_admin_id,
        company_name,
        invited_email,
        token,
        role: "member",
        status: "pending",
      });
      if (insertErr) return fail(500, insertErr.message);

      const siteUrl = "http://localhost:5173";
      const inviteUrl = `${siteUrl}/recruiter/join/${token}`;

      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
          <h2 style="color:#FF2B2B;margin-bottom:4px;">RhirePro</h2>
          <p style="color:#333;">Hi there,</p>
          <p style="color:#555;">
            <strong>${invited_by_name || "Your team admin"}</strong> has invited you to join
            <strong>${company_name}</strong> as a recruiter on RhirePro.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${inviteUrl}"
               style="background:#FF2B2B;color:#fff;padding:14px 32px;border-radius:999px;
                      text-decoration:none;font-weight:bold;font-size:16px;">
              Accept Invitation
            </a>
          </div>
          <p style="color:#888;font-size:13px;">This link expires in 7 days.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
        </div>`;

      await sendBrevoEmail(
        invited_email,
        invited_email,
        `You're invited to join ${company_name} on RhirePro`,
        html,
        "invite"
      );

      ok({ success: true });
    } catch (err) { fail(500, err.message); }
    return;
  }

  // ── POST /api/super-admin-login  (mirrors netlify/functions/super-admin-login.mjs) ─
  if (req.method === "POST" && req.url === "/api/super-admin-login") {
    const { email: rawEmail, password } = await readBody(req);
    const email = (rawEmail || "").trim().toLowerCase();
    const BOOTSTRAP_EMAIL = process.env.SUPER_ADMIN_EMAIL;
    const BOOTSTRAP_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) return fail(400, "Email and password are required.");

    try {
      const admin = adminClient();
      const isBootstrapEmail = !!BOOTSTRAP_EMAIL && email === BOOTSTRAP_EMAIL.trim().toLowerCase();

      const { data: existingAdmin } = await admin
        .from("super_admins")
        .select("id, email, is_active")
        .eq("email", email)
        .maybeSingle();

      if (!existingAdmin) {
        if (!isBootstrapEmail || password !== BOOTSTRAP_PASSWORD) {
          return fail(401, "Invalid credentials");
        }

        let userId;
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: "super_admin" },
        });

        if (createErr) {
          if (createErr.message?.includes("already been registered")) {
            const { data: { users } } = await admin.auth.admin.listUsers();
            const existing = users.find((u) => u.email?.toLowerCase() === email);
            if (!existing) return fail(500, "Could not provision admin account");
            userId = existing.id;
            await admin.auth.admin.updateUserById(userId, {
              password,
              user_metadata: { role: "super_admin" },
            });
          } else {
            return fail(500, createErr.message);
          }
        } else {
          userId = created.user.id;
        }

        const { error: upsertErr } = await admin
          .from("super_admins")
          .upsert({ id: userId, email, is_active: true }, { onConflict: "id" });
        if (upsertErr) return fail(500, upsertErr.message);
      } else if (!existingAdmin.is_active) {
        return fail(401, "Invalid credentials");
      }

      const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
      if (signInErr || !signInData.session) return fail(401, "Invalid credentials");

      const { data: finalAdmin } = await admin
        .from("super_admins")
        .select("id, is_active")
        .eq("id", signInData.user.id)
        .maybeSingle();
      if (!finalAdmin || !finalAdmin.is_active) return fail(401, "Invalid credentials");

      await admin.from("super_admins").update({ last_login_at: new Date().toISOString() }).eq("id", finalAdmin.id);

      ok({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        user: { id: signInData.user.id, email: signInData.user.email },
      });
    } catch (err) {
      fail(500, err.message || "Unexpected error");
    }
    return;
  }

  // ── POST /api/super-admin-invite  (mirrors netlify/functions/super-admin-invite.mjs) ─
  if (req.method === "POST" && req.url === "/api/super-admin-invite") {
    const authHeader = req.headers["authorization"] || "";
    const callerToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!callerToken) return fail(401, "Not authenticated");

    try {
      const admin = adminClient();
      const { data: callerUser, error: callerErr } = await admin.auth.getUser(callerToken);
      if (callerErr || !callerUser?.user) return fail(401, "Not authenticated");

      const { data: callerAdmin } = await admin
        .from("super_admins").select("id, is_active").eq("id", callerUser.user.id).maybeSingle();
      if (!callerAdmin || !callerAdmin.is_active) return fail(403, "Not authorized");

      const body = await readBody(req);
      const email = (body.email || "").trim().toLowerCase();
      const fullName = body.full_name || null;
      const role = ["owner", "admin", "viewer"].includes(body.role) ? body.role : "admin";
      if (!email) return fail(400, "Email is required");

      const tempPassword = randomBytes(12).toString("base64url");

      let userId;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password: tempPassword, email_confirm: true, user_metadata: { role: "super_admin" },
      });
      if (createErr) {
        if (createErr.message?.includes("already been registered")) {
          const { data: { users } } = await admin.auth.admin.listUsers();
          const existing = users.find((u) => u.email?.toLowerCase() === email);
          if (!existing) return fail(500, "Could not provision admin account");
          userId = existing.id;
          await admin.auth.admin.updateUserById(userId, { password: tempPassword, user_metadata: { role: "super_admin" } });
        } else {
          return fail(500, createErr.message);
        }
      } else {
        userId = created.user.id;
      }

      const { error: upsertErr } = await admin.from("super_admins").upsert(
        { id: userId, email, full_name: fullName, role, is_active: true }, { onConflict: "id" }
      );
      if (upsertErr) return fail(500, upsertErr.message);

      const subject = "You've been added as a RhirePro Super Admin";
      await sendBrevoEmail(
        email, fullName || email, subject,
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#FF2B2B;margin-bottom:8px;">RhirePro</h2>
          <p style="color:#333;">Hi ${fullName || email},</p>
          <p style="color:#333;">You've been added as a Super Admin (role: <strong>${role}</strong>).</p>
          <div style="background:#f5f5f5;border-radius:12px;padding:24px;margin:24px 0;">
            <p style="color:#888;font-size:12px;margin:0 0 8px;">Temporary password</p>
            <span style="font-size:22px;font-weight:bold;letter-spacing:1px;color:#FF2B2B;">${tempPassword}</span>
          </div>
          <p style="color:#666;font-size:14px;">Sign in at <strong>/super-admin/login</strong> and change your password afterwards.</p>
        </div>`,
        "invite"
      ).catch(() => {});

      ok({ success: true, temp_password: tempPassword });
    } catch (err) {
      fail(500, err.message || "Unexpected error");
    }
    return;
  }

  res.writeHead(404); res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`  ✉  Email server ready → http://localhost:${PORT}`);
});
