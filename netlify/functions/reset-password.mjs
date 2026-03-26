import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { email, otp, new_password, user_type } = await request.json();

  try {
    const admin = adminClient();
    const table = user_type === "recruiter" ? "recruiter_profiles" : "profiles";

    const { data: user, error: lookupErr } = await admin
      .from(table).select("id, otp_code, otp_expires_at").eq("email", email).single();

    if (lookupErr || !user) {
      return new Response(JSON.stringify({ error: "No account found with this email address." }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    if (!user.otp_code) {
      return new Response(JSON.stringify({ error: "No OTP found. Please request a new one." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP has expired. Please request a new one." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    if (user.otp_code !== otp) {
      return new Response(JSON.stringify({ error: "Invalid OTP. Please try again." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, { password: new_password });
    if (updateErr) throw new Error("Failed to update password: " + updateErr.message);

    await admin.from(table).update({ otp_code: null, otp_expires_at: null }).eq("id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/reset-password" };
