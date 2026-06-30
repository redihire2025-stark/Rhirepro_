export interface GeminiSkillSuggestion {
  skill: string;
  demand: "High" | "Medium" | "Growing";
  reason: string;
}

export interface GeminiCertification {
  name: string;
  provider: string;
  value: "High ROI" | "High Demand" | "In-Demand" | "Recommended" | "Growing";
  reason: string;
}

export interface GeminiInsightsResult {
  trendingSkills: GeminiSkillSuggestion[];
  certifications: GeminiCertification[];
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = "rhirepro_groq_v4_"; // bump = clears all previous caches

const VALID_DEMAND = new Set(["High", "Medium", "Growing"]);
const VALID_VALUE = new Set(["High ROI", "High Demand", "In-Demand", "Recommended", "Growing"]);

function buildCacheKey(skills: string[]): string {
  const normalized = [...skills].sort().join(",");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return CACHE_PREFIX + Math.abs(hash).toString(36);
}

function readCache(key: string): GeminiInsightsResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data as GeminiInsightsResult;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: GeminiInsightsResult): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

function parseResponse(text: string): GeminiInsightsResult | null {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.trendingSkills) || !Array.isArray(parsed.certifications)) {
      console.error("[AI Insights] Unexpected shape:", parsed);
      return null;
    }

    const trendingSkills: GeminiSkillSuggestion[] = parsed.trendingSkills
      .filter((s: any) => s?.skill && VALID_DEMAND.has(s.demand))
      .slice(0, 12)
      .map((s: any) => ({
        skill: String(s.skill).slice(0, 50),
        demand: s.demand as GeminiSkillSuggestion["demand"],
        reason: String(s.reason || "").slice(0, 120),
      }));

    const certifications: GeminiCertification[] = parsed.certifications
      .filter((c: any) => c?.name && c?.provider && VALID_VALUE.has(c.value))
      .slice(0, 6)
      .map((c: any) => ({
        name: String(c.name).slice(0, 80),
        provider: String(c.provider).slice(0, 50),
        value: c.value as GeminiCertification["value"],
        reason: String(c.reason || "").slice(0, 120),
      }));

    if (trendingSkills.length === 0 && certifications.length === 0) {
      console.error("[AI Insights] All items filtered — raw:", parsed);
      return null;
    }
    return { trendingSkills, certifications };
  } catch (e) {
    console.error("[AI Insights] JSON parse failed:", e, "\nRaw:", text);
    return null;
  }
}

export async function fetchGeminiInsights(
  skills: string[]
): Promise<GeminiInsightsResult | null> {
  if (skills.length === 0) return null;

  const key = buildCacheKey(skills);
  const cached = readCache(key);
  if (cached) {
    console.log("[AI Insights] Cache hit");
    return cached;
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    console.error("[AI Insights] VITE_GROQ_API_KEY not set");
    return null;
  }

  const skillList = skills.slice(0, 20).join(", ");
  console.log("[AI Insights] Calling Groq for skills:", skillList);

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

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI Insights] HTTP ${res.status}:`, errText);
      return null;
    }

    const payload = await res.json();
    const text: string | undefined = payload?.choices?.[0]?.message?.content;
    if (!text) {
      console.error("[AI Insights] No content in response:", payload);
      return null;
    }

    console.log("[AI Insights] Raw response:", text);
    const result = parseResponse(text);
    if (result) {
      console.log("[AI Insights] Parsed successfully:", result);
      writeCache(key, result);
    }
    return result;
  } catch (e) {
    console.error("[AI Insights] Fetch error:", e);
    return null;
  }
}
