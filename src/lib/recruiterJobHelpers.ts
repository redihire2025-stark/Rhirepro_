import { SEARCH_SUGGESTION_DATASET, SKILL_OPTIONS, fuzzyMatch, getSkillSearchTerms, skillsMatch } from "./skillKeywords";

export function extractTextFromHtml(value: string): string {
  if (!value) return "";
  const temp = document.createElement("div");
  temp.innerHTML = value;
  return (temp.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRelevantSkillsForJobContext(jobTitle: string, jobDescription: string, selectedSkills: string[]): string[] {
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

  return selectedSkills.filter((skill) => {
    const normalizedSkill = skill.trim();
    if (!normalizedSkill) return false;

    const skillText = normalizedSkill.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!skillText) return false;

    if (normalizedContext.includes(skillText)) return true;

    const skillTerms = getSkillSearchTerms(normalizedSkill)
      .map((term) => term.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    if (skillTerms.some((term) => contextTokens.has(term))) return true;
    if (skillTerms.some((term) => normalizedContext.includes(term))) return true;
    if (skillsMatch(normalizedSkill, titleText) || skillsMatch(normalizedSkill, descriptionText)) return true;
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
