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

/*
 * Fires when a super admin cancels an org admin's subscription
 * (SuperAdminSubscriptions.tsx). Runs the DB-side unwind (job reassignment,
 * member deactivation, admin demotion — see unwind_org_admin_plan() in
 * org_plan_cancellation_migration.sql), then emails every deactivated
 * member and forces the admin's sessions to expire.
 *
 * The unwind itself is a single SQL function call and happens regardless
 * of whether the email/sign-out steps below succeed — those are
 * best-effort on top of an already-safe, already-committed data change.
 */
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

  let recruiterId;
  try {
    const body = await request.json();
    recruiterId = body.recruiter_id;
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!recruiterId) {
    return json({ error: "recruiter_id is required" }, 400);
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

  const { data: affected, error: unwindErr } = await admin.rpc("unwind_org_admin_plan", { p_admin_id: recruiterId });
  if (unwindErr) {
    return json({ error: unwindErr.message || "Failed to unwind organization" }, 500);
  }

  const members = affected || [];
  const companyName = members[0]?.company_name || "your organization";

  if (resendKey && members.length > 0) {
    const subject = "Your organization plan has ended";
    await Promise.all(
      members
        .filter((m) => m.member_email)
        .map(async (m) => {
          try {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
              body: JSON.stringify({
                from: `${senderName} <${senderEmail}>`,
                to: [m.member_email],
                subject,
                html: `
                  <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
                    <h2 style="color:#FF2B2B;margin-bottom:8px;">RhirePro</h2>
                    <p style="color:#333;">Hi ${escapeHtml(m.member_name || "there")},</p>
                    <p style="color:#333;">
                      The plan for <strong>${escapeHtml(companyName)}</strong> has ended, and you are no
                      longer participating in RhirePro through this organization.
                    </p>
                    <p style="color:#666;font-size:14px;">
                      If you'd like to continue using RhirePro on your own, please contact
                      support@rhirepro.com.
                    </p>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
                    <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
                  </div>
                `,
              }),
            });
            await logEmail(admin, {
              recipient_email: m.member_email,
              subject,
              status: emailRes.ok ? "sent" : "failed",
              error_message: emailRes.ok ? null : await emailRes.text().catch(() => null),
            });
          } catch (err) {
            await logEmail(admin, { recipient_email: m.member_email, subject, status: "failed", error_message: err.message });
          }
        }),
    );
  }

  // Best-effort — revokes the admin's existing sessions so their next
  // request needs to re-authenticate. Never let this block the response;
  // the data unwind already happened regardless.
  try {
    await admin.auth.admin.signOut(recruiterId, "global");
  } catch (err) {
    console.warn("[org-plan-cancelled] force sign-out failed:", err.message);
  }

  return json({ success: true, affected_members: members.length }, 200);
};

export const config = { path: "/api/org-plan-cancelled" };
