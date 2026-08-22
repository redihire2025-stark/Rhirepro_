/*
 * POST /api/profile-view-email
 *
 * Tells a job seeker by email that a recruiter opened their profile. The in-app
 * notification already existed, but it is only seen by someone who happens to be
 * logged in, which is the opposite of the people this is meant to re-engage.
 *
 * Guards, because this sends mail on demand and would otherwise be an open relay:
 *   1. The caller must present a Supabase access token belonging to a recruiter
 *      who is active and not disabled. Anonymous callers get 401, others 403.
 *   2. The recipient address is read from profiles by id. The caller supplies
 *      only the seeker's profile id, never an address, so this cannot be aimed
 *      at an arbitrary inbox.
 *   3. One email per recruiter, per seeker, per day. The client already keeps a
 *      localStorage guard, but that is per-browser and trivially cleared, so the
 *      real limit is enforced here against the notifications table.
 */

const json = (payload, status) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

const SUPABASE_URL = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

const svcHeaders = () => {
  const k = SERVICE_KEY();
  return { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" };
};

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
 * Table-based layout with inline styles. Gmail and Outlook strip <style> blocks
 * and ignore flex/grid, so a div layout collapses in those clients.
 */
function renderEmail({ greeting, viewer, siteUrl }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        <tr><td style="background:#FF2B2B;padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px;">RhirePro</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:20px;line-height:1.35;color:#1f2937;">A recruiter viewed your profile</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${esc(greeting)}</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">
            A recruiter from <strong>${esc(viewer)}</strong> has just viewed your profile on RhirePro.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="background:#f9fafb;border-left:4px solid #FF2B2B;border-radius:6px;padding:14px 16px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#1f2937;">
                Profiles that are complete and up to date get noticed more often. It is worth checking your
                headline, skills and resume while you are front of mind.
              </p>
            </td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="background:#FF2B2B;border-radius:8px;">
              <a href="${esc(siteUrl)}/jobseeker/dashboard/profile" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Review my profile</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">Good luck with your search.</p>
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

export default async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid request body." }, 400);

  const seekerId = body.profile_id;
  if (!seekerId || typeof seekerId !== "string") {
    return json({ error: "profile_id is required." }, 400);
  }

  if (!SUPABASE_URL() || !SERVICE_KEY()) {
    console.error("[profile-view-email] Supabase credentials missing");
    return json({ error: "Server is not configured." }, 500);
  }

  // ── Guard 1: the caller must be an active recruiter ────────────────────────
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Authentication required." }, 401);

  const userRes = await fetch(`${SUPABASE_URL()}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY(), Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ error: "Authentication required." }, 401);
  const caller = await userRes.json().catch(() => null);
  if (!caller?.id) return json({ error: "Authentication required." }, 401);

  const recRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/recruiter_profiles?id=eq.${encodeURIComponent(caller.id)}` +
      `&select=id,recruiter_name,company_name,is_active,is_disabled`,
    { headers: svcHeaders() },
  );
  const recs = recRes.ok ? await recRes.json().catch(() => []) : [];
  const recruiter = Array.isArray(recs) ? recs[0] : null;
  if (!recruiter) return json({ error: "Only a recruiter can send this notification." }, 403);
  if (recruiter.is_disabled || recruiter.is_active === false) {
    return json({ error: "This recruiter account is not active." }, 403);
  }

  // ── Guard 2: recipient comes from the database, never from the caller ──────
  const seekRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/profiles?id=eq.${encodeURIComponent(seekerId)}&select=email,first_name,is_disabled`,
    { headers: svcHeaders() },
  );
  const seekers = seekRes.ok ? await seekRes.json().catch(() => []) : [];
  const seeker = Array.isArray(seekers) ? seekers[0] : null;
  if (!seeker?.email) return json({ error: "Job seeker not found." }, 404);
  if (seeker.is_disabled) return json({ skipped: "recipient disabled" }, 200);

  /*
   * ── Guard 3: at most one email per recruiter/seeker/day ───────────────────
   * The same key the in-app notification is upserted under. Checking it here
   * rather than trusting the client's localStorage means clearing site data
   * cannot be used to spam a candidate.
   */
  const dayKey = `profile-view-email:${seekerId}:${recruiter.id}:${new Date().toISOString().slice(0, 10)}`;
  const dupeRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/notifications?notification_key=eq.${encodeURIComponent(dayKey)}&select=id`,
    { headers: svcHeaders() },
  );
  const dupes = dupeRes.ok ? await dupeRes.json().catch(() => []) : [];
  if (Array.isArray(dupes) && dupes.length > 0) {
    return json({ skipped: "already sent today" }, 200);
  }

  const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!resendKey) {
    console.error("[profile-view-email] RESEND_API_KEY missing");
    return json({ error: "Email service is not configured." }, 500);
  }

  const senderEmail = process.env.RESEND_SENDER_EMAIL || "support@rhirepro.com";
  const senderName = process.env.RESEND_SENDER_NAME || "RhirePro";
  const siteUrl = process.env.URL || "https://rhirepro.com";

  const viewer = recruiter.company_name || recruiter.recruiter_name || "a company";
  const subject = `A recruiter from ${viewer} viewed your profile`;
  const html = renderEmail({
    greeting: `Hi ${seeker.first_name || "there"},`,
    viewer,
    siteUrl,
  });

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [seeker.email],
        subject,
        html,
      }),
    });
  } catch (networkErr) {
    await logEmail({
      recipient_email: seeker.email,
      email_type: "profile_view",
      subject,
      status: "failed",
      error_message: networkErr.message,
    });
    return json({ error: "Could not reach the email service." }, 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    await logEmail({
      recipient_email: seeker.email,
      email_type: "profile_view",
      subject,
      status: "failed",
      error_message: `resend ${res.status}: ${detail}`.slice(0, 500),
    });
    console.error(`[profile-view-email] Resend ${res.status}:`, detail);
    return json({ error: "The notification email could not be sent." }, res.status === 429 ? 429 : 502);
  }

  /*
   * Record the send under the day key so the duplicate check above sees it.
   * This is a real notification row rather than a side table: the seeker gets
   * one bell entry per recruiter per day either way, and reusing the table
   * avoids a second schema for the same fact.
   */
  try {
    await fetch(`${SUPABASE_URL()}/rest/v1/notifications`, {
      method: "POST",
      headers: { ...svcHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: seekerId,
        user_type: "jobseeker",
        title: "Your profile was viewed",
        message: `A recruiter from ${viewer} has viewed your profile.`,
        type: "profile_view",
        related_id: recruiter.id,
        is_read: false,
        notification_key: dayKey,
      }),
    });
  } catch {
    // The email is already out; a missing marker only risks one extra send.
  }

  await logEmail({
    recipient_email: seeker.email,
    email_type: "profile_view",
    subject,
    status: "sent",
  });

  return json({ success: true }, 200);
};

export const config = { path: "/api/profile-view-email" };
