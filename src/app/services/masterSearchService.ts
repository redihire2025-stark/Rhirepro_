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
  new Set([...SEARCH_SUGGESTION_DATASET, ...SKILL_OPTIONS])
).sort((a, b) => a.localeCompare(b));

// In-memory cache for ultra-fast keystroke responsiveness (<5ms)
const suggestionCache = new Map<string, SkillSuggestion[]>();
let isDatabaseAvailable: boolean | null = null;

/**
 * Scores a candidate suggestion against the query.
 * Prefix matches are prioritized heavily. Mid-word substring matches are only allowed for queries >= 3 chars.
 */
export function scoreSuggestionMatch(candidate: string, query: string): number {
  const c = candidate.toLowerCase().trim();
  const q = query.toLowerCase().trim();
  if (!c || !q) return 0;

  // 1. Exact match (highest priority)
  if (c === q) return 1000;

  // 2. Starts with query (e.g. "Java", "JavaScript" for "j")
  if (c.startsWith(q)) return 800 - c.length;

  // 3. Word in the phrase starts with query (e.g. "Core Java" for "j")
  const words = c.split(/\s+/);
  if (words.some(w => w.startsWith(q))) return 600 - c.length;

  // 4. Substring match (ONLY if query is at least 3 characters!)
  // Avoids noise like "Express.js" or "Django" showing for a single letter "j"
  if (q.length >= 3 && c.includes(q)) return 400 - c.length;

  // 5. Fuzzy match (ONLY if query is at least 3 characters)
  if (q.length >= 3 && fuzzyMatch(q, candidate)) return 200 - c.length;

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

  if (suggestionCache.has(cacheKey)) {
    const cached = suggestionCache.get(cacheKey)!;
    return cached.filter(item => !excludeList.has(item.value.toLowerCase()));
  }

  // 1. Try PostgreSQL / Supabase native query
  if (isDatabaseAvailable !== false) {
    try {
      // First attempt: RPC search_master_skills
      const { data: rpcData, error: rpcErr } = await supabase.rpc("search_master_skills", {
        p_query: clean,
        p_type: typeFilter,
        p_limit: limit,
      });

      if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
        isDatabaseAvailable = true;
        const results: SkillSuggestion[] = rpcData.map((item: any) => ({
          value: item.name,
          type: item.type === "designation" ? "designation" : "skill",
          category: item.category,
        }));
        results.sort((a, b) => scoreSuggestionMatch(b.value, clean) - scoreSuggestionMatch(a.value, clean));
        suggestionCache.set(cacheKey, results);
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
        const results: SkillSuggestion[] = tableData.map((item: any) => ({
          value: item.name,
          type: item.type === "designation" ? "designation" : "skill",
          category: item.category,
        }));
        results.sort((a, b) => scoreSuggestionMatch(b.value, clean) - scoreSuggestionMatch(a.value, clean));
        const finalResults = results.slice(0, limit);
        suggestionCache.set(cacheKey, finalResults);
        return finalResults.filter(item => !excludeList.has(item.value.toLowerCase()));
      }
    } catch (err) {
      console.warn("Database skill suggestion failed, using cached fallback:", err);
      // Do not mark database permanently unavailable on one transient error
    }
  }

  // 2. High-speed Fallback Search (Guarantees zero downtime and instant UI responsiveness)
  const results = getFallbackSuggestions(clean, typeFilter, limit);
  suggestionCache.set(cacheKey, results);
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

  if (suggestionCache.has(cacheKey)) {
    return suggestionCache.get(cacheKey)!.filter(item => !excludeList.has(item.value.toLowerCase()));
  }

  const results = getFallbackSuggestions(clean, typeFilter, limit);
  suggestionCache.set(cacheKey, results);
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
