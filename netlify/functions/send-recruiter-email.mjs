// Netlify Serverless Function for Recruiter Candidate Email Broadcast via Resend
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

  const { recipients, subject, body, templateName } = await request.json();

  const brevoKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.RESEND_SENDER_EMAIL || "onboarding@resend.dev";
  const senderName = process.env.RESEND_SENDER_NAME || "RhirePro";
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendKey && !brevoKey) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return new Response(JSON.stringify({ error: "No recipients provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sentCount = 0;
  for (const recipient of recipients) {
    const formattedHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #f6f6f6; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
          <div style="background-color: #3A1F1F; color: #ffffff; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: bold; font-size: 18px; color: #ffffff;">RhirePro</span>
            <span style="background-color: #FF2B2B; color: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: bold;">Recruiter Message</span>
          </div>
          <div style="padding: 24px; color: #3A1F1F; font-size: 14px; line-height: 1.6;">
            <div style="white-space: pre-wrap;">${body.replace(/\n/g, "<br/>")}</div>
          </div>
          <div style="background-color: #f9fafb; border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; font-size: 12px; color: #8A8A8A;">
            Sent via RhirePro Talent Acquisition Platform • <a href="https://rhirepro.com" style="color: #FF2B2B; text-decoration: none; font-weight: bold;">RhirePro</a>
          </div>
        </div>
      </div>
    `;

    let res;
    if (resendKey) {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [recipient.email],
          subject,
          html: formattedHtml,
        }),
      });
    } else {
      res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoKey,
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: recipient.email, name: recipient.name || recipient.email }],
          subject,
          htmlContent: formattedHtml,
        }),
      });
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("[send-recruiter-email] Send error:", err);
      await logEmail(supabaseUrl, serviceKey, {
        recipient_email: recipient.email,
        email_type: "recruiter_outreach",
        subject,
        status: "failed",
        error_message: err,
      });
    } else {
      sentCount++;
      await logEmail(supabaseUrl, serviceKey, {
        recipient_email: recipient.email,
        email_type: "recruiter_outreach",
        subject,
        status: "sent",
      });
    }
  }

  await logApiRequest(supabaseUrl, serviceKey, {
    function_name: "/api/send-recruiter-email",
    status_code: 200,
    duration_ms: Date.now() - requestStart,
  });

  return new Response(JSON.stringify({ success: true, count: sentCount }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/send-recruiter-email" };
