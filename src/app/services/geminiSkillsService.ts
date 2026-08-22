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
const CACHE_PREFIX = "rhirepro_gemini_v5_"; // bump = clears all previous caches

// Server-side proxy. The model key lives in GEMINI_API_KEY on the function and
// is never shipped to the browser — see netlify/functions/ai-insights.mjs.
const AI_INSIGHTS_ENDPOINT = "/api/ai-insights";

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

// Gemini frequently wraps its answer in a ```json fence even when asked for raw
// JSON, and occasionally adds a sentence around it — so strip the fence first
// and, failing that, fall back to the outermost { … } span.
function extractJsonPayload(text: string): string {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1].trim()) return fenced[1].trim();

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);

  return trimmed;
}

function parseResponse(text: string): GeminiInsightsResult | null {
  try {
    const parsed = JSON.parse(extractJsonPayload(text));

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

  const skillList = skills.slice(0, 20).join(", ");
  console.log("[AI Insights] Requesting Gemini insights for skills:", skillList);

  try {
    const res = await fetch(AI_INSIGHTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills: skills.slice(0, 20) }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[AI Insights] HTTP ${res.status}:`, errText);
      return null;
    }

    const payload = await res.json().catch(() => null);
    const text: string | undefined = payload?.text;
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
