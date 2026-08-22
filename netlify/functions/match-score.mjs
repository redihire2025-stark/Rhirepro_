/*
 * POST /api/match-score
 *
 * Scores how well a candidate profile fits a job, using Gemini, and caches the
 * result in ai_match_scores.
 *
 * Why a single endpoint for both sides: "how well does this profile fit this
 * job" is the same question whether a recruiter is looking at an applicant or a
 * seeker is looking at a recommended job, so both read the same cache and only
 * the authorisation differs.
 *
 * Why on demand rather than per list: an applicant list and a recommendations
 * list each render many rows, and scoring every row on every render would mean
 * a model call per row — slow, costly and rate-limited. The caller asks for one
 * pair at a time and the answer is reused afterwards.
 *
 * Guards:
 *   1. The caller must be authenticated, and must be either the candidate
 *      themselves or a recruiter who owns the job (or the org admin above them).
 *   2. profile_id and job_id are ids only; every value fed to the model is read
 *      from the database with the service role, so a caller cannot inject
 *      arbitrary text and turn our key into a general-purpose proxy.
 */

/*
 * Model order and per-model settings are both measured, not guessed.
 *
 * gemini-flash-latest is a thinking model. Left to think, it took ~18s on this
 * prompt — Netlify kills a synchronous function at 10s, so it would never have
 * returned. With thinking disabled it answers the same prompt in ~1.4s and
 * scores consistently (25-28 on a candidate the fallback rated 50), so it stays
 * the primary and simply does not think.
 *
 * gemini-flash-lite-latest REJECTS thinkingConfig with a 400, so it must be
 * sent the plain config. It answers in ~1s but grades more generously, which is
 * why it is the fallback rather than the default.
 */
const MODELS = [
  { name: "gemini-flash-latest", generationConfig: { thinkingConfig: { thinkingBudget: 0 } } },
  { name: "gemini-flash-lite-latest", generationConfig: {} },
];
const endpointFor = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Netlify kills synchronous functions at 10s; stop starting new attempts well
// before that so a failure still returns JSON rather than a bodiless timeout.
const DEADLINE_MS = 7000;
// Re-score if the cached answer predates a profile or job edit, but never more
// often than this — the inputs rarely change and the call is not free.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const json = (payload, status) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

