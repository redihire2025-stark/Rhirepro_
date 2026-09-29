import { supabase } from "../../lib/supabase";
import { SEARCH_SUGGESTION_DATASET, SKILL_OPTIONS, fuzzyMatch, getSkillSearchTerms } from "../../lib/skillKeywords";

export interface MasterSkillRecord {
  id: string;
  name: string;
  type: "skill" | "designation" | "category";
  category?: string;
  subcategory?: string;
  aliases?: string[];
  search_synonyms?: string[];
  similarity?: number;
}

export interface SkillSuggestion {
  value: string;
  type: "skill" | "designation";
  category?: string;
}

export const FALLBACK_DESIGNATIONS: string[] = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Node.js Developer",
  "Java Developer",
  "Python Developer",
  "Go Developer",
  "Mobile Developer",
  "Android Developer",
  "iOS Developer",
  "DevOps Engineer",
  "Cloud Architect",
  "System Administrator",
  "Database Administrator",
  "QA Engineer",
  "Automation Engineer",
  "Data Scientist",
  "Data Analyst",
  "Data Engineer",
  "Machine Learning Engineer",
  "AI Engineer",
  "Product Manager",
  "Project Manager",
  "Scrum Master",
  "Business Analyst",
  "System Analyst",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Web Designer",
  "Motion Designer",
  "Marketing Manager",
  "Digital Marketing Specialist",
  "SEO Analyst",
  "Content Writer",
  "Copywriter",
  "Sales Manager",
  "Sales Executive",
  "Business Development Executive",
  "BDM",
  "Account Manager",
  "HR Manager",
  "HR Generalist",
  "Recruiter",
  "Talent Acquisition Specialist",
  "Finance Manager",
  "Accountant",
  "Financial Analyst",
  "Operations Manager",
  "Operations Executive",
  "Customer Support Executive",
  "Customer Success Manager",
  "Technical Support Engineer",
];

export const FALLBACK_SKILLS: string[] = Array.from(
  new Set([
    ...SEARCH_SUGGESTION_DATASET,
    ...SKILL_OPTIONS,
    "DevOps",
    "UI/UX",
    "UI/UX Design",
    "QA Testing",
    "Cloud Architecture",
    "Cloud Computing",
    "Data Science",
    "Data Analysis",
    "Data Engineering",
    "Product Management",
    "Project Management",
    "Artificial Intelligence",
  ])
).sort((a, b) => a.localeCompare(b));

// BUG-8 FIX: TTL-based cache (5 min expiry, max 200 entries) to prevent memory
// leaks in long sessions and stale results when skills are added mid-session.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 200;
const suggestionCache = new Map<string, { data: SkillSuggestion[]; timestamp: number }>();
let isDatabaseAvailable: boolean | null = null;

