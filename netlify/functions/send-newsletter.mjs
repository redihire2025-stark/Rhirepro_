// Netlify Serverless Function for Newsletter Broadcast via Resend
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

  const { recipients, subject, contentHtml } = await request.json();

  const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || "";
  const senderEmail = process.env.RESEND_SENDER_EMAIL || process.env.VITE_RESEND_SENDER_EMAIL || "support@rhirepro.com";
  const senderName = process.env.RESEND_SENDER_NAME || process.env.VITE_RESEND_SENDER_NAME || "RhirePro";

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Resend email service key is not configured" }), {
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
    const emailAddr = (typeof recipient === "string" ? recipient : recipient.email || "").trim();
    if (!emailAddr || !emailAddr.includes("@")) continue;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [emailAddr],
          subject: subject,
          html: contentHtml,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[send-newsletter] Send error for", emailAddr, errText);
        await logEmail(supabaseUrl, serviceKey, {
          recipient_email: emailAddr,
          email_type: "newsletter",
          subject: subject,
          status: "failed",
          error_message: errText,
        });
      } else {
        sentCount++;
        await logEmail(supabaseUrl, serviceKey, {
          recipient_email: emailAddr,
          email_type: "newsletter",
          subject: subject,
          status: "sent",
        });
      }
    } catch (rErr) {
      console.error("[send-newsletter] Exception sending email to", emailAddr, rErr.message);
    }
  }

  await logApiRequest(supabaseUrl, serviceKey, {
    function_name: "/api/send-newsletter",
    status_code: 200,
    duration_ms: Date.now() - requestStart,
  });

  return new Response(JSON.stringify({ success: true, sent_count: sentCount }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/send-newsletter" };
