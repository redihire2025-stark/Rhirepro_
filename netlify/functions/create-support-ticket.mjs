import { createClient } from "@supabase/supabase-js";

// Kept in sync with CATEGORY_OPTIONS in src/app/components/SupportTicketDialog.tsx.
const CATEGORY_LABELS = {
  account: "Account & Login",
  payment: "Payments & Billing",
  job_posting: "Job Postings",
  application: "Applications",
  technical: "Technical Issue",
  other: "Something else",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);

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

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const senderEmail = process.env.RESEND_SENDER_EMAIL || process.env.VITE_RESEND_SENDER_EMAIL || "support@rhirepro.com";
  const senderName = process.env.RESEND_SENDER_NAME || process.env.VITE_RESEND_SENDER_NAME || "RhirePro";
  const supportInbox = "support@rhirepro.com";

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Server not configured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const category = CATEGORIES.includes(body.category) ? body.category : "other";
  const description = (body.description || "").trim();
  const userType = ["jobseeker", "recruiter", "guest"].includes(body.user_type) ? body.user_type : "guest";
  const userId = typeof body.user_id === "string" && body.user_id ? body.user_id : null;
  const screenshotBase64 = typeof body.screenshot_base64 === "string" ? body.screenshot_base64 : null;
  const screenshotFilename = (body.screenshot_filename || "screenshot.png").toString();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "A valid email is required." }, 400);
  }
  if (!description || description.length < 10) {
    return json({ error: "Please describe the issue in a bit more detail (at least 10 characters)." }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let screenshotPath = null;
  if (screenshotBase64) {
    try {
      const match = screenshotBase64.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
      if (match) {
        const [, mimeType, base64Data] = match;
        const buffer = Buffer.from(base64Data, "base64");
        if (buffer.length <= 5 * 1024 * 1024) {
          const ext = screenshotFilename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
          const path = `tickets/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadErr } = await admin.storage
            .from("support-attachments")
            .upload(path, buffer, { contentType: mimeType, upsert: false });
          if (!uploadErr) screenshotPath = path;
          else console.warn("[create-support-ticket] upload failed:", uploadErr.message);
        }
      }
    } catch (err) {
      console.warn("[create-support-ticket] screenshot handling failed:", err.message);
    }
  }

  const subject = CATEGORY_LABELS[category];

  const { data: ticket, error: insertErr } = await admin
    .from("support_tickets")
    .insert({
      subject,
      description,
      requester_email: email,
      requester_type: userType,
      user_id: userId,
      category,
      screenshot_path: screenshotPath,
    })
    .select("id")
    .single();

  if (insertErr || !ticket) {
    // Surfaced generically before, which made two rounds of "still failing"
    // reports impossible to diagnose without server log access. The real
    // Postgres error (e.g. a missing column from a migration that hasn't
    // been run) is safe to return here — this is an admin-support path, not
    // a place attackers would be probing, and the message never contains
    // user data beyond what was just submitted.
    console.error("[create-support-ticket] insert failed:", insertErr);
    return json(
      { error: "Could not submit your ticket. Please try again.", detail: insertErr?.message || "no ticket returned" },
      500,
    );
  }

  if (resendKey) {
    const emailSubject = `[Ticket #${ticket.id.slice(0, 8)}] ${subject} — ${userType}`;
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [supportInbox],
          reply_to: email,
          subject: emailSubject,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
              <h2 style="color:#FF2B2B;margin-bottom:4px;">New Support Ticket</h2>
              <p style="color:#888;font-size:12px;margin-top:0;">Ticket ID: ${ticket.id}</p>
              <p><strong>From:</strong> ${escapeHtml(email)} (${escapeHtml(userType)})</p>
              <p><strong>Category:</strong> ${escapeHtml(subject)}</p>
              <p><strong>Description:</strong></p>
              <p style="white-space:pre-wrap;background:#f5f5f5;border-radius:8px;padding:16px;">${escapeHtml(description)}</p>
              ${screenshotPath ? `<p style="color:#666;font-size:13px;">A screenshot was attached — view it in the Super Admin console under Support Tickets.</p>` : ""}
            </div>
          `,
        }),
      });
      await logEmail(admin, {
        recipient_email: supportInbox,
        subject: emailSubject,
        status: emailRes.ok ? "sent" : "failed",
        error_message: emailRes.ok ? null : await emailRes.text().catch(() => null),
      });
    } catch (err) {
      console.warn("[create-support-ticket] notification email failed:", err.message);
    }
  }

  return json({ success: true, ticket_id: ticket.id }, 200);
};

export const config = { path: "/api/create-support-ticket" };
