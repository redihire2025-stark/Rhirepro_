function otpHtml(toName, toEmail, otpCode, expiryMinutes, type) {
  const isReset = type === "reset";
  const label = isReset ? "Password Reset OTP" : "Login OTP";
  const desc = isReset
    ? "Use the code below to reset your RhirePro password. Do not share this with anyone."
    : "Use the code below to complete your sign-in to RhirePro.";
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#FF2B2B;margin-bottom:4px;">RhirePro</h2>
      <p style="color:#333;">Hi <strong>${toName || toEmail}</strong>,</p>
      <p style="color:#555;">${desc}</p>
      <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <p style="color:#888;font-size:12px;margin:0 0 8px;">${label}</p>
        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#FF2B2B;">${otpCode}</span>
      </div>
      <p style="color:#666;font-size:14px;">Expires in <strong>${expiryMinutes} minutes</strong>.</p>
      <p style="color:#666;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
      <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
    </div>`;
}

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { to_email, to_name, otp_code, expiry_minutes } = await request.json();

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "RhirePro";

  if (!apiKey || !senderEmail) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to_email, name: to_name || to_email }],
      subject: `RhirePro Login OTP: ${otp_code}`,
      htmlContent: otpHtml(to_name, to_email, otp_code, expiry_minutes, "login"),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/send-otp" };