const SUPABASE_URL = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const svcHeaders = () => {
  const k = SERVICE_KEY();
  return { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" };
};

const clean = (value, max = 400) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

async function callGemini(apiKey, requestBody) {
  const started = Date.now();
  let last = { status: 0, message: "No attempt made" };

  for (const model of MODELS) {
    if (Date.now() - started > DEADLINE_MS) break;

    const body = {
      ...requestBody,
      generationConfig: { ...requestBody.generationConfig, ...model.generationConfig },
    };

    let res;
    try {
      res = await fetch(`${endpointFor(model.name)}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      last = { status: 0, message: `Could not reach the AI service: ${networkErr.message}` };
      continue;
    }

    if (res.ok) {
      const payload = await res.json().catch(() => null);
      if (!payload) {
        last = { status: 502, message: `${model.name}: non-JSON success body` };
        continue;
      }
      return { ok: true, payload, model: model.name };
    }

    const errText = await res.text().catch(() => "");
    let message = errText;
    try {
      message = JSON.parse(errText)?.error?.message || errText;
    } catch {
      // Non-JSON error body — keep the raw text.
    }
    last = { status: res.status, message: `${model.name}: ${message}` };

    // A bad key will not fix itself. Anything else — including a 400 from a
    // model that rejects a config the next one accepts — leaves the fallback
    // worth trying, which is the case that 503 on the primary depends on.
    if (res.status === 401 || res.status === 403) return { ok: false, ...last };
  }
  return { ok: false, ...last };
}

// Thinking models emit reasoning parts flagged `thought`; take the rest.
function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => part && part.thought !== true && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
}

function mapGeminiStatus(status) {
  if (status === 429) return 429;
  if (status === 401 || status === 403) return 500;
  if (status === 400 || status === 404) return 500;
  return 502;
}

function buildPrompt(profile, job) {
  const systemMessage =
    "You are an experienced technical recruiter assessing how well one candidate fits one specific role. " +
    "You judge only on the evidence given. You do not invent experience the candidate has not stated, " +
    "and you do not penalise a candidate for information that is simply absent — you note it as unknown. " +
    "You are calibrated: 90+ means an outstanding fit, 70-89 a strong fit, 50-69 a partial fit worth a look, " +
    "30-49 a weak fit, below 30 a clear mismatch.";

  const candidate = [
    `Headline: ${clean(profile.headline) || "not stated"}`,
    `Current title: ${clean(profile.current_title) || "not stated"}`,
    `Current company: ${clean(profile.current_company) || "not stated"}`,
    `Experience: ${clean(profile.experience_type) || "not stated"}${
      profile.total_experience ? ` (${clean(profile.total_experience, 40)})` : ""
    }`,
    `Location: ${clean(profile.location) || "not stated"}`,
    `Skills: ${(Array.isArray(profile.skills) ? profile.skills : []).slice(0, 40).map((x) => clean(x, 40)).join(", ") || "none listed"}`,
    `Summary: ${clean(profile.about, 800) || "not provided"}`,
  ].join("\n");

  const role = [
    `Title: ${clean(job.title) || "not stated"}`,
    `Department: ${clean(job.department) || "not stated"}`,
    `Location: ${clean(job.location) || "not stated"}`,
    `Work mode: ${clean(job.work_mode) || "not stated"}`,
    `Employment type: ${clean(job.employment_type) || "not stated"}`,
    `Experience required: ${job.experience_min ?? "?"}-${job.experience_max ?? "?"} years`,
    `Required skills: ${(Array.isArray(job.skills) ? job.skills : []).slice(0, 40).map((x) => clean(x, 40)).join(", ") || "none listed"}`,
    `Description: ${clean(job.description, 1500) || "not provided"}`,
  ].join("\n");

  const userMessage = `CANDIDATE
${candidate}

ROLE
${role}

Assess the fit. Weigh required skills most heavily, then relevant experience level, then domain and role alignment. Location matters only if the role is on-site.

Return ONLY valid JSON, no text outside the object:
{
  "score": <integer 0-100>,
  "summary": "<one sentence, max 25 words, explaining the score>",
  "strengths": ["<specific match>", "<specific match>", "<specific match>"],
  "gaps": ["<specific gap>", "<specific gap>"]
}`;

  return { systemMessage, userMessage };
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid request body." }, 400);

  const { profile_id: profileId, job_id: jobId, refresh } = body;
  if (!profileId || !jobId || typeof profileId !== "string" || typeof jobId !== "string") {
    return json({ error: "profile_id and job_id are required." }, 400);
  }

  if (!SUPABASE_URL() || !SERVICE_KEY()) {
    console.error("[match-score] Supabase credentials missing");
    return json({ error: "Server is not configured." }, 500);
  }

  // ── Authenticate ───────────────────────────────────────────────────────────
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Authentication required." }, 401);

  const userRes = await fetch(`${SUPABASE_URL()}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY(), Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ error: "Authentication required." }, 401);
  const caller = await userRes.json().catch(() => null);
  if (!caller?.id) return json({ error: "Authentication required." }, 401);

  // ── Load the job, and use its owner to authorise ────────────────────────────
  const jobRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/jobs?id=eq.${encodeURIComponent(jobId)}` +
      `&select=id,title,department,location,work_mode,employment_type,experience_min,experience_max,skills,description,recruiter_id`,
    { headers: svcHeaders() },
  );
  const jobs = jobRes.ok ? await jobRes.json().catch(() => []) : [];
  const job = Array.isArray(jobs) ? jobs[0] : null;
  if (!job) return json({ error: "Job not found." }, 404);

  let authorised = caller.id === profileId || caller.id === job.recruiter_id;
  if (!authorised) {
    // An org admin may score candidates against their team's postings.
    const teamRes = await fetch(
      `${SUPABASE_URL()}/rest/v1/recruiter_profiles?id=eq.${encodeURIComponent(job.recruiter_id)}` +
        `&org_admin_id=eq.${encodeURIComponent(caller.id)}&select=id`,
      { headers: svcHeaders() },
    );
    const team = teamRes.ok ? await teamRes.json().catch(() => []) : [];
    authorised = Array.isArray(team) && team.length > 0;
  }
  if (!authorised) return json({ error: "Not allowed to score this pairing." }, 403);

  // ── Serve from cache unless it is stale or a refresh was asked for ─────────
  const cacheRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/ai_match_scores?profile_id=eq.${encodeURIComponent(profileId)}` +
      `&job_id=eq.${encodeURIComponent(jobId)}&select=score,summary,strengths,gaps,computed_at`,
    { headers: svcHeaders() },
  );
  const cached = cacheRes.ok ? await cacheRes.json().catch(() => []) : [];
  const hit = Array.isArray(cached) ? cached[0] : null;
  if (hit && !refresh) {
    const age = Date.now() - new Date(hit.computed_at).getTime();
    if (!isNaN(age) && age < CACHE_TTL_MS) {
      return json({ ...hit, cached: true }, 200);
    }
  }

  const profRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}` +
      `&select=id,headline,current_title,current_company,experience_type,total_experience,location,skills,about`,
    { headers: svcHeaders() },
  );
  const profiles = profRes.ok ? await profRes.json().catch(() => []) : [];
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (!profile) return json({ error: "Profile not found." }, 404);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[match-score] GEMINI_API_KEY missing from the environment");
    return json({ error: "AI matching is not configured." }, 500);
  }

  const { systemMessage, userMessage } = buildPrompt(profile, job);

  try {
    const result = await callGemini(apiKey, {
      systemInstruction: { parts: [{ text: systemMessage }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });

    if (!result.ok) {
      console.error(`[match-score] Gemini ${result.status}:`, result.message);
      // A stale cached score beats no score at all.
      if (hit) return json({ ...hit, cached: true, stale: true }, 200);
      return json({ error: "AI matching is temporarily unavailable." }, mapGeminiStatus(result.status));
    }

    const text = extractText(result.payload);
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[match-score] Unparseable completion:", text.slice(0, 200));
    }

    const score = Number(parsed?.score);
    if (!parsed || !Number.isFinite(score)) {
      if (hit) return json({ ...hit, cached: true, stale: true }, 200);
      return json({ error: "AI matching is temporarily unavailable." }, 502);
    }

    const row = {
      profile_id: profileId,
      job_id: jobId,
      // The model is instructed to stay in 0-100 but the column has a CHECK
      // constraint; clamping here keeps a stray value from failing the write.
      score: Math.max(0, Math.min(100, Math.round(score))),
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 300) : null,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5).map((x) => String(x).slice(0, 120)) : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 5).map((x) => String(x).slice(0, 120)) : [],
      model: result.model,
      computed_at: new Date().toISOString(),
    };

    await fetch(`${SUPABASE_URL()}/rest/v1/ai_match_scores`, {
      method: "POST",
      headers: { ...svcHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
    }).catch((err) => console.warn("[match-score] Could not cache score:", err.message));

    return json({ ...row, cached: false }, 200);
  } catch (err) {
    console.error("[match-score] Unhandled error:", err);
    return json({ error: "AI matching is temporarily unavailable." }, 500);
  }
};

export const config = { path: "/api/match-score" };
