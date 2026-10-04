/*
 * POST /api/semantic-search
 *
 *   { mode: "jobs", query?: string }
 *       Jobs ranked by meaning for the signed-in seeker. With `query`, it is the
 *       free-text search ("remote React roles, good work-life balance"); without
 *       one, jobs are ranked against the seeker's own profile embedding.
 *
 *   { mode: "applicants", job_id }
 *       Applicants of one job, ranked by similarity. Only the job's recruiter
 *       (or their org admin) may call it.
 *
 * Returns ids + similarity (0-1); the client hydrates rows through its existing
 * RLS-protected queries, so this endpoint never leaks job or profile fields.
 */
import { enforceRateLimit } from "../shared/rateLimit.mjs";
import { json, getCaller, SUPABASE_URL, SERVICE_KEY, svcHeaders, embedText, OPENAI_KEY, toVector, clean } from "../shared/ai.mjs";

const rpc = (name, args) =>
  fetch(`${SUPABASE_URL()}/rest/v1/rpc/${name}`, { method: "POST", headers: svcHeaders(), body: JSON.stringify(args) });

export default async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid request body." }, 400);
  if (!SUPABASE_URL() || !SERVICE_KEY()) return json({ error: "Server is not configured." }, 500);

  const caller = await getCaller(request);
  if (!caller) return json({ error: "Authentication required." }, 401);

  const limited = await enforceRateLimit([[`semsearch:user:${caller.id}`, 120, 3600]]);
  if (limited) return limited;

  const count = Math.min(Math.max(parseInt(body.limit, 10) || 20, 1), 50);

  if (body.mode === "jobs") {
    let vector;
    const query = clean(body.query, 300);
    if (query) {
      if (!OPENAI_KEY()) return json({ error: "AI is not configured." }, 500);
      try {
        vector = toVector(await embedText(query));
      } catch (err) {
        console.error("[semantic-search] embed:", err.message);
        return json({ error: "AI search is temporarily unavailable." }, err.status === 429 ? 429 : 502);
      }
    } else {
      const res = await fetch(`${SUPABASE_URL()}/rest/v1/profiles?id=eq.${caller.id}&select=embedding`, { headers: svcHeaders() });
      const row = res.ok ? (await res.json().catch(() => []))[0] : null;
      if (!row?.embedding) return json({ error: "Complete your profile first so we can match you.", code: "no_profile_embedding" }, 409);
      vector = row.embedding;
    }
    const r = await rpc("match_jobs", { p_embedding: vector, p_count: count });
    if (!r.ok) {
      console.error("[semantic-search] match_jobs:", r.status, (await r.text().catch(() => "")).slice(0, 200));
      return json({ error: "Search failed." }, 500);
    }
    const rows = await r.json();
    return json({ results: rows.map((x) => ({ job_id: x.job_id, similarity: Number(x.similarity.toFixed(4)) })) });
  }

  if (body.mode === "applicants") {
    const jobId = typeof body.job_id === "string" ? body.job_id : "";
    if (!jobId) return json({ error: "job_id is required." }, 400);
    const jobRes = await fetch(`${SUPABASE_URL()}/rest/v1/jobs?id=eq.${encodeURIComponent(jobId)}&select=recruiter_id`, { headers: svcHeaders() });
    const job = jobRes.ok ? (await jobRes.json().catch(() => []))[0] : null;
    if (!job) return json({ error: "Job not found." }, 404);

    let allowed = caller.id === job.recruiter_id;
    if (!allowed) {
      const t = await fetch(
        `${SUPABASE_URL()}/rest/v1/recruiter_profiles?id=eq.${encodeURIComponent(job.recruiter_id)}&org_admin_id=eq.${caller.id}&select=id`,
        { headers: svcHeaders() },
      );
      const team = t.ok ? await t.json().catch(() => []) : [];
      allowed = Array.isArray(team) && team.length > 0;
    }
    if (!allowed) return json({ error: "Not allowed." }, 403);

    const r = await rpc("match_applicants", { p_job_id: jobId, p_count: count });
    if (!r.ok) {
      console.error("[semantic-search] match_applicants:", r.status);
      return json({ error: "Ranking failed." }, 500);
    }
    const rows = await r.json();
    return json({ results: rows.map((x) => ({ profile_id: x.profile_id, similarity: Number(x.similarity.toFixed(4)) })) });
  }

  return json({ error: "mode must be 'jobs' or 'applicants'." }, 400);
};

export const config = { path: "/api/semantic-search" };