function getCached(key: string): SkillSuggestion[] | null {
  const entry = suggestionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    suggestionCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: SkillSuggestion[]): void {
  // Evict oldest entries if over max size
  if (suggestionCache.size >= CACHE_MAX_SIZE) {
    const firstKey = suggestionCache.keys().next().value;
    if (firstKey !== undefined) suggestionCache.delete(firstKey);
  }
  suggestionCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Scores a candidate suggestion against the query.
 * 1. Primary prefix matches (e.g. "DevOps" for "de") get top priority (800+).
 * 2. Secondary word prefix matches (e.g. "iOS Development" for "de") get lower priority (450+).
 * 3. Substring & fuzzy matches are ONLY allowed for queries >= 3 characters to eliminate single/two-letter noise (e.g. "Node.js" for "de").
 */
export function scoreSuggestionMatch(candidate: string, query: string): number {
  const c = candidate.toLowerCase().trim();
  const q = query.toLowerCase().trim();
  if (!c || !q) return 0;

  // 1. Exact match (highest priority)
  if (c === q) return 1000;

  // 2. Starts with query directly (e.g. "Java" for "j", "DevOps" for "de")
  if (c.startsWith(q)) return 800 - c.length;

  // 3. Word in the phrase starts with query (e.g. "Core Java" for "j", "iOS Development" for "de")
  const words = c.split(/[\s/._-]+/).filter(Boolean);
  if (words.slice(1).some(w => w.startsWith(q))) return 450 - c.length;

  // 4. Substring match (ONLY if query is at least 3 characters!)
  // Avoids noise like "Express.js" showing for "j", or "Node.js" showing for "de"
  if (q.length >= 3 && c.includes(q)) return 250 - c.length;

  // 5. Fuzzy match (ONLY if query is at least 3 characters)
  if (q.length >= 3 && fuzzyMatch(q, candidate)) return 100 - c.length;

  return 0;
}

/**
 * Searches the database for matching skills and designations.
 * Uses PostgreSQL trigram index in Supabase with automatic fallback to pre-seeded static data.
 */
export async function getDatabaseSkillSuggestions(
  query: string,
  options: {
    type?: "skill" | "designation" | "all";
    limit?: number;
    exclude?: string[];
  } = {}
): Promise<SkillSuggestion[]> {
  const clean = query.trim();
  if (!clean) return [];

  const typeFilter = options.type || "all";
  const limit = options.limit || 12;
  const excludeList = new Set((options.exclude || []).map(e => e.toLowerCase()));
  const cacheKey = `${typeFilter}::${clean.toLowerCase()}::${limit}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return cached.filter(item => !excludeList.has(item.value.toLowerCase()));
  }

  // 1. Try PostgreSQL / Supabase native query
  if (isDatabaseAvailable !== false) {
    try {
      // First attempt: RPC search_master_skills
      const { data: rpcData, error: rpcErr } = await supabase.rpc("search_master_skills", {
        p_query: clean,
        p_type: typeFilter,
        p_limit: limit * 2,
      });

      if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
        isDatabaseAvailable = true;
        const rawResults: SkillSuggestion[] = rpcData.map((item: any) => ({
          value: item.name,
          type: item.type === "designation" ? "designation" : "skill",
          category: item.category,
        }));

        // Filter out zero-score items so loose DB substring matches (like Node.js for 'de') are discarded
        let scored = rawResults
          .map(item => ({ item, score: scoreSuggestionMatch(item.value, clean) }))
          .filter(entry => entry.score > 0);

        // Ensure high-confidence primary prefix matches (score >= 750, e.g. 'DevOps' for 'de') from fallback
        // are included even if the remote DB has not yet seeded that specific row
        const topFallback = getFallbackSuggestions(clean, typeFilter, 5);
        for (const fb of topFallback) {
          const sc = scoreSuggestionMatch(fb.value, clean);
          if (sc >= 750 && !scored.some(s => s.item.value.toLowerCase() === fb.value.toLowerCase())) {
            scored.push({ item: fb, score: sc });
          }
        }

        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.item.value.length !== b.item.value.length) return a.item.value.length - b.item.value.length;
          return a.item.value.localeCompare(b.item.value);
        });

        // Deduplicate
        const seen = new Set<string>();
        const results: SkillSuggestion[] = [];
        for (const entry of scored) {
          const valLower = entry.item.value.toLowerCase();
          if (!seen.has(valLower)) {
            seen.add(valLower);
            results.push(entry.item);
            if (results.length >= limit) break;
          }
        }

        setCache(cacheKey, results);
        return results.filter(item => !excludeList.has(item.value.toLowerCase()));
      }

      // Second attempt: Standard Supabase table select if RPC is not present
      let q = supabase
        .from("master_skills")
        .select("name, type, category")
        .eq("is_active", true);

      if (typeFilter !== "all") {
        q = q.eq("type", typeFilter);
      }

      if (clean.length <= 2) {
        q = q.ilike("name", `${clean}%`);
      } else {
        q = q.ilike("name", `%${clean}%`);
      }

      const { data: tableData, error: tableErr } = await q
        .limit(limit * 2);

      if (!tableErr && Array.isArray(tableData) && tableData.length > 0) {
        isDatabaseAvailable = true;
        const rawResults: SkillSuggestion[] = tableData.map((item: any) => ({
          value: item.name,
          type: item.type === "designation" ? "designation" : "skill",
          category: item.category,
        }));

        let scored = rawResults
          .map(item => ({ item, score: scoreSuggestionMatch(item.value, clean) }))
          .filter(entry => entry.score > 0);

        const topFallback = getFallbackSuggestions(clean, typeFilter, 5);
        for (const fb of topFallback) {
          const sc = scoreSuggestionMatch(fb.value, clean);
          if (sc >= 750 && !scored.some(s => s.item.value.toLowerCase() === fb.value.toLowerCase())) {
            scored.push({ item: fb, score: sc });
          }
        }

        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.item.value.length !== b.item.value.length) return a.item.value.length - b.item.value.length;
          return a.item.value.localeCompare(b.item.value);
        });

        const seen = new Set<string>();
        const results: SkillSuggestion[] = [];
        for (const entry of scored) {
          const valLower = entry.item.value.toLowerCase();
          if (!seen.has(valLower)) {
            seen.add(valLower);
            results.push(entry.item);
            if (results.length >= limit) break;
          }
        }

        setCache(cacheKey, results);
        return results.filter(item => !excludeList.has(item.value.toLowerCase()));
      }
    } catch (err) {
      console.warn("Database skill suggestion failed, using cached fallback:", err);
      // Do not mark database permanently unavailable on one transient error
    }
  }

  // 2. High-speed Fallback Search (Guarantees zero downtime and instant UI responsiveness)
  const results = getFallbackSuggestions(clean, typeFilter, limit);
  setCache(cacheKey, results);
  return results.filter(item => !excludeList.has(item.value.toLowerCase()));
}

/**
 * Synchronous suggestion getter for immediate first-frame rendering in UI dropdowns
 */
export function getSuggestionsSync(
  query: string,
  options: {
    type?: "skill" | "designation" | "all";
    limit?: number;
    exclude?: string[];
  } = {}
): SkillSuggestion[] {
  const clean = query.trim();
  if (!clean) return [];

  const typeFilter = options.type || "all";
  const limit = options.limit || 12;
  const excludeList = new Set((options.exclude || []).map(e => e.toLowerCase()));
  const cacheKey = `${typeFilter}::${clean.toLowerCase()}::${limit}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return cached.filter(item => !excludeList.has(item.value.toLowerCase()));
  }

  const results = getFallbackSuggestions(clean, typeFilter, limit);
  setCache(cacheKey, results);
  return results.filter(item => !excludeList.has(item.value.toLowerCase()));
}

