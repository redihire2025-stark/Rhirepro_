/** Always true — Brevo runs server-side via local email server / Netlify Function */
export const isEmailConfigured = () => true;

/** Send Login OTP email (OTP generated client-side, just delivers it) */
export async function sendOTPEmail(toEmail: string, otp: string, name?: string): Promise<void> {
  const res = await fetch("/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_email: toEmail, to_name: name || toEmail, otp_code: otp, expiry_minutes: 10 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to send login OTP email");
  }
}

/** Send Password Reset OTP (OTP generated & stored server-side) */
export async function sendPasswordResetOTP(
  email: string,
  userType: "jobseeker" | "recruiter"
): Promise<void> {
  const res = await fetch("/api/send-reset-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, user_type: userType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to send password reset OTP");
  }
}

/** Verify OTP and reset password (all handled server-side) */
export async function resetPasswordWithOTP(
  email: string,
  otp: string,
  newPassword: string,
  userType: "jobseeker" | "recruiter"
): Promise<void> {
  const res = await fetch("/api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, new_password: newPassword, user_type: userType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to reset password");
  }
}
