import { createClient } from "@supabase/supabase-js";

// Best-effort log for the Super Admin "API Monitoring" module.
async function logApiRequest(supabaseUrl, serviceKey, { status_code, duration_ms, error_message }) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/api_request_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        function_name: "/api/super-admin-login", status_code, duration_ms, error_message: error_message ?? null,
      }),
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

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
  const BOOTSTRAP_EMAIL = process.env.SUPER_ADMIN_EMAIL;
  const BOOTSTRAP_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let email, password;
  try {
    const body = await request.json();
    email = (body.email || "").trim().toLowerCase();
    password = body.password || "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const isBootstrapEmail =
    !!BOOTSTRAP_EMAIL && email === BOOTSTRAP_EMAIL.trim().toLowerCase();

  try {
    const { data: existingAdmin } = await admin
      .from("super_admins")
      .select("id, email, is_active")
      .eq("email", email)
      .maybeSingle();

    if (!existingAdmin) {
      if (!isBootstrapEmail) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (password !== BOOTSTRAP_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // First-ever login with the bootstrap credentials: self-provision the
      // Supabase Auth user (create, or resync password if it already exists
      // from a prior partial attempt) plus the super_admins row.
      let userId;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "super_admin" },
      });

      if (createErr) {
        if (createErr.message?.includes("already been registered")) {
          const { data: { users } } = await admin.auth.admin.listUsers();
          const existing = users.find((u) => u.email?.toLowerCase() === email);
          if (!existing) {
            return new Response(JSON.stringify({ error: "Could not provision admin account" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          userId = existing.id;
          await admin.auth.admin.updateUserById(userId, {
            password,
            user_metadata: { role: "super_admin" },
          });
        } else {
          return new Response(JSON.stringify({ error: createErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        userId = created.user.id;
      }

      const { error: upsertErr } = await admin.from("super_admins").upsert(
        { id: userId, email, is_active: true },
        { onConflict: "id" }
      );
      if (upsertErr) {
        return new Response(JSON.stringify({ error: upsertErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else if (!existingAdmin.is_active) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Real password verification always goes through the normal Auth grant,
    // using the anon key — never the service role — for this step.
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr || !signInData.session) {
      await logApiRequest(SUPABASE_URL, SERVICE_KEY, {
        status_code: 401, duration_ms: Date.now() - requestStart, error_message: "Invalid credentials",
      });
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: finalAdmin } = await admin
      .from("super_admins")
      .select("id, is_active")
      .eq("id", signInData.user.id)
      .maybeSingle();

    if (!finalAdmin || !finalAdmin.is_active) {
      await logApiRequest(SUPABASE_URL, SERVICE_KEY, {
        status_code: 401, duration_ms: Date.now() - requestStart, error_message: "Invalid credentials",
      });
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    await admin
      .from("super_admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", finalAdmin.id);

    await logApiRequest(SUPABASE_URL, SERVICE_KEY, {
      status_code: 200, duration_ms: Date.now() - requestStart,
    });

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        user: { id: signInData.user.id, email: signInData.user.email },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    await logApiRequest(SUPABASE_URL, SERVICE_KEY, {
      status_code: 500, duration_ms: Date.now() - requestStart, error_message: err.message,
    });
    return new Response(JSON.stringify({ error: err.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/super-admin-login" };
