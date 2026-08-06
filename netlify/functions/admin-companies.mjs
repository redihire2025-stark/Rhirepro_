import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  const jsonHeader = { "Content-Type": "application/json" };

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: jsonHeader,
    });
  }

  // Authorize Super Admin
  const authHeader = request.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: jsonHeader,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerUser, error: callerErr } = await supabase.auth.getUser(callerToken);
  if (callerErr || !callerUser?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: jsonHeader,
    });
  }

  const { data: callerAdmin } = await supabase
    .from("super_admins")
    .select("id, email, is_active")
    .eq("id", callerUser.user.id)
    .maybeSingle();

  if (!callerAdmin || !callerAdmin.is_active) {
    return new Response(JSON.stringify({ error: "Not authorized as Super Admin" }), {
      status: 403,
      headers: jsonHeader,
    });
  }

  // Parse path parameters
  // Paths:
  // /admin/companies or /api/admin/companies
  // /admin/companies/:id or /api/admin/companies/:id
  // /admin/companies/:id/verify or /api/admin/companies/:id/verify
  // /admin/companies/:id/reject or /api/admin/companies/:id/reject

  const cleanPath = path.replace(/^\/api/, "");
  const parts = cleanPath.split("/").filter(Boolean); // ['admin', 'companies', ...]

  // Match /admin/companies
  if (parts.length >= 2 && parts[0] === "admin" && parts[1] === "companies") {
    const subRoute = parts.slice(2); // [] or [id] or [id, 'verify'] or [id, 'reject']
    const statusParam = url.searchParams.get("status");

    // GET /admin/companies or /admin/companies?status=pending
    if (subRoute.length === 0 && request.method === "GET") {
      let query = supabase.from("recruiter_profiles").select(`
        id, email, recruiter_name, company_name, industry, location, website, phone, cin,
        verification_status, rejection_reason, rejected_at, rejected_by, verified_at, verified_by, created_at
      `);

      if (statusParam) {
        const formattedStatus = statusParam.charAt(0).toUpperCase() + statusParam.slice(1).toLowerCase();
        query = query.eq("verification_status", formattedStatus);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeader });
      }

      return new Response(JSON.stringify({ companies: data }), { status: 200, headers: jsonHeader });
    }

    // Single company operations
    if (subRoute.length >= 1) {
      const companyIdentifier = decodeURIComponent(subRoute[0]);

      // GET /admin/companies/:id
      if (subRoute.length === 1 && request.method === "GET") {
        const { data, error } = await supabase
          .from("recruiter_profiles")
          .select("*")
          .or(`id.eq.${companyIdentifier},company_name.ilike.${companyIdentifier}`)
          .limit(10);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeader });
        }
        return new Response(JSON.stringify({ company: data?.[0] || null, all_recruiters: data }), {
          status: 200,
          headers: jsonHeader,
        });
      }

      // PATCH /admin/companies/:id/verify
      if (subRoute.length === 2 && subRoute[1] === "verify" && request.method === "PATCH") {
        const updateData = {
          verification_status: "Verified",
          verified_at: new Date().toISOString(),
          verified_by: callerUser.user.id,
          rejection_reason: null,
        };

        const { data, error } = await supabase
          .from("recruiter_profiles")
          .update(updateData)
          .or(`id.eq.${companyIdentifier},company_name.ilike.${companyIdentifier}`)
          .select();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeader });
        }

        // Audit log
        await supabase.from("admin_audit_log").insert({
          actor_id: callerUser.user.id,
          actor_email: callerAdmin.email || callerUser.user.email,
          action: `Verified company ${companyIdentifier}`,
          entity_type: "company",
          entity_id: companyIdentifier,
          after_value: { verification_status: "Verified" },
        });

        return new Response(JSON.stringify({ message: "Company verified successfully", data }), {
          status: 200,
          headers: jsonHeader,
        });
      }

      // PATCH /admin/companies/:id/reject
      if (subRoute.length === 2 && subRoute[1] === "reject" && request.method === "PATCH") {
        let reason = "Company verification rejected by Super Admin";
        try {
          const body = await request.json();
          if (body?.reason) reason = body.reason;
        } catch {
          // fallback default reason
        }

        const updateData = {
          verification_status: "Rejected",
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejected_by: callerUser.user.id,
        };

        const { data, error } = await supabase
          .from("recruiter_profiles")
          .update(updateData)
          .or(`id.eq.${companyIdentifier},company_name.ilike.${companyIdentifier}`)
          .select();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeader });
        }

        // Audit log
        await supabase.from("admin_audit_log").insert({
          actor_id: callerUser.user.id,
          actor_email: callerAdmin.email || callerUser.user.email,
          action: `Rejected company ${companyIdentifier}`,
          entity_type: "company",
          entity_id: companyIdentifier,
          after_value: { verification_status: "Rejected", rejection_reason: reason },
        });

        return new Response(JSON.stringify({ message: "Company rejected successfully", data }), {
          status: 200,
          headers: jsonHeader,
        });
      }
    }
  }

  return new Response(JSON.stringify({ error: "Endpoint not found" }), {
    status: 404,
    headers: jsonHeader,
  });
}

export const config = { path: ["/admin/companies", "/admin/companies/*", "/api/admin/companies", "/api/admin/companies/*"] };
