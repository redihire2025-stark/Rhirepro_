// Netlify Serverless Function — AI career insights (Google Gemini)
//
// The browser must never hold the model key. Anything prefixed VITE_ is inlined
// into the shipped bundle at build time and is therefore public, so the key is
// read here from GEMINI_API_KEY (no VITE_ prefix) and the client only ever sees
// /api/ai-insights.
//
// The prompt is built server-side as well: the endpoint accepts a skills list
// and nothing else, so a caller cannot turn our key into a general-purpose
// text-generation proxy.

// gemini-flash-latest is the primary model. It is a thinking model and was
// observed returning 503 UNAVAILABLE ("experiencing high demand") on a
// meaningful fraction of these prompts, so the lite model is tried as a second
// choice — it answers the same prompt in roughly half the time.
const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const endpointFor = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Netlify's synchronous functions are killed at 10s. Each Gemini call takes
// 2–7s, so retrying blindly would time the whole function out and return a
// bodiless 502 instead of the JSON error the client knows how to handle.
const DEADLINE_MS = 8000;

const json = (payload, status) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function buildPrompt(skillList) {
  const systemMessage = `You are a senior tech recruiter with expertise across ALL technology domains — web development, mobile, cloud, DevOps, data science, machine learning, game development, XR/AR/VR, cybersecurity, embedded systems, and more. You analyze real 2024-2025 job postings to identify in-demand skills for any technology stack. You ALWAYS match recommendations to the exact domain of the input skills — never crossing into unrelated domains.`;

  const userMessage = `Professional's current skills: ${skillList}

Your job:
1. Detect what technology domain(s) these skills belong to (e.g., web dev, game dev, data science, DevOps, etc.)
2. Based on that domain, identify the 8 skills that appear most frequently in 2024-2025 job postings alongside these specific skills
3. Identify 4 certifications with the highest career ROI for this exact skill set

Critical rules:
- Suggest ONLY skills from the SAME domain as: ${skillList}
- Do NOT suggest skills from unrelated domains (e.g., do not suggest game dev skills for a web developer)
- Do NOT include any skill already in: ${skillList}
- Be specific — name exact tools, frameworks, libraries, platforms (not vague concepts)

Return ONLY valid JSON (absolutely no text outside the JSON object):
{
  "trendingSkills": [
    {"skill": "exact tool or technology name", "demand": "High", "reason": "why this is trending for this exact skill set"},
    {"skill": "exact tool or technology name", "demand": "High", "reason": "why employers want this with these skills"},
    {"skill": "exact tool or technology name", "demand": "Growing", "reason": "emerging demand in this domain"},
    {"skill": "exact tool or technology name", "demand": "High", "reason": "core requirement in this stack"},
    {"skill": "exact tool or technology name", "demand": "Medium", "reason": "increasingly listed in job postings"},
    {"skill": "exact tool or technology name", "demand": "Growing", "reason": "future-facing for this profile"},
    {"skill": "exact tool or technology name", "demand": "High", "reason": "standard alongside these skills"},
    {"skill": "exact tool or technology name", "demand": "Medium", "reason": "valuable addition to this stack"}
  ],
  "certifications": [
    {"name": "official certification name", "provider": "certifying body", "value": "High ROI", "reason": "why this cert is valuable for this profile"},
    {"name": "official certification name", "provider": "certifying body", "value": "In-Demand", "reason": "employers actively request this"},
    {"name": "official certification name", "provider": "certifying body", "value": "Recommended", "reason": "boosts this profile significantly"},
    {"name": "official certification name", "provider": "certifying body", "value": "Growing", "reason": "emerging value for this domain"}
  ]
}

demand must be exactly one of: "High", "Medium", "Growing"
value must be exactly one of: "High ROI", "High Demand", "In-Demand", "Recommended", "Growing"
Skill names must be under 40 characters.`;

  return { systemMessage, userMessage };
}

// 503 / 429 / network failures are transient, so retry them across the model
// list rather than surfacing a dead panel — but always inside DEADLINE_MS, and
// never for a 4xx that would fail identically on retry.
async function callGemini(apiKey, body) {
  const startedAt = Date.now();
  const serialized = JSON.stringify(body);
  let last = { status: 0, message: "no attempt made" };

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() - startedAt > DEADLINE_MS) return { ok: false, ...last };

      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300 + Math.floor(Math.random() * 200)));
      }

      let res;
      try {
        res = await fetch(endpointFor(model), {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
          body: serialized,
        });
      } catch (networkErr) {
        // DNS / TLS / socket failure — retryable, and must never escape as a throw.
        last = { status: 0, message: `Could not reach the AI service: ${networkErr.message}` };
        continue;
      }

      if (res.ok) {
        const payload = await res.json().catch(() => null);
        if (!payload) {
          last = { status: 502, message: `${model}: non-JSON success body` };
          continue;
        }
        return { ok: true, payload, model };
      }

      const errText = await res.text().catch(() => "");
      let message = errText;
      try {
        message = JSON.parse(errText)?.error?.message || errText;
      } catch {
        // Non-JSON error body — keep the raw text.
      }
      last = { status: res.status, message: `${model}: ${message}` };

      // A bad key or a bad model id will not fix itself, and 400/404 on one
      // model still leaves the next one worth trying.
      if (res.status === 401 || res.status === 403) return { ok: false, ...last };
      if (res.status !== 429 && res.status < 500) break; // move on to the next model
    }
  }

  return { ok: false, ...last };
}

// Gemini puts the answer in candidates[0].content.parts. With a thinking model
// there can be more than one part, and reasoning parts are flagged `thought`,
// so take every non-thought text part rather than assuming parts[0].
function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => part && part.thought !== true && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
}

// Translate an upstream Gemini failure into a status code that tells the caller
// what to actually do, instead of collapsing everything into a 500.
function mapGeminiStatus(status) {
  if (status === 429) return 429;                   // caller should back off and retry
  if (status === 401 || status === 403) return 500; // our key is missing/invalid — our problem
  if (status === 400 || status === 404) return 500; // malformed request or bad model id — our problem
  return 502;                                       // upstream down, overloaded or unreachable
}

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid request body." }, 400);
  }

  const skills = Array.isArray(body.skills)
    ? body.skills
        .filter((skill) => typeof skill === "string")
        .map((skill) => skill.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  if (skills.length === 0) {
    return json({ error: "At least one skill is required." }, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[ai-insights] GEMINI_API_KEY missing from the environment");
    return json({ error: "AI insights are not configured." }, 500);
  }

  const { systemMessage, userMessage } = buildPrompt(skills.join(", "));

  try {
    const result = await callGemini(apiKey, {
      systemInstruction: { parts: [{ text: systemMessage }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    if (!result.ok) {
      const status = mapGeminiStatus(result.status);
      console.error(`[ai-insights] Gemini ${result.status}:`, result.message);
      return json({ error: "AI insights are temporarily unavailable." }, status);
    }

    const text = extractText(result.payload);
    if (!text) {
      const finishReason = result.payload?.candidates?.[0]?.finishReason;
      console.error("[ai-insights] Empty completion, finishReason:", finishReason);
      return json({ error: "AI insights are temporarily unavailable." }, 502);
    }

    return json({ text }, 200);
  } catch (err) {
    // Nothing above may escape as an unhandled throw — the runtime would turn it
    // into a bodiless 500 that the client cannot explain to the user.
    console.error("[ai-insights] Unhandled error:", err);
    return json({ error: "AI insights are temporarily unavailable." }, 500);
  }
};

export const config = { path: "/api/ai-insights" };
