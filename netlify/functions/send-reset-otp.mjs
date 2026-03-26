import { createClient } from "@supabase/supabase-js";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function adminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function otpHtml(toName, toEmail, otpCode) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#FF2B2B;margin-bottom:4px;">RhirePro</h2>
      <p style="color:#333;">Hi <strong>${toName || toEmail}</strong>,</p>
      <p style="color:#555;">Use the code below to reset your RhirePro password. Do not share this with anyone.</p>
      <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <p style="color:#888;font-size:12px;margin:0 0 8px;">Password Reset OTP</p>
        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#FF2B2B;">${otpCode}</span>
      </div>
      <p style="color:#666;font-size:14px;">Expires in <strong>10 minutes</strong>.</p>
      <p style="color:#666;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
      <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
    </div>`;
}

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { email, user_type } = await request.json();
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "RhirePro";

  if (!apiKey || !senderEmail) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const admin = adminClient();
    const table = user_type === "recruiter" ? "recruiter_profiles" : "profiles";
    const nameCol = user_type === "recruiter" ? "recruiter_name" : "first_name";

    const { data: user, error: lookupErr } = await admin
      .from(table).select(`id, ${nameCol}`).eq("email", email).single();

    if (lookupErr || !user) {
      return new Response(JSON.stringify({ error: "No account found with this email address." }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: storeErr } = await admin.from(table)
      .update({ otp_code: otp, otp_expires_at: expires }).eq("id", user.id);
    if (storeErr) throw new Error("Failed to store OTP: " + storeErr.message);

    const name = user[nameCol] || email;
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email, name }],
        subject: `RhirePro Password Reset OTP: ${otp}`,
        htmlContent: otpHtml(name, email, otp),
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/send-reset-otp" };