/**
 * Computes prefix and fuzzy matches against the pre-seeded skills and designations dataset
 */
function getFallbackSuggestions(
  query: string,
  typeFilter: "skill" | "designation" | "all",
  limit: number
): SkillSuggestion[] {
  const qLower = query.toLowerCase().trim();
  if (!qLower) return [];

  const candidates: SkillSuggestion[] = [];

  const includeSkills = typeFilter === "all" || typeFilter === "skill";
  const includeDesignations = typeFilter === "all" || typeFilter === "designation";

  if (includeDesignations) {
    for (let i = 0; i < FALLBACK_DESIGNATIONS.length; i++) {
      candidates.push({ value: FALLBACK_DESIGNATIONS[i], type: "designation" });
    }
  }

  if (includeSkills) {
    for (let i = 0; i < FALLBACK_SKILLS.length; i++) {
      candidates.push({ value: FALLBACK_SKILLS[i], type: "skill" });
    }
  }

  // Score each candidate with smart ranking
  const scored = candidates
    .map(c => ({ item: c, score: scoreSuggestionMatch(c.value, qLower) }))
    .filter(entry => entry.score > 0);

  // Sort: highest score first, then shorter names, then alphabetical
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.item.value.length !== b.item.value.length) return a.item.value.length - b.item.value.length;
    return a.item.value.localeCompare(b.item.value);
  });

  // Deduplicate and slice to limit
  const seen = new Set<string>();
  const results: SkillSuggestion[] = [];
  for (const entry of scored) {
    const valLower = entry.item.value.toLowerCase();
    if (!seen.has(valLower)) {
      seen.add(valLower);
      results.push(entry.item);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Inserts a new skill or designation into Supabase master_skills table.
 * Live immediately without deploying frontend code.
 */
export async function addMasterSkill(params: {
  name: string;
  type: "skill" | "designation";
  category?: string;
  subcategory?: string;
  aliases?: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("master_skills").insert({
      name: params.name.trim(),
      type: params.type,
      category: params.category || "Custom",
      subcategory: params.subcategory || "General",
      aliases: params.aliases || [],
      is_active: true,
    });

    if (error) throw error;
    // Invalidate local suggestion cache so new additions appear immediately
    suggestionCache.clear();
    return { success: true };
  } catch (err: any) {
    console.error("Failed to add master skill to database:", err);
    return { success: false, error: err.message || "Failed to add skill" };
  }
}
