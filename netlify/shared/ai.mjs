/*
 * Shared plumbing for the AI endpoints: caller authentication, Supabase REST
 * access with the service role, and thin OpenAI wrappers (OpenAI embeddings and
 * structured generation).
 *
 * The browser never holds OPENAI_API_KEY; every prompt and every value sent to
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

export const EMBEDDING_MODEL = "text-embedding-3-small";
// text-embedding-3 models can be shortened server-side, so the column stays
// vector(768) and no migration is needed.
export const EMBEDDING_DIMS = 768;
export const CHAT_MODEL = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

export const OPENAI_KEY = () => process.env.OPENAI_API_KEY;

async function openai(path, payload, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.openai.com/v1/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY()}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw Object.assign(new Error(`openai ${path} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`), { status: res.status });
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Embedding for `text`. (OpenAI embeddings have no query/document task types, so
 * none is taken.) Returns number[] of EMBEDDING_DIMS.
 */
export async function embedText(text, timeoutMs = 6000) {
  const data = await openai("embeddings", { model: EMBEDDING_MODEL, input: text, dimensions: EMBEDDING_DIMS }, timeoutMs);
  const values = data?.data?.[0]?.embedding;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) throw new Error("embed: unexpected response shape");
  return values;
}

/** pgvector text literal. */
export const toVector = (values) => `[${values.join(",")}]`;

/**
 * Structured generation. `file` is an optional { filename, mime, base64 } sent
 * to the model as an attachment (used for PDF resumes). Returns parsed JSON or
 * throws.
 */
export async function generateJson({ system, user, file, maxTokens = 2048, budgetMs = 8000 }) {
  const content = [];
  if (file) {
    content.push({ type: "file", file: { filename: file.filename, file_data: `data:${file.mime};base64,${file.base64}` } });
  }
  content.push({ type: "text", text: user });
  const data = await openai(
    "chat/completions",
    {
      model: CHAT_MODEL(),
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content }],
    },
    budgetMs,
  );
  return JSON.parse(data?.choices?.[0]?.message?.content || "");
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
