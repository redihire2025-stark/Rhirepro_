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

/**
 * Validates a candidate-search query for the current Boolean mode.
 *
 * Candidate Search and Email Broadcast each had their own copy of this and they
 * disagreed: the main search rejected commas in Boolean mode and rejected
 * AND/OR/NOT in standard mode, while Broadcast checked only bracket balance and
 * operator placement and validated nothing at all in standard mode. So the same
 * query behaved differently in the two places, and in Broadcast "React AND Node"
 * with the toggle off was quietly searched as literal text.
 *
 * This is the union of both: the mode rules from Candidate Search plus the
 * syntax checks Broadcast had, which the main search was missing.
 *
 * Returns an error message, or null when the query is usable.
 */
export function validateBooleanSearch(keywords: string, booleanEnabled: boolean): string | null {
  const trimmed = (keywords || "").trim();
  if (!trimmed) return null;

  if (!booleanEnabled) {
    if (/\b(AND|OR|NOT)\b|[()]/.test(trimmed)) {
      return "Boolean operators (AND, OR, NOT) are not allowed in Standard mode. Please turn ON Boolean Search to use boolean operators.";
    }
    return null;
  }

  if (trimmed.includes(",")) {
    return "In Boolean Search mode, commas are not allowed. Please use AND, OR, or NOT operators between skills (e.g., Python AND React).";
  }

  const quoteCount = (trimmed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    return "Unclosed quotation mark. Please ensure all quoted phrases have matching opening and closing quotes.";
  }

  const openParen = (trimmed.match(/\(/g) || []).length;
  const closeParen = (trimmed.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    return `Unbalanced parentheses: ${openParen} opening vs ${closeParen} closing bracket.`;
  }

  if (/\b(AND|OR|NOT)\s+(AND|OR|NOT)\b/i.test(trimmed)) {
    return "Consecutive boolean operators found (e.g. 'AND OR'). Please check operator syntax.";
  }

  if (/\b(AND|OR|NOT)\s*$/i.test(trimmed)) {
    return "Query ends with an incomplete boolean operator (e.g. 'AND'). Add a search term after it.";
  }

  // Treat double-quoted phrases as a single term and ignore grouping parentheses
  // so expressions like '"Product Manager"' or '(React OR Node)' are not mistaken for bare words.
  // Note: apostrophes in words like O'Brien or Master's are preserved as word characters.
  const normalizedForWordCheck = trimmed
    .replace(/"[^"]*"/g, " __PHRASE__ ")
    .replace(/[()]/g, " ");

  const words = normalizedForWordCheck.split(/\s+/).filter(Boolean);
  if (words.length > 1 && !words.some((w) => /^(and|or|not)$/i.test(w))) {
    return "In Boolean Search mode, please use AND, OR, or NOT operators between skills (e.g., Python AND React).";
  }

  return null;
}
