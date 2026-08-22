// Netlify Serverless Function for Checking Existing Accounts by Email
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { email } = await request.json().catch(() => ({}));
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail) {
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

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

    // A declined recruiter may apply again, so their stale record must not read
    // as "already exists" — that pre-check runs before send-otp and would block
    // the signup form outright. send-otp purges the old record and starts them
    // fresh at 'Pending'. Kept in step with the same rule there: a *disabled*
    // account still counts as existing, because an administrator turned it off
    // and re-registering the same address would undo that.
    const blockingRecruiters = Array.isArray(rData)
      ? rData.filter((r) => !(r.verification_status === "Rejected" && r.is_disabled !== true))
      : [];

    const exists = !!((pData && pData.length > 0) || blockingRecruiters.length > 0);

    return new Response(JSON.stringify({ exists }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[check-email] Exception:", err.message);
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/check-email" };
