/*
 * Rate limiting backed by public.check_rate_limit (supabase/rate_limits.sql).
 *
 * Fails OPEN on infrastructure errors (migration not run, Supabase blip): a
 * limiter outage must not lock every user out of sign-in. The cost of that
 * choice is that protection silently disappears, so it is logged loudly.
 */

const supabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export function clientIp(request) {
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

/** @returns {Promise<{allowed:boolean, retryAfter:number}>} */
export async function checkRateLimit(key, limit, windowSeconds) {
  if (!supabaseUrl() || !serviceKey()) return { allowed: true, retryAfter: 0 };
  try {
    const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        apikey: serviceKey(),
        Authorization: `Bearer ${serviceKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
    });
    if (!res.ok) {
      console.error(`[rateLimit] check failed (${res.status}) — failing open for ${key}`);
      return { allowed: true, retryAfter: 0 };
    }
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { allowed: row?.allowed !== false, retryAfter: row?.retry_after ?? windowSeconds };
  } catch (err) {
    console.error("[rateLimit] threw — failing open:", err.message);
    return { allowed: true, retryAfter: 0 };
  }
}

/**
 * Check one or more (key, limit, window) rules; returns a 429 Response when any
 * is exceeded, otherwise null.
 */
export async function enforceRateLimit(rules) {
  for (const [key, limit, windowSeconds] of rules) {
    const { allowed, retryAfter } = await checkRateLimit(key, limit, windowSeconds);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please wait and try again.", retry_after: retryAfter }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
      );
    }
  }
  return null;
}
