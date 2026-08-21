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
      fetch(`${supabaseUrl}/rest/v1/recruiter_profiles?email=ilike.${encodeURIComponent(cleanEmail)}&select=id`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      }),
    ]);

    const pData = pRes.ok ? await pRes.json() : [];
    const rData = rRes.ok ? await rRes.json() : [];

    const exists = !!((pData && pData.length > 0) || (rData && rData.length > 0));

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
