import bcrypt from "bcryptjs";
import crypto from "crypto";
import { enforceRateLimit, clientIp } from "../shared/rateLimit.mjs";

// Best-effort log for the Super Admin "Emails" module — never allowed to
// break the actual send if it fails (e.g. table not migrated yet).
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

// Best-effort log for the Super Admin "API Monitoring" module.
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

/**
 * Remove a declined recruiter so the email address is free to sign up again.
 * Deleting the auth user cascades the recruiter_profiles row, so that is the
 * only call needed. Returns false on failure so the caller can refuse the
 * signup rather than leaving the applicant stuck at "already exists".
 */
async function purgeRecruiter(supabaseUrl, serviceKey, recruiterId) {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${recruiterId}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok && res.status !== 404) {
      console.error(`[send-otp] purge of declined recruiter ${recruiterId} failed: ${res.status}`);
      return false;
    }
    // Belt and braces: if the cascade did not fire, clear the profile directly.
    await fetch(`${supabaseUrl}/rest/v1/recruiter_profiles?id=eq.${recruiterId}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "return=minimal" },
    });
    return true;
  } catch (err) {
    console.error("[send-otp] purge threw:", err.message);
    return false;
  }
}

const json = (payload, status) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Upsert the hashed OTP into pending_otps. `on_conflict=email` is required —
// without it PostgREST targets the primary key, which is a fresh uuid on every
// call, so the row never merges and the email UNIQUE constraint rejects it (409),
// leaving the *previous* OTP in place for verify-otp to compare against.
async function upsertPendingOtp(supabaseUrl, serviceKey, { email, otpHash, expiresAt }) {
  const res = await fetch(`${supabaseUrl}/rest/v1/pending_otps?on_conflict=email`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ email, otp_code: otpHash, otp_expires_at: expiresAt }),
  });
  if (!res.ok) {
    throw new Error(`pending_otps upsert failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
}

// Resend's documented default account limit is 2 requests/second, so a burst of
// concurrent signups will trip it. Retry the transient failures (429 / 5xx)
// rather than surfacing them to the user.
async function sendWithRetry(payload, resendKey, attempts = 3) {
  let last = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      const backoff = 400 * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }

    let res;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      // DNS / TLS / socket failure — retryable, and must never escape as a throw.
      last = { status: 0, message: `Could not reach the email service: ${networkErr.message}` };
      continue;
    }

    if (res.ok) return { ok: true };

    const errText = await res.text().catch(() => "");
    let message = errText;
    try {
      const parsed = JSON.parse(errText);
      message = parsed.message || parsed.error || errText;
    } catch {
      // Non-JSON error body — keep the raw text.
    }
    last = { status: res.status, message };

    // Any 4xx other than rate limiting will fail identically on retry.
    if (res.status !== 429 && res.status < 500) break;
  }
  return { ok: false, ...last };
}

// Translate an upstream Resend failure into a status code that tells the caller
// what to actually do, instead of collapsing everything into a 500.
function mapResendStatus(status) {
  if (status === 429) return 429;                   // caller should back off and retry
  if (status === 422 || status === 400) return 400; // bad recipient address
  if (status === 401 || status === 403) return 500; // our key or sending domain is misconfigured
  return 502;                                       // upstream down or unreachable
}

