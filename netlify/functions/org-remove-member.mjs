import { createClient } from "@supabase/supabase-js";

/*
 * Removing someone from a team used to just null out org_admin_id, which
 * quietly turned them into a free-standing account — they never signed up
 * as an independent user, so that let a removed member keep using the
 * platform under the org's old data for free. This deletes the account
 * outright: the auth user (which cascades recruiter_profiles via its
 * `on delete cascade` FK) via the service role, which only a server
 * function can do — the browser has no permission to delete auth users.
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

  let memberId;
  try {
    const body = await request.json();
    memberId = body.member_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!memberId) {
    return new Response(JSON.stringify({ error: "member_id is required" }), {
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

  // The caller must be the org admin this member actually belongs to —
  // never trust a client-supplied "I'm the admin" claim for a destructive,
  // irreversible action like this one.
  const { data: member, error: memberErr } = await admin
    .from("recruiter_profiles")
    .select("id, org_admin_id")
    .eq("id", memberId)
    .maybeSingle();

  if (memberErr || !member) {
    return new Response(JSON.stringify({ error: "Member not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (member.org_admin_id !== callerUser.user.id) {
    return new Response(JSON.stringify({ error: "Not authorized to remove this member" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(memberId);
  if (deleteErr) {
    return new Response(JSON.stringify({ error: deleteErr.message || "Failed to delete account" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Belt and braces in case the FK cascade did not fire for some reason.
  await admin.from("recruiter_profiles").delete().eq("id", memberId);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/org-remove-member" };
