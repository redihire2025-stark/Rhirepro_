/*
 * POST /api/embed-sync   { kind: "profile" | "job", id }
 *
 * (Re)computes the Gemini embedding for a profile or job and stores it for
 * semantic matching. Call it after a profile save or job post/edit. It is a
 * no-op when the embedded text has not changed (content hash), so calling it
 * liberally costs nothing.
 *
 * Authorisation: a profile may only be embedded by its owner; a job only by the
 * recruiter who owns it (or the org admin above them).
 */
import { enforceRateLimit } from "../shared/rateLimit.mjs";
import {
  json, getCaller, SUPABASE_URL, SERVICE_KEY, svcHeaders, sha256,
  embedText, toVector, profileEmbeddingText, jobEmbeddingText,
} from "../shared/ai.mjs";

const PROFILE_COLS = "id,headline,current_title,current_company,total_experience,location,skills,about,embedding_hash";
const JOB_COLS = "id,recruiter_id,title,department,industry,location,work_mode,employment_type,experience_min,experience_max,skills,description,requirements,embedding_hash";

export default async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await request.json().catch(() => null);
  const { kind, id } = body || {};
  if (!["profile", "job"].includes(kind) || typeof id !== "string" || !id) {
    return json({ error: "kind ('profile'|'job') and id are required." }, 400);
  }
  if (!SUPABASE_URL() || !SERVICE_KEY()) return json({ error: "Server is not configured." }, 500);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: "AI is not configured." }, 500);

  const caller = await getCaller(request);
  if (!caller) return json({ error: "Authentication required." }, 401);

  const limited = await enforceRateLimit([[`embed:user:${caller.id}`, 60, 3600]]);
  if (limited) return limited;

  const table = kind === "profile" ? "profiles" : "jobs";
  const rowRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=${kind === "profile" ? PROFILE_COLS : JOB_COLS}`,
    { headers: svcHeaders() },
  );
  const row = rowRes.ok ? (await rowRes.json().catch(() => []))[0] : null;
  if (!row) return json({ error: `${kind} not found.` }, 404);

  let allowed = kind === "profile" ? caller.id === id : caller.id === row.recruiter_id;
  if (!allowed && kind === "job") {
    const teamRes = await fetch(
      `${SUPABASE_URL()}/rest/v1/recruiter_profiles?id=eq.${encodeURIComponent(row.recruiter_id)}&org_admin_id=eq.${encodeURIComponent(caller.id)}&select=id`,
      { headers: svcHeaders() },
    );
    const team = teamRes.ok ? await teamRes.json().catch(() => []) : [];
    allowed = Array.isArray(team) && team.length > 0;
  }
  if (!allowed) return json({ error: "Not allowed." }, 403);

  const text = kind === "profile" ? profileEmbeddingText(row) : jobEmbeddingText(row);
  if (text.length < 20) return json({ status: "skipped", reason: "Not enough content to embed yet." }, 200);

  const hash = await sha256(text);
  if (row.embedding_hash === hash) return json({ status: "unchanged" }, 200);

  try {
    const values = await embedText(apiKey, text, "RETRIEVAL_DOCUMENT");
    const patch = await fetch(`${SUPABASE_URL()}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...svcHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ embedding: toVector(values), embedding_hash: hash, embedding_updated_at: new Date().toISOString() }),
    });
    if (!patch.ok) {
      console.error("[embed-sync] write failed:", patch.status, (await patch.text().catch(() => "")).slice(0, 200));
      return json({ error: "Could not store embedding." }, 500);
    }
    return json({ status: "updated" }, 200);
  } catch (err) {
    console.error("[embed-sync]", err.message);
    return json({ error: "AI is temporarily unavailable." }, err.status === 429 ? 429 : 502);
  }
};

export const config = { path: "/api/embed-sync" };
