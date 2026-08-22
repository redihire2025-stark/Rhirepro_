/*
 * POST /api/recruiter-status-email
 *
 * Notifies a recruiter that a Super Admin approved, declined, disabled or
 * re-enabled their account. Previously these decisions were silent — the
 * recruiter only discovered them by trying to sign in.
 *
 * Two deliberate guards, because this endpoint sends mail on demand and would
 * otherwise be an open relay:
 *   1. The caller must present a Supabase access token belonging to an active
 *      super admin. Anonymous callers get 401, ordinary users 403.
 *   2. The recipient address is looked up from recruiter_profiles by id. The
 *      caller supplies only the recruiter's id, never an email address, so this
 *      cannot be pointed at an arbitrary inbox.
 */

const json = (payload, status) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

const SUPABASE_URL = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

const svcHeaders = () => {
  const k = SERVICE_KEY();
  return { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" };
};

// Best-effort audit trail for the Super Admin "Emails" screen.
async function logEmail(row) {
  try {
    await fetch(`${SUPABASE_URL()}/rest/v1/email_logs`, {
      method: "POST",
      headers: { ...svcHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch {
    // Never let logging break the send.
  }
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/*
 * Table-based layout with inline styles throughout. Gmail and Outlook strip
 * <style> blocks and ignore flex/grid, so a <div> layout collapses in exactly
 * the way QA reported for the mass-email template.
 */
function renderEmail({ heading, accent, greeting, body, reasonLabel, reason, ctaLabel, ctaUrl, footerNote }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        <tr><td style="background:${accent};padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px;">RhirePro</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:20px;line-height:1.35;color:#1f2937;">${esc(heading)}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${esc(greeting)}</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">${body}</p>
          ${
            reason
              ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                   <tr><td style="background:#f9fafb;border-left:4px solid ${accent};border-radius:6px;padding:14px 16px;">
                     <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;">${esc(reasonLabel)}</p>
                     <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;white-space:pre-wrap;">${esc(reason)}</p>
                   </td></tr>
                 </table>`
              : ""
          }
          ${
            ctaLabel
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                   <tr><td style="background:${accent};border-radius:8px;">
                     <a href="${esc(ctaUrl)}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${esc(ctaLabel)}</a>
                   </td></tr>
                 </table>`
              : ""
          }
          <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">${esc(footerNote)}</p>
        </td></tr>
        <tr><td style="border-top:1px solid #e5e7eb;padding:16px 28px;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
            Sent by RhirePro. Questions? Reply to this email or contact support@rhirepro.com.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildMessage(action, name, reason, siteUrl) {
  const who = name || "there";
  switch (action) {
    case "approved":
      return {
        subject: "Your RhirePro recruiter account is approved",
        html: renderEmail({
          heading: "Your account has been approved",
          accent: "#16a34a",
          greeting: `Hi ${who},`,
          body: "Your recruiter account has been reviewed and approved. You can now sign in and start posting jobs and searching candidates.",
          ctaLabel: "Sign in to RhirePro",
          ctaUrl: `${siteUrl}/signin?role=recruiter`,
          footerNote: "Welcome aboard.",
        }),
      };
    case "declined":
      return {
        subject: "Update on your RhirePro recruiter application",
        html: renderEmail({
          heading: "Your account application was declined",
          accent: "#dc2626",
          greeting: `Hi ${who},`,
          body: "We reviewed your recruiter account application and are unable to approve it at this time.",
          reasonLabel: "Reason",
          reason: reason || "No additional detail was provided.",
          footerNote: "If you believe this was a mistake, reply to this email and our team will take another look.",
        }),
      };
    case "disabled":
      return {
        subject: "Your RhirePro recruiter account has been disabled",
        html: renderEmail({
          heading: "Your account has been disabled",
          accent: "#dc2626",
          greeting: `Hi ${who},`,
          body: "Your recruiter account has been disabled by an administrator. You will not be able to sign in until it is re-enabled.",
          reasonLabel: "Reason",
          reason: reason || "",
          footerNote: "If you think this is an error, reply to this email and our team will review it.",
        }),
      };
    case "enabled":
      return {
        subject: "Your RhirePro recruiter account has been re-enabled",
        html: renderEmail({
          heading: "Your account is active again",
          accent: "#16a34a",
          greeting: `Hi ${who},`,
          body: "Your recruiter account has been re-enabled. You can sign in and pick up where you left off.",
          ctaLabel: "Sign in to RhirePro",
          ctaUrl: `${siteUrl}/signin?role=recruiter`,
          footerNote: "Thanks for your patience.",
        }),
      };
    default:
      return null;
  }
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid request body." }, 400);

  const { recruiter_id: recruiterId, action, reason } = body;
  const allowed = ["approved", "declined", "disabled", "enabled"];
  if (!recruiterId || !allowed.includes(action)) {
    return json({ error: "recruiter_id and a valid action are required." }, 400);
  }

  if (!SUPABASE_URL() || !SERVICE_KEY()) {
    console.error("[recruiter-status-email] Supabase credentials missing");
    return json({ error: "Server is not configured." }, 500);
  }

  // ── Guard 1: the caller must be an active super admin ──────────────────────
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Authentication required." }, 401);

  const userRes = await fetch(`${SUPABASE_URL()}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY(), Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ error: "Authentication required." }, 401);
  const caller = await userRes.json().catch(() => null);
  if (!caller?.id) return json({ error: "Authentication required." }, 401);

  const adminRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/super_admins?id=eq.${caller.id}&is_active=is.true&select=id`,
    { headers: svcHeaders() },
  );
  const admins = adminRes.ok ? await adminRes.json().catch(() => []) : [];
  if (!Array.isArray(admins) || admins.length === 0) {
    return json({ error: "Only a super admin can send account status emails." }, 403);
  }

  // ── Guard 2: recipient comes from the database, never from the caller ──────
  const recRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/recruiter_profiles?id=eq.${encodeURIComponent(recruiterId)}&select=email,recruiter_name`,
    { headers: svcHeaders() },
  );
  const recs = recRes.ok ? await recRes.json().catch(() => []) : [];
  const recruiter = Array.isArray(recs) ? recs[0] : null;
  if (!recruiter?.email) return json({ error: "Recruiter not found." }, 404);

  const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!resendKey) {
    console.error("[recruiter-status-email] RESEND_API_KEY missing");
    return json({ error: "Email service is not configured." }, 500);
  }

  const senderEmail = process.env.RESEND_SENDER_EMAIL || "support@rhirepro.com";
  const senderName = process.env.RESEND_SENDER_NAME || "RhirePro";
  // Link to the unified /signin with the Recruiter tab preselected — that is the
  // canonical sign-in page. /recruiter/signin is the older bare-bones variant.
  const siteUrl = process.env.URL || "https://rhirepro.com";

  const message = buildMessage(action, recruiter.recruiter_name, reason, siteUrl);
  if (!message) return json({ error: "Unsupported action." }, 400);

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [recruiter.email],
        subject: message.subject,
        html: message.html,
      }),
    });
  } catch (networkErr) {
    await logEmail({
      recipient_email: recruiter.email,
      email_type: `recruiter_${action}`,
      subject: message.subject,
      status: "failed",
      error_message: networkErr.message,
    });
    return json({ error: "Could not reach the email service." }, 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    await logEmail({
      recipient_email: recruiter.email,
      email_type: `recruiter_${action}`,
      subject: message.subject,
      status: "failed",
      error_message: `resend ${res.status}: ${detail}`.slice(0, 500),
    });
    console.error(`[recruiter-status-email] Resend ${res.status}:`, detail);
    return json({ error: "The notification email could not be sent." }, res.status === 429 ? 429 : 502);
  }

  await logEmail({
    recipient_email: recruiter.email,
    email_type: `recruiter_${action}`,
    subject: message.subject,
    status: "sent",
  });

  return json({ success: true, sent_to: recruiter.email }, 200);
};

export const config = { path: "/api/recruiter-status-email" };
