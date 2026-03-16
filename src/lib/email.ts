import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/** Returns true only when all three EmailJS env vars are set */
export const isEmailConfigured = () =>
  !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

/**
 * Sends the OTP to `toEmail` via EmailJS.
 * Template must have variables: to_email, to_name, otp_code, expiry_minutes
 */
export async function sendOTPEmail(
  toEmail: string,
  otp: string,
  name?: string
): Promise<void> {
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: toEmail,
      to_name: name || toEmail,
      otp_code: otp,
      expiry_minutes: 10,
    },
    { publicKey: PUBLIC_KEY }
  );
}
