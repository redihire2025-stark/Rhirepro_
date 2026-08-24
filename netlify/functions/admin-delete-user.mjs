import { createClient } from "@supabase/supabase-js";

/*
 * Super Admin-only permanent account deletion, for a recruiter or job
 * seeker (not a super admin — that's a separate, more sensitive surface
 * this deliberately does not touch). Deletes the auth user via the service
 * role, which cascades the matching profiles/recruiter_profiles row via its
 * `on delete cascade` FK — only a server function can do this, the browser
 * has no permission to delete auth users.
 */
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = request.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let userId;
  try {
    const body = await request.json();
    userId = body.user_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: "user_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerUser, error: callerErr } = await admin.auth.getUser(callerToken);
  if (callerErr || !callerUser?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: callerAdmin } = await admin
    .from("super_admins")
    .select("id, is_active")
    .eq("id", callerUser.user.id)
    .maybeSingle();
  if (!callerAdmin || !callerAdmin.is_active) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Refuse to delete another super admin through this path — that's a
  // separate, more sensitive action with its own surface, not this one.
  const { data: targetAdmin } = await admin
    .from("super_admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (targetAdmin) {
    return new Response(
      JSON.stringify({ error: "Cannot delete a super admin account through this action." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return new Response(JSON.stringify({ error: deleteErr.message || "Failed to delete account" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Belt and braces in case a cascade did not fire for some reason.
  await Promise.all([
    admin.from("recruiter_profiles").delete().eq("id", userId),
    admin.from("profiles").delete().eq("id", userId),
  ]);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/admin-delete-user" };
