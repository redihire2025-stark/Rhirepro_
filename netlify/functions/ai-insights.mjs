// Netlify Serverless Function — AI career insights (OpenAI)
//
// The browser must never hold the model key. Anything prefixed VITE_ is inlined
// into the shipped bundle at build time and is therefore public, so the key is
// read here from OPENAI_API_KEY (no VITE_ prefix) and the client only ever sees
// /api/ai-insights.
//
// The prompt is built server-side as well: the endpoint accepts a skills list
// and nothing else, so a caller cannot turn our key into a general-purpose
// text-generation proxy.
import { enforceRateLimit, clientIp } from "../shared/rateLimit.mjs";
import { generateJson, OPENAI_KEY } from "../shared/ai.mjs";

// Netlify's synchronous functions are killed at 10s; generateJson retries a
// transient failure once but never past this budget.
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

  if (!OPENAI_KEY()) {
    console.error("[ai-insights] OPENAI_API_KEY missing from the environment");
    return json({ error: "AI insights are not configured." }, 500);
  }

  // This endpoint is unauthenticated (public skills page) and spends money per
  // call, so cap it per client.
  const limited = await enforceRateLimit([[`ai-insights:ip:${clientIp(request)}`, 30, 3600]]);
  if (limited) return limited;

  const { systemMessage, userMessage } = buildPrompt(skills.join(", "));

  try {
    const result = await generateJson({
      system: systemMessage,
      user: userMessage,
      temperature: 0.2,
      maxTokens: 4096,
      budgetMs: DEADLINE_MS,
    });
    // The client parses `text` as JSON, so keep that contract.
    return json({ text: JSON.stringify(result) }, 200);
  } catch (err) {
    console.error("[ai-insights]", err.status || "", err.message);
    return json({ error: "AI insights are temporarily unavailable." }, err.status === 429 ? 429 : 502);
  }
};

export const config = { path: "/api/ai-insights" };
