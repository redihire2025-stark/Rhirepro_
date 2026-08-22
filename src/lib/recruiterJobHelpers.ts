import { SEARCH_SUGGESTION_DATASET, SKILL_OPTIONS, fuzzyMatch, getSkillSearchTerms, skillsMatch } from "./skillKeywords";

export function extractTextFromHtml(value: string): string {
  if (!value) return "";
  const temp = document.createElement("div");
  temp.innerHTML = value;
  return (temp.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRelevantSkillsForJobContext(
  jobTitle: string,
  jobDescription: string,
  selectedSkills: string[],
  suggestedSkills: string[] = [],
): string[] {
  const titleText = extractTextFromHtml(jobTitle).toLowerCase();
  const descriptionText = extractTextFromHtml(jobDescription).toLowerCase();
  const contextText = `${titleText} ${descriptionText}`.trim();

  if (!contextText || selectedSkills.length === 0) return [];

  const normalizedContext = contextText
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const contextTokens = new Set(
    normalizedContext
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => token.length > 2),
  );

  const suggestionPool = Array.from(new Set(suggestedSkills.map((skill) => skill.trim()).filter(Boolean)));

  return selectedSkills.filter((skill) => {
    const normalizedSkill = skill.trim();
    if (!normalizedSkill) return false;

    const skillText = normalizedSkill.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!skillText) return false;

    const skillTerms = getSkillSearchTerms(normalizedSkill)
      .map((term) => term.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    if (normalizedContext.includes(skillText)) return true;
    if (skillTerms.some((term) => contextTokens.has(term))) return true;
    if (skillTerms.some((term) => normalizedContext.includes(term))) return true;
    if (skillsMatch(normalizedSkill, titleText) || skillsMatch(normalizedSkill, descriptionText)) return true;
    if (suggestionPool.some((suggestion) => {
      const suggestionText = suggestion.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
      if (!suggestionText) return false;

      return skillsMatch(normalizedSkill, suggestionText)
        || skillsMatch(suggestionText, normalizedSkill)
        || fuzzyMatch(suggestionText, normalizedSkill)
        || fuzzyMatch(normalizedSkill, suggestionText)
        || skillTerms.some((term) => getSkillSearchTerms(suggestion).some((suggestionTerm) => suggestionTerm.includes(term)));
    })) return true;
    if (fuzzyMatch(normalizedContext, normalizedSkill)) return true;

    return false;
  });
}

export function inferSkillSuggestions(description: string, limit = 6): string[] {
  const text = extractTextFromHtml(description)
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]/g, " ")
    .trim();

  if (!text) return [];

  const tokenSet = new Set(text.split(/\s+/).filter(Boolean));
  const candidateSet = Array.from(new Set([...SEARCH_SUGGESTION_DATASET, ...SKILL_OPTIONS]));

  const ranked = candidateSet
    .map((skill) => {
      const normalizedSkill = skill.toLowerCase();
      const skillTokens = normalizedSkill.split(/\s+/).filter(Boolean);
      const exactPhraseScore = text.includes(normalizedSkill) ? 100 : 0;
      const allTokensCovered = skillTokens.length > 0 && skillTokens.every((token) => tokenSet.has(token));
      const partialTokenCoverage = skillTokens.length > 0 ? skillTokens.filter((token) => tokenSet.has(token)).length : 0;
      const partialScore = partialTokenCoverage > 0 ? partialTokenCoverage * 15 : 0;
      const fuzzyBoost = fuzzyMatch(text, normalizedSkill) ? 10 : 0;

      const score = exactPhraseScore + (allTokensCovered ? 50 : 0) + partialScore + fuzzyBoost;
      return { skill, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.localeCompare(b.skill));

  const suggestions = ranked.map((item) => item.skill).slice(0, limit);
  if (suggestions.length >= limit) {
    return suggestions;
  }

  const fallbackTokens = text
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !/^(and|or|the|with|for|we|are|looking|experience|backend|api)$/i.test(token))
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1));

  return Array.from(new Set([...suggestions, ...fallbackTokens])).slice(0, limit);
}

/**
 * Validates free-text job fields (Job Title, Department, Industry).
 *
 * These accepted anything at all, so values like "qwe233+-/", "sdf4d55,,,," and
 * "421.+-/12" were saved and published as real job postings.
 *
 * A plain symbol blacklist is wrong here — "C++ Developer", "R&D Manager",
 * ".NET Developer" and "Front-end / Back-end Engineer" are all legitimate. The
 * rules instead target what actually makes a value junk:
 *   1. only characters that genuinely appear in job titles
 *   2. at least one real word, so "421.+-/12" is rejected
 *   3. no run of three or more symbols, which is what "+-/" and ",,,," are,
 *      while leaving "++" in C++ alone
 *
 * Returns an error message, or null when the value is acceptable. An empty
 * value is treated as valid — required-ness is enforced separately.
 */
const JOB_TEXT_ALLOWED = /^[\p{L}\p{N} .,'&\-/()+#]+$/u;
const JOB_TEXT_HAS_WORD = /\p{L}{2,}/u;
const JOB_TEXT_SYMBOL_RUN = /[.,'&\-/()+#]{3,}/;

export function validateJobTextField(label: string, value: string): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;

  if (!JOB_TEXT_ALLOWED.test(trimmed)) {
    return `${label} contains unsupported characters. Use letters, numbers and basic punctuation only.`;
  }
  if (!JOB_TEXT_HAS_WORD.test(trimmed)) {
    return `${label} must contain at least one word.`;
  }
  if (JOB_TEXT_SYMBOL_RUN.test(trimmed)) {
    return `${label} contains too many symbols in a row.`;
  }
  return null;
}
