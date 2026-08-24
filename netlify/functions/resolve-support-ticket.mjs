import { createClient } from "@supabase/supabase-js";

const json = (payload, status) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

const escapeHtml = (str) =>
  String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function logEmail(admin, { recipient_email, subject, status, error_message }) {
  try {
    await admin.from("email_logs").insert({
      recipient_email, email_type: "other", subject, status, error_message: error_message ?? null,
    });
  } catch {
    // Logging is best-effort only.
  }
}

// Marks a ticket resolved and emails the submitter the (optional) summary —
// only a super admin may call this. The summary is deliberately optional per
// spec: a ticket can be closed with just a generic "resolved" notice.
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const senderEmail = process.env.RESEND_SENDER_EMAIL || process.env.VITE_RESEND_SENDER_EMAIL || "support@rhirepro.com";
  const senderName = process.env.RESEND_SENDER_NAME || process.env.VITE_RESEND_SENDER_NAME || "RhirePro";

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Server not configured" }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) {
    return json({ error: "Not authenticated" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const ticketId = body.ticket_id;
  const summary = (body.summary || "").trim();
  if (!ticketId) {
    return json({ error: "ticket_id is required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerUser, error: callerErr } = await admin.auth.getUser(callerToken);
  if (callerErr || !callerUser?.user) {
    return json({ error: "Not authenticated" }, 401);
  }

  const { data: callerAdmin } = await admin
    .from("super_admins")
    .select("id, is_active")
    .eq("id", callerUser.user.id)
    .maybeSingle();
  if (!callerAdmin || !callerAdmin.is_active) {
    return json({ error: "Not authorized" }, 403);
  }

  // resolved_at is set automatically by the support_tickets_updated_at
  // trigger the moment status flips to 'resolved' — no need to set it here.
  // assigned_admin_id doubles as "who resolved this" for this simple
  // one-shot resolve flow (there's no separate reply thread).
  const { data: ticket, error: ticketErr } = await admin
    .from("support_tickets")
    .update({
      status: "resolved",
      resolution_summary: summary || null,
      assigned_admin_id: callerUser.user.id,
    })
    .eq("id", ticketId)
    .select("id, requester_email, subject")
    .single();

  if (ticketErr || !ticket) {
    return json({ error: "Could not update ticket." }, 500);
  }
  if (!ticket.requester_email) {
    // Manually-logged tickets (the internal admin tool) may have no requester
    // email at all — nothing to send in that case.
    return json({ success: true }, 200);
  }

  if (resendKey) {
    const emailSubject = "Your support ticket has been resolved";
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [ticket.requester_email],
          subject: emailSubject,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
              <h2 style="color:#FF2B2B;margin-bottom:8px;">RhirePro Support</h2>
              <p style="color:#333;">Hi,</p>
              <p style="color:#333;">Your support ticket regarding <strong>${escapeHtml(ticket.subject || "your issue")}</strong> has been resolved.</p>
              ${summary
                ? `<div style="background:#f5f5f5;border-radius:12px;padding:16px;margin:20px 0;"><p style="margin:0;white-space:pre-wrap;color:#333;">${escapeHtml(summary)}</p></div>`
                : ""}
              <p style="color:#666;font-size:14px;">If this didn't fully resolve your issue, just reply to this email or raise a new ticket.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
              <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
            </div>
          `,
        }),
      });
      await logEmail(admin, {
        recipient_email: ticket.requester_email,
        subject: emailSubject,
        status: emailRes.ok ? "sent" : "failed",
        error_message: emailRes.ok ? null : await emailRes.text().catch(() => null),
      });
    } catch (err) {
      console.warn("[resolve-support-ticket] resolution email failed:", err.message);
    }
  }

  return json({ success: true }, 200);
};

export const config = { path: "/api/resolve-support-ticket" };
