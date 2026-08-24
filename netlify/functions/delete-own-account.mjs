import { createClient } from "@supabase/supabase-js";

/*
 * Self-service account deletion for job seekers and recruiters. Deletes the
 * auth user via the service role (the only role allowed to do that — the
 * browser has no permission), which cascades the profiles/jobseeker or
 * recruiter row via its `on delete cascade` FK to auth.users.
 *
 * The caller can only ever delete the account their own token belongs to —
 * there is no id parameter accepted from the client, deliberately, so this
 * can never be pointed at someone else's account.
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

  // An org admin deleting themselves would strand every team member's
  // seats/subscription with no owner — point them at removing members
  // first (or handing off adminship) rather than silently orphaning a team.
  const { data: profile } = await admin
    .from("recruiter_profiles")
    .select("is_org_admin, org_role, max_seats")
    .eq("id", callerUser.user.id)
    .maybeSingle();

  if (profile && (profile.is_org_admin || (profile.org_role === "admin" && (profile.max_seats ?? 0) > 5))) {
    const { count } = await admin
      .from("recruiter_profiles")
      .select("id", { count: "exact", head: true })
      .eq("org_admin_id", callerUser.user.id);
    if ((count ?? 0) > 0) {
      return new Response(
        JSON.stringify({ error: "Remove or transfer your team members before deleting your admin account." }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(callerUser.user.id);
  if (deleteErr) {
    return new Response(JSON.stringify({ error: deleteErr.message || "Failed to delete account" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Belt and braces in case a cascade did not fire for some reason.
  await Promise.all([
    admin.from("recruiter_profiles").delete().eq("id", callerUser.user.id),
    admin.from("profiles").delete().eq("id", callerUser.user.id),
  ]);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/delete-own-account" };
