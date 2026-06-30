import { randomBytes } from "crypto";

export default async (request) => {
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
  const siteUrl =
    process.env.URL ||
    process.env.DEPLOY_URL ||
    "https://rhirepro.netlify.app";

  if (!supabaseUrl || !serviceKey || !brevoKey || !senderEmail) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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
    return new Response(
      JSON.stringify({ error: `Email send failed: ${err}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/send-invite" };
