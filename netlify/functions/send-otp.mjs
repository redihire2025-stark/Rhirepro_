// Best-effort log for the Super Admin "Emails" module — never allowed to
// break the actual send if it fails (e.g. table not migrated yet).
async function logEmail(supabaseUrl, serviceKey, { recipient_email, email_type, subject, status, error_message }) {
  if (!supabaseUrl || !serviceKey) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ recipient_email, email_type, subject, status, error_message: error_message ?? null }),
    });
  } catch {
    // Logging is best-effort only.
  }
}

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

  const { to_email, to_name, otp_code, expiry_minutes } = await request.json();

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "RhirePro";
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !senderEmail) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to_email, name: to_name || to_email }],
      subject: `Your RhirePro OTP: ${otp_code}`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#FF2B2B;margin-bottom:8px;">RhirePro</h2>
          <p style="color:#333;">Hi <strong>${to_name || to_email}</strong>,</p>
          <p style="color:#333;">Your verification code is:</p>
          <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#FF2B2B;">${otp_code}</span>
          </div>
          <p style="color:#666;font-size:14px;">This code expires in <strong>${expiry_minutes} minutes</strong>.</p>
          <p style="color:#666;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    await logEmail(supabaseUrl, serviceKey, {
      recipient_email: to_email,
      email_type: "otp",
      subject: `Your RhirePro OTP: ${otp_code}`,
      status: "failed",
      error_message: err,
    });
    await logApiRequest(supabaseUrl, serviceKey, {
      function_name: "/api/send-otp", status_code: 500, duration_ms: Date.now() - requestStart, error_message: err,
    });
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  await logEmail(supabaseUrl, serviceKey, {
    recipient_email: to_email,
    email_type: "otp",
    subject: `Your RhirePro OTP: ${otp_code}`,
    status: "sent",
  });
  await logApiRequest(supabaseUrl, serviceKey, {
    function_name: "/api/send-otp", status_code: 200, duration_ms: Date.now() - requestStart,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/send-otp" };
