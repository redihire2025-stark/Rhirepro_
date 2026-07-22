import { randomBytes } from "crypto";

// Best-effort log for the Super Admin "Emails" module — never allowed to
// break the actual send if it fails (e.g. table not migrated yet).
async function logEmail(supabaseUrl, serviceKey, { recipient_email, email_type, subject, status, error_message }) {
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

  const { org_admin_id, company_name, invited_email, invited_by_name } =
    await request.json();

  if (!org_admin_id || !company_name || !invited_email) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "RhirePro";
  // DEPLOY_PRIME_URL resolves correctly per-context: the dev branch's stable URL on
  // branch deploys, and the production URL on production deploys. URL alone always
  // points at production, which broke invite links sent while testing on a preview
  // deploy — the link pointed at production instead of the branch that sent it.
  const siteUrl =
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    process.env.DEPLOY_URL ||
    "https://rhirepro.netlify.app";

  if (!supabaseUrl || !serviceKey || !brevoKey || !senderEmail) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch org admin profile to verify email domains match
  const adminRes = await fetch(
    `${supabaseUrl}/rest/v1/recruiter_profiles?id=eq.${org_admin_id}&select=email`,
    {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!adminRes.ok) {
    const err = await adminRes.text();
    return new Response(
      JSON.stringify({ error: `Failed to fetch admin profile: ${err}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const adminProfiles = await adminRes.json();
  if (!adminProfiles || adminProfiles.length === 0) {
    return new Response(
      JSON.stringify({ error: "Org admin profile not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const adminEmail = adminProfiles[0].email;
  const adminDomain = adminEmail.split("@")[1]?.toLowerCase();
  const inviteDomain = invited_email.split("@")[1]?.toLowerCase();

  if (!adminDomain || !inviteDomain || adminDomain !== inviteDomain) {
    return new Response(
      JSON.stringify({ error: `You can only invite users with a matching email domain (@${adminDomain || ""})` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 1. Generate token and insert invitation into DB via service role (bypasses RLS)
  const token = randomBytes(32).toString("hex");

  const insertRes = await fetch(
    `${supabaseUrl}/rest/v1/recruiter_invitations`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        org_admin_id,
        company_name,
        invited_email: invited_email.toLowerCase().trim(),
        token,
        role: "member",
        status: "pending",
      }),
    }
  );

  if (!insertRes.ok) {
    const err = await insertRes.text();
    return new Response(
      JSON.stringify({ error: `DB insert failed: ${err}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Send invitation email via Brevo
  const inviteUrl = `${siteUrl}/recruiter/join/${token}`;
  const adminName = invited_by_name || company_name;

  const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevoKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: invited_email }],
      subject: `${adminName} invited you to join ${company_name} on RhirePro`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
          <h2 style="color:#FF2B2B;margin-bottom:4px;">RhirePro</h2>
          <p style="color:#8A8A8A;font-size:12px;margin-top:0;">Recruiter Platform</p>

          <div style="background:#fff;border:1px solid #f0f0f0;border-radius:16px;padding:32px;margin-top:24px;">
            <h3 style="color:#3A1F1F;margin-top:0;">You've been invited! 🎉</h3>
            <p style="color:#555;line-height:1.6;">
              <strong>${adminName}</strong> has invited you to join
              <strong>${company_name}</strong> as a recruiter on RhirePro.
            </p>
            <p style="color:#555;line-height:1.6;">
              Click the button below to set up your account and start collaborating
              with your team.
            </p>

            <div style="text-align:center;margin:32px 0;">
              <a href="${inviteUrl}"
                 style="background:#FF2B2B;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:600;font-size:15px;display:inline-block;">
                Accept Invitation
              </a>
            </div>

            <p style="color:#888;font-size:13px;">
              Or copy this link into your browser:<br/>
              <a href="${inviteUrl}" style="color:#FF2B2B;word-break:break-all;">${inviteUrl}</a>
            </p>
          </div>

          <p style="color:#bbb;font-size:12px;margin-top:24px;text-align:center;">
            This invitation expires in 7 days. If you didn't expect this,
            you can safely ignore this email.
          </p>
          <p style="color:#bbb;font-size:12px;text-align:center;">— The RhirePro Team</p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    await logEmail(supabaseUrl, serviceKey, {
      recipient_email: invited_email,
      email_type: "invite",
      subject: `${adminName} invited you to join ${company_name} on RhirePro`,
      status: "failed",
      error_message: err,
    });
    await logApiRequest(supabaseUrl, serviceKey, {
      function_name: "/api/send-invite", status_code: 500, duration_ms: Date.now() - requestStart, error_message: err,
    });
    return new Response(
      JSON.stringify({ error: `Email send failed: ${err}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  await logEmail(supabaseUrl, serviceKey, {
    recipient_email: invited_email,
    email_type: "invite",
    subject: `${adminName} invited you to join ${company_name} on RhirePro`,
    status: "sent",
  });
  await logApiRequest(supabaseUrl, serviceKey, {
    function_name: "/api/send-invite", status_code: 200, duration_ms: Date.now() - requestStart,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/send-invite" };