export default async (request) => {
  const requestStart = Date.now();

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const limited = await enforceRateLimit([[`otp-send:ip:${clientIp(request)}`, 20, 3600]]);
  if (limited) return limited;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const finish = async (payload, status, errorMessage) => {
    await logApiRequest(supabaseUrl, serviceKey, {
      function_name: "/api/send-otp",
      status_code: status,
      duration_ms: Date.now() - requestStart,
      error_message: errorMessage,
    });
    return json(payload, status);
  };

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return finish({ error: "Invalid request body." }, 400, "Malformed JSON body");
  }

  const { to_email, to_name, user_type, purpose, check_signup } = body;
  const cleanEmail = (to_email || "").trim().toLowerCase();

  const limitedEmail = cleanEmail ? await enforceRateLimit([[`otp-send:email:${cleanEmail}`, 5, 900]]) : null;
  if (limitedEmail) return limitedEmail;

  if (!cleanEmail) {
    return finish({ error: "Email is required" }, 400, "Missing email");
  }

  const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const senderEmail = process.env.RESEND_SENDER_EMAIL || process.env.VITE_RESEND_SENDER_EMAIL || "support@rhirepro.com";
  const senderName = process.env.RESEND_SENDER_NAME || process.env.VITE_RESEND_SENDER_NAME || "RhirePro";

  const isSignup = Boolean(check_signup || purpose === "signup");

  try {
    if (isSignup && supabaseUrl && serviceKey) {
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/profiles?email=ilike.${encodeURIComponent(cleanEmail)}&select=id`, {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          }),
          fetch(`${supabaseUrl}/rest/v1/recruiter_profiles?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,verification_status,is_disabled`, {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          }),
        ]);
        const pData = pRes.ok ? await pRes.json() : [];
        const rData = rRes.ok ? await rRes.json() : [];

        // A declined recruiter is allowed to apply again. Their old record is
        // unusable — sign-in refuses anything that is not 'Verified' — but it
        // still occupies the email address, so without this they hit "an
        // account already exists" and can never reapply. The decline itself
        // stays on record in admin_audit_log.
        //
        // Disabled accounts are deliberately NOT purged: an administrator
        // switched that off, and letting the person re-register with the same
        // address would make disabling meaningless.
        const declined = Array.isArray(rData)
          ? rData.find((r) => r.verification_status === "Rejected" && r.is_disabled !== true)
          : null;

        if (declined && (!pData || pData.length === 0)) {
          const purged = await purgeRecruiter(supabaseUrl, serviceKey, declined.id);
          if (!purged) {
            return finish(
              { error: "We couldn't reopen your application. Please contact support@rhirepro.com." },
              500,
              "Declined recruiter purge failed",
            );
          }
          // Fall through: the address is free, so signup continues normally and
          // the new account starts at 'Pending' for approval like any other.
        } else if ((pData && pData.length > 0) || (rData && rData.length > 0)) {
          const disabled = Array.isArray(rData) ? rData.some((r) => r.is_disabled === true) : false;
          return finish(
            {
              error: disabled
                ? "This account has been disabled. Please contact support@rhirepro.com."
                : "An account with this email already exists. Please sign in.",
            },
            400,
            disabled ? "Disabled account signup attempt" : "Duplicate signup email",
          );
        }
      } catch (checkErr) {
        console.warn("[send-otp] Email check failed:", checkErr.message);
      }
    }

    // Generate 6-digit OTP server-side & pre-hash with SHA-256 before bcrypt
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const sha256Otp = crypto.createHash("sha256").update(generatedOtp).digest("hex");
    const otpHash = bcrypt.hashSync(sha256Otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store hashed OTP in Supabase DB. A failure here means the user would get a
    // code that can never verify, so it is a hard failure rather than a warning.
    if (supabaseUrl && serviceKey) {
      if (isSignup) {
        await upsertPendingOtp(supabaseUrl, serviceKey, { email: cleanEmail, otpHash, expiresAt });
      } else {
        // Update existing user profile in profiles or recruiter_profiles
        const targetTable = user_type === "recruiter" ? "recruiter_profiles" : "profiles";
        const fallbackTable = targetTable === "profiles" ? "recruiter_profiles" : "profiles";

        const patchOtp = async (table) => {
          const res = await fetch(`${supabaseUrl}/rest/v1/${table}?email=ilike.${encodeURIComponent(cleanEmail)}`, {
            method: "PATCH",
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({ otp_code: otpHash, otp_expires_at: expiresAt }),
          });
          if (!res.ok) {
            console.warn(`[send-otp] ${table} OTP update failed (${res.status}):`, await res.text().catch(() => ""));
            return 0;
          }
          const data = await res.json().catch(() => []);
          return Array.isArray(data) ? data.length : 0;
        };

        let updatedCount = await patchOtp(targetTable);

        // If targetTable updated 0 rows, attempt fallback to the other table
        if (updatedCount === 0) {
          updatedCount = await patchOtp(fallbackTable);
        }

        // If the user is in neither profiles nor recruiter_profiles, store in pending_otps
        if (updatedCount === 0) {
          await upsertPendingOtp(supabaseUrl, serviceKey, { email: cleanEmail, otpHash, expiresAt });
        }
      }
    }

    if (!resendKey) {
      return finish(
        { error: "Email service is not configured. Please contact support." },
        500,
        "RESEND_API_KEY missing from the environment",
      );
    }

    const result = await sendWithRetry(
      {
        from: `${senderName} <${senderEmail}>`,
        to: [cleanEmail],
        subject: `Your RhirePro Verification Code`,
        html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#FF2B2B;margin-bottom:8px;">RhirePro</h2>
          <p style="color:#333;">Hi <strong>${to_name || cleanEmail}</strong>,</p>
          <p style="color:#333;">Your verification code is:</p>
          <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#FF2B2B;">${generatedOtp}</span>
          </div>
          <p style="color:#666;font-size:14px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color:#666;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#aaa;font-size:12px;">— The RhirePro Team</p>
        </div>
      `,
      },
      resendKey,
    );

    if (!result.ok) {
      const status = mapResendStatus(result.status);
      const detail = `resend ${result.status}: ${result.message}`;
      await logEmail(supabaseUrl, serviceKey, {
        recipient_email: cleanEmail,
        email_type: "otp",
        subject: "Your RhirePro Verification Code",
        status: "failed",
        error_message: detail,
      });
      const userMessage =
        status === 429
          ? "Too many requests right now. Please wait a moment and try again."
          : status === 400
            ? "We couldn't send to that email address. Please check it and try again."
            : "We couldn't send your verification code. Please try again in a moment.";
      return finish({ error: userMessage }, status, detail);
    }

    await logEmail(supabaseUrl, serviceKey, {
      recipient_email: cleanEmail,
      email_type: "otp",
      subject: "Your RhirePro Verification Code",
      status: "sent",
    });

    return finish({ success: true }, 200);
  } catch (err) {
    // Nothing above may escape as an unhandled throw — the runtime would turn it
    // into a bodiless 500 that the client cannot explain to the user.
    console.error("[send-otp] Unhandled error:", err);
    return finish(
      { error: "We couldn't send your verification code. Please try again in a moment." },
      500,
      err?.message || String(err),
    );
  }
};

export const config = { path: "/api/send-otp" };
