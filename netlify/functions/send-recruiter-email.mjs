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
  const brevoKey = process.env.BREVO_API_KEY || "";
  const senderEmail = process.env.RESEND_SENDER_EMAIL || process.env.VITE_RESEND_SENDER_EMAIL || process.env.BREVO_SENDER_EMAIL || "support@rhirepro.com";
  const senderName = process.env.RESEND_SENDER_NAME || process.env.VITE_RESEND_SENDER_NAME || process.env.BREVO_SENDER_NAME || "RhirePro";
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendKey && !brevoKey) {
    console.warn("[send-recruiter-email] Neither Resend nor Brevo key is configured. Operating in simulated email mode.");
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

      const formattedHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #f6f6f6; padding: 24px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
            <div style="background-color: #3A1F1F; color: #ffffff; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: bold; font-size: 18px; color: #ffffff;">RhirePro</span>
              <span style="background-color: #FF2B2B; color: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: bold;">Recruiter Message</span>
            </div>
            <div style="padding: 24px; color: #3A1F1F; font-size: 14px; line-height: 1.6;">
              <div style="white-space: pre-wrap;">${recipientBody.replace(/\n/g, "<br/>")}</div>
            </div>
            <div style="background-color: #f9fafb; border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; font-size: 12px; color: #8A8A8A;">
              Sent via RhirePro Talent Acquisition Platform • <a href="https://rhirepro.com" style="color: #FF2B2B; text-decoration: none; font-weight: bold;">RhirePro</a>
            </div>
          </div>
        </div>
      `;

      if (resendKey) {
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
          console.error("[send-recruiter-email] Resend error for", emailAddr, err);
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
      } else if (brevoKey) {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoKey,
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: emailAddr, name: candidateName }],
            subject: recipientSubject,
            htmlContent: formattedHtml,
          }),
        });
        if (res.ok) {
          sentCount++;
          await logEmail(supabaseUrl, serviceKey, { recipient_email: emailAddr, email_type: "recruiter_outreach", subject: recipientSubject, status: "sent" });
        } else {
          const errText = await res.text();
          console.error("[send-recruiter-email] Brevo error for", emailAddr, errText);
          await logEmail(supabaseUrl, serviceKey, { recipient_email: emailAddr, email_type: "recruiter_outreach", subject: recipientSubject, status: "failed", error_message: errText });
        }
      } else {
        console.log(`[SIMULATED EMAIL] Candidate notification to ${emailAddr}: ${recipientSubject}`);
        sentCount++;
        await logEmail(supabaseUrl, serviceKey, { recipient_email: emailAddr, email_type: "recruiter_outreach", subject: recipientSubject, status: "sent (simulated)" });
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
