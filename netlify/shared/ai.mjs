/*
 * Shared plumbing for the AI endpoints: caller authentication, Supabase REST
 * access with the service role, and thin Gemini wrappers (embeddings and
 * structured generation).
 *
 * The browser never holds GEMINI_API_KEY; every prompt and every value sent to
 * the model is built here from database rows, so a caller cannot turn the key
 * into a general-purpose proxy.
 */

export const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

export const SUPABASE_URL = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
export const SERVICE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
export const svcHeaders = () => {
  const k = SERVICE_KEY();
  return { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" };
};

/** Resolve the Supabase user behind the Bearer token, or null. */
export async function getCaller(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL()}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY(), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user?.id ? user : null;
}

export const clean = (value, max = 400) =>
  String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMS = 768;

/**
 * @param {"RETRIEVAL_DOCUMENT"|"RETRIEVAL_QUERY"|"SEMANTIC_SIMILARITY"} taskType
 * @returns {Promise<number[]>}
 */
export async function embedText(apiKey, text, taskType = "RETRIEVAL_DOCUMENT", timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBEDDING_DIMS,
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) throw Object.assign(new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`), { status: res.status });
    const data = await res.json();
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) throw new Error("embed: unexpected response shape");
    return values;
  } finally {
    clearTimeout(timer);
  }
}

/** pgvector text literal. */
export const toVector = (values) => `[${values.join(",")}]`;

const GEN_MODELS = [
  { name: "gemini-flash-latest", generationConfig: { thinkingConfig: { thinkingBudget: 0 } } },
  { name: "gemini-flash-lite-latest", generationConfig: {} },
];

/**
 * Structured generation with model fallback. Returns parsed JSON or throws.
 * `parts` is the Gemini `parts` array (text and/or inline_data).
 */
export async function generateJson(apiKey, { system, parts, maxOutputTokens = 2048, budgetMs = 8000 }) {
  const started = Date.now();
  let lastErr = new Error("no attempt made");
  for (const model of GEN_MODELS) {
    const remaining = budgetMs - (Date.now() - started);
    if (remaining <= 500) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts }],
            generationConfig: { temperature: 0.1, maxOutputTokens, responseMimeType: "application/json", ...model.generationConfig },
          }),
          signal: controller.signal,
        },
      );
      if (!res.ok) {
        lastErr = Object.assign(new Error(`${model.name} ${res.status}`), { status: res.status });
        if (res.status === 401 || res.status === 403) throw lastErr;
        continue;
      }
      const payload = await res.json();
      const text = (payload?.candidates?.[0]?.content?.parts || [])
        .filter((p) => p && p.thought !== true && typeof p.text === "string")
        .map((p) => p.text)
        .join("")
        .trim();
      return JSON.parse(text);
    } catch (err) {
      lastErr = err;
      if (err.status === 401 || err.status === 403) throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/** Text that represents a profile for embedding. Ids/emails/phones are never included. */
export function profileEmbeddingText(p) {
  return [
    clean(p.headline),
    clean(p.current_title) && `Current role: ${clean(p.current_title)}${p.current_company ? ` at ${clean(p.current_company)}` : ""}`,
    p.total_experience && `Experience: ${clean(p.total_experience, 40)}`,
    p.location && `Location: ${clean(p.location, 80)}`,
    Array.isArray(p.skills) && p.skills.length && `Skills: ${p.skills.slice(0, 40).map((s) => clean(s, 40)).join(", ")}`,
    clean(p.about, 1200),
  ].filter(Boolean).join("\n");
}

export function jobEmbeddingText(j) {
  return [
    clean(j.title),
    j.department && `Department: ${clean(j.department, 80)}`,
    j.industry && `Industry: ${clean(j.industry, 80)}`,
    j.location && `Location: ${clean(j.location, 80)}`,
    j.work_mode && `Work mode: ${clean(j.work_mode, 40)}`,
    j.employment_type && `Type: ${clean(j.employment_type, 40)}`,
    (j.experience_min != null || j.experience_max != null) && `Experience: ${j.experience_min ?? "?"}-${j.experience_max ?? "?"} years`,
    Array.isArray(j.skills) && j.skills.length && `Skills: ${j.skills.slice(0, 40).map((s) => clean(s, 40)).join(", ")}`,
    clean(j.description, 1500),
    clean(j.requirements, 800),
  ].filter(Boolean).join("\n");
}
