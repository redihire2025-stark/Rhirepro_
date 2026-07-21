import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function randomPassword() {
  return randomBytes(12).toString("base64url");
}

async function logEmail(admin, { recipient_email, email_type, subject, status, error_message }) {
  try {
    await admin.from("email_logs").insert({
      recipient_email, email_type, subject, status, error_message: error_message ?? null,
    });
  } catch {
    // Logging is best-effort only.
  }
}

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "RhirePro";

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only an already-authenticated super admin may invite another one.
  const authHeader = request.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerUser, error: callerErr } = await admin.auth.getUser(callerToken);
  if (callerErr || !callerUser?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: callerAdmin } = await admin
    .from("super_admins")
    .select("id, is_active")
    .eq("id", callerUser.user.id)
    .maybeSingle();

  if (!callerAdmin || !callerAdmin.is_active) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let email, fullName, role;
  try {
    const body = await request.json();
    email = (body.email || "").trim().toLowerCase();
    fullName = body.full_name || null;
    role = ["owner", "admin", "viewer"].includes(body.role) ? body.role : "admin";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tempPassword = randomPassword();

  let userId;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { role: "super_admin" },
  });

  if (createErr) {
    if (createErr.message?.includes("already been registered")) {
      const { data: { users } } = await admin.auth.admin.listUsers();
      const existing = users.find((u) => u.email?.toLowerCase() === email);
      if (!existing) {
        return new Response(JSON.stringify({ error: "Could not provision admin account" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        user_metadata: { role: "super_admin" },
      });
    } else {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    userId = created.user.id;
  }

  const { error: upsertErr } = await admin.from("super_admins").upsert(
    { id: userId, email, full_name: fullName, role, is_active: true },
    { onConflict: "id" }
  );
  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (brevoKey && senderEmail) {
    const subject = "You've been added as a RhirePro Super Admin";
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#FF2B2B;margin-bottom:8px;">RhirePro</h2>
        <p style="color:#333;">Hi ${fullName || email},</p>
        <p style="color:#333;">You've been added as a Super Admin (role: <strong>${role}</strong>).</p>
        <div style="background:#f5f5f5;border-radius:12px;padding:24px;margin:24px 0;">
          <p style="color:#888;font-size:12px;margin:0 0 8px;">Temporary password</p>
          <span style="font-size:22px;font-weight:bold;letter-spacing:1px;color:#FF2B2B;">${tempPassword}</span>
        </div>
        <p style="color:#666;font-size:14px;">Sign in at <strong>/super-admin/login</strong> and change your password afterwards.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
      </div>
    `;
    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": brevoKey },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email }],
        subject,
        htmlContent: html,
      }),
    });
    await logEmail(admin, {
      recipient_email: email,
      email_type: "invite",
      subject,
      status: emailRes.ok ? "sent" : "failed",
      error_message: emailRes.ok ? null : await emailRes.text(),
    });
  }

  return new Response(JSON.stringify({ success: true, temp_password: tempPassword }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/super-admin-invite" };
