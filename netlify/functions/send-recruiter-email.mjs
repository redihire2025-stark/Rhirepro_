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
    let emailAddr = (recipient.email || "").trim();

    // If client RLS passed a candidate ID placeholder or empty email, resolve candidate real email using Service Role
    if ((!emailAddr || emailAddr.endsWith("@candidate.recruiter")) && recipient.id && supabaseUrl && serviceKey) {
      try {
        const [pRes, rRes, uRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${recipient.id}&select=email`, {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          }),
          fetch(`${supabaseUrl}/rest/v1/recruiter_profiles?id=eq.${recipient.id}&select=email`, {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          }),
          fetch(`${supabaseUrl}/auth/v1/admin/users/${recipient.id}`, {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          }),
        ]);
        const pData = pRes.ok ? await pRes.json() : [];
        const rData = rRes.ok ? await rRes.json() : [];
        const uData = uRes.ok ? await uRes.json() : null;

        if (pData && pData[0] && pData[0].email) emailAddr = pData[0].email.trim();
        else if (rData && rData[0] && rData[0].email) emailAddr = rData[0].email.trim();
        else if (uData && uData.email) emailAddr = uData.email.trim();
      } catch (pErr) {
        console.warn("[send-recruiter-email] Service role email resolution fallback failed:", pErr.message);
      }
    }

    if (!emailAddr || emailAddr.endsWith("@candidate.recruiter") || !emailAddr.includes("@")) {
      console.warn("[send-recruiter-email] Skipping recipient without valid email address:", recipient.name, emailAddr);
      continue;
    }

    try {
      const candidateName = recipient.name || "Candidate";
      let recipientSubject = (recipient.subject || subject || "").replaceAll("{{candidate_name}}", candidateName);
      let recipientBody = (recipient.body || body || "").replaceAll("{{candidate_name}}", candidateName);

      // If recipients batch contains another candidate's name, swap it for this recipient's name
      for (const other of recipients) {
        if (other.email !== recipient.email && other.name && other.name !== "Candidate" && other.name.length > 2) {
          const otherName = other.name.trim();
          if (recipientSubject.includes(otherName)) recipientSubject = recipientSubject.replaceAll(otherName, candidateName);
          if (recipientBody.includes(otherName)) recipientBody = recipientBody.replaceAll(otherName, candidateName);

          const otherFirstName = otherName.split(" ")[0];
          const candFirstName = candidateName.split(" ")[0];
          if (otherFirstName && otherFirstName.length > 2 && candFirstName) {
            if (recipientSubject.includes(otherFirstName)) recipientSubject = recipientSubject.replaceAll(otherFirstName, candFirstName);
            if (recipientBody.includes(otherFirstName)) recipientBody = recipientBody.replaceAll(otherFirstName, candFirstName);
          }
        }
      }

      /*
       * Table-based with inline styles on every cell. The previous template was
       * nested <div>s whose header used `display: flex`, which Outlook and Gmail
       * both ignore, so the RhirePro wordmark and the "Recruiter Message" pill
       * collapsed together and the message rendered as a cramped, unstyled
       * block. border-radius and box-shadow are dropped by Outlook too, so the
       * design no longer relies on them.
       *
       * The body is escaped before newlines become <br />. It is recruiter-authored
       * text that was being interpolated raw, so any < or & in a message was
       * treated as markup.
       */
      const escapeHtml = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const bodyHtml = escapeHtml(recipientBody)
        .split(/\n{2,}/)
        .map((para) => para.trim())
        .filter(Boolean)
        .map(
          (para) =>
            `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3A1F1F;">${para.replace(/\n/g, "<br />")}</p>`,
        )
        .join("");

      const formattedHtml = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        <tr><td style="background:#3A1F1F;padding:16px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" style="font-weight:bold;font-size:18px;color:#ffffff;">RhirePro</td>
              <td align="right"><span style="background:#FF2B2B;color:#ffffff;padding:5px 12px;font-size:11px;font-weight:bold;">Recruiter Message</span></td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px;">${bodyHtml}</td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:16px 24px;text-align:center;font-size:12px;color:#8A8A8A;">
          Sent via RhirePro Talent Acquisition Platform &bull;
          <a href="https://rhirepro.com" style="color:#FF2B2B;text-decoration:none;font-weight:bold;">RhirePro</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [emailAddr],
          subject: recipientSubject,
          html: formattedHtml,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[send-recruiter-email] Send error for", emailAddr, err);
        await logEmail(supabaseUrl, serviceKey, {
          recipient_email: emailAddr,
          email_type: "recruiter_outreach",
          subject: recipientSubject,
          status: "failed",
          error_message: err,
        });
      } else {
        sentCount++;
        await logEmail(supabaseUrl, serviceKey, {
          recipient_email: emailAddr,
          email_type: "recruiter_outreach",
          subject: recipientSubject,
          status: "sent",
        });
      }
    } catch (rErr) {
      console.error("[send-recruiter-email] Exception sending email to", emailAddr, rErr.message);
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
