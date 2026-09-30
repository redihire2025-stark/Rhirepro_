import { fuzzyMatch, skillsMatch } from "./skillKeywords";
import { decryptPhone } from "./phoneProtection";

export interface BooleanCandidateProfile {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  headline?: string | null;
  current_title?: string | null;
  current_company?: string | null;
  about?: string | null;
  skills?: string[] | null;
  work_experience?: Array<{
    title?: string | null;
    company?: string | null;
    description?: string | null;
  }> | null;
}

type TokenType = "LPAREN" | "RPAREN" | "AND" | "OR" | "NOT" | "TERM";

interface Token {
  type: TokenType;
  value: string;
}

/**
 * Checks if a query string contains Boolean search operators, parentheses, or quoted phrases.
 */
export function isBooleanQuery(query: string): boolean {
  if (!query || typeof query !== "string") return false;
  const trimmed = query.trim();
  if (!trimmed) return false;

  // Contains Boolean operators (AND, OR, NOT as whole words)
  if (/\b(?:AND|OR|NOT)\b/i.test(trimmed)) return true;

  // Contains grouping parentheses
  if (/[()]/.test(trimmed)) return true;

  // Contains explicit quoted phrases like "ServiceNow Developer"
  if (/"[^"]+"/.test(trimmed)) return true;

  return false;
}

/**
 * Tokenizes a search query string respecting quoted phrases, operators, and parentheses.
 */
export function tokenizeBooleanQuery(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // Skip whitespace and commas
    if (/\s/.test(ch) || ch === ",") {
      i++;
      continue;
    }

    // Parentheses
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }

    // Quoted strings: "ServiceNow Developer" (double quotes only; apostrophes like O'Brien or Master's are word characters)
    if (ch === '"') {
      i++;
      let phrase = "";
      while (i < len && input[i] !== '"') {
        phrase += input[i];
        i++;
      }
      if (i < len && input[i] === '"') {
        i++; // skip closing quote
      }
      const trimmedPhrase = phrase.trim();
      if (trimmedPhrase) {
        tokens.push({ type: "TERM", value: trimmedPhrase });
      }
      continue;
    }

    // Unquoted word/term (preserves apostrophes in words like O'Brien or Master's)
    let word = "";
    while (i < len && !/\s/.test(input[i]) && input[i] !== "(" && input[i] !== ")" && input[i] !== '"' && input[i] !== ",") {
      word += input[i];
      i++;
    }

    if (word) {
      const upper = word.toUpperCase();
      if (upper === "AND") {
        tokens.push({ type: "AND", value: "AND" });
      } else if (upper === "OR") {
        tokens.push({ type: "OR", value: "OR" });
      } else if (upper === "NOT") {
        tokens.push({ type: "NOT", value: "NOT" });
      } else {
        tokens.push({ type: "TERM", value: word });
      }
    }
  }

  return tokens;
}

/**
 * Extracts all clean leaf terms from a Boolean query.
 * Useful for building database queries (ILIKE, Supabase overlaps) without syntax errors.
 * Example: ("ServiceNow" OR "ServiceNow Developer") AND ("Agentic AI" OR "AI")
 * Returns: ["ServiceNow", "ServiceNow Developer", "Agentic AI", "AI"]
 */
export function extractSearchTerms(query: string): string[] {
  if (!query || !query.trim()) return [];
  const tokens = tokenizeBooleanQuery(query);
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const token of tokens) {
    if (token.type === "TERM") {
      const clean = token.value.trim();
      const lower = clean.toLowerCase();
      if (clean && !seen.has(lower)) {
        seen.add(lower);
        terms.push(clean);
      }
    }
  }

  return terms;
}

export type ASTNode =
  | { type: "TERM"; value: string }
  | { type: "NOT"; child: ASTNode }
  | { type: "AND"; left: ASTNode; right: ASTNode }
  | { type: "OR"; left: ASTNode; right: ASTNode };

class BooleanParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | null {
    return this.tokens[this.pos] || null;
  }

  private consume(): Token | null {
    return this.tokens[this.pos++] || null;
  }

  parse(): ASTNode | null {
    if (this.tokens.length === 0) return null;
    const node = this.parseOr();
    return node;
  }

  // OrExpr := AndExpr ( 'OR' AndExpr )*
  private parseOr(): ASTNode | null {
    let left = this.parseAnd();
    if (!left) return null;

    while (this.peek()?.type === "OR") {
      this.consume(); // consume 'OR'
      const right = this.parseAnd();
      if (right) {
        left = { type: "OR", left, right };
      }
    }

    return left;
  }

  // AndExpr := NotExpr ( ('AND')? NotExpr )*
  private parseAnd(): ASTNode | null {
    let left = this.parseNot();
    if (!left) return null;

    while (true) {
      const next = this.peek();
      if (!next || next.type === "RPAREN" || next.type === "OR") break;

      if (next.type === "AND") {
        this.consume(); // consume 'AND'
        const right = this.parseNot();
        if (right) {
          left = { type: "AND", left, right };
        }
      } else if (next.type === "NOT" || next.type === "LPAREN" || next.type === "TERM") {
        // Implicit AND between adjacent terms/groups
        const right = this.parseNot();
        if (right) {
          left = { type: "AND", left, right };
        }
      } else {
        break;
      }
    }

    return left;
  }

  // NotExpr := 'NOT' NotExpr | Primary
  private parseNot(): ASTNode | null {
    if (this.peek()?.type === "NOT") {
      this.consume();
      const child = this.parseNot();
      if (child) {
        return { type: "NOT", child };
      }
      return null;
    }
    return this.parsePrimary();
  }

  // Primary := '(' OrExpr ')' | TERM
  private parsePrimary(): ASTNode | null {
    const token = this.peek();
    if (!token) return null;

    if (token.type === "LPAREN") {
      this.consume();
      const expr = this.parseOr();
      if (this.peek()?.type === "RPAREN") {
        this.consume();
      }
      return expr;
    }

    if (token.type === "TERM") {
      this.consume();
      return { type: "TERM", value: token.value };
    }

    // If there's an unexpected operator, skip it to prevent hard crash
    this.consume();
    return null;
  }
}

/**
 * Evaluates an AST Node against a term-matcher function.
 */
function evaluateNode(node: ASTNode | null, matchFn: (term: string) => boolean): boolean {
  if (!node) return true;

  switch (node.type) {
    case "TERM":
      return matchFn(node.value);
    case "NOT":
      return !evaluateNode(node.child, matchFn);
    case "AND":
      return evaluateNode(node.left, matchFn) && evaluateNode(node.right, matchFn);
    case "OR":
      return evaluateNode(node.left, matchFn) || evaluateNode(node.right, matchFn);
    default:
      return true;
  }
}

/**
 * Safely checks if a candidate skill matches a search term.
 * Guarantees that short tokens (e.g. "r", "c", "ai") strictly enforce
 * word boundaries so that terms like "r" never highlight words like
 * "Operations", "Recruitment", "Onboarding", "Payroll", or "HR Operations".
 */
export function skillMatchesSearchTerm(candidateSkill: string, term: string): boolean {
  const s = (candidateSkill || "").toLowerCase().trim();
  const t = (term || "").toLowerCase().trim();
  if (!s || !t) return false;

  if (s === t) return true;
  if (skillsMatch(s, t)) return true;

  const isShort = t.length < 3;
  const escapedT = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundaryRegexT = new RegExp(`\\b${escapedT}\\b`, "i");

  // If query term is short (e.g. "r", "c", "ai"): require term to be a whole word in skill s
  if (isShort) {
    return boundaryRegexT.test(s);
  }

  const escapedS = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundaryRegexS = new RegExp(`\\b${escapedS}\\b`, "i");

  // If candidate skill is short (e.g. "ai", "go", "r"): require skill to be a whole word in query term t (e.g. "ai" in "ai engineer")
  if (s.length < 3) {
    return boundaryRegexS.test(t);
  }

  // Require whole-word boundaries in both directions (e.g. "React" in "React Native", "Java" in "Core Java", or "React" in "Senior React Developer").
  // Prevents "java" from erroneously matching "javascript", "go" from matching "django" or "algorithm", etc.
  if (boundaryRegexT.test(s) || boundaryRegexS.test(t)) {
    return true;
  }

  // Typo tolerance: only for terms of similar length (e.g. "javascrpt" vs "javascript")
  if (Math.abs(s.length - t.length) <= 2 && s.length >= 4 && t.length >= 4) {
    return fuzzyMatch(t, s);
  }

  return false;
}

/**
 * Checks if a candidate profile matches a single search term.
 * Checks skills, titles, headlines, work experience, about section, name, email, and decrypted phone.
 */
export function candidateMatchesTerm(candidate: BooleanCandidateProfile, term: string): boolean {
  const t = term.toLowerCase().trim();
  if (!t) return false;

  const isShort = t.length < 3;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundaryRegex = new RegExp(`\\b${escaped}\\b`, "i");

  // Helper for safe text matching that requires whole-word/boundary matching
  // and prevents substrings like "java" from matching inside "javascript"
  const textMatches = (text?: string): boolean => {
    if (!text) return false;
    if (boundaryRegex.test(text)) return true;
    // Controlled typo tolerance: only for 4+ char terms matching a single word of similar length
    if (!isShort && t.length >= 4) {
      const words = text.toLowerCase().split(/\s+/).filter(Boolean);
      return words.some(w => Math.abs(w.length - t.length) <= 1 && fuzzyMatch(t, w));
    }
    return false;
  };

  // 1. Check Candidate Skills (exact, alias, synonym, fuzzy, boundary-safe)
  const cSkills = candidate.skills || [];
  if (cSkills.some(s => skillMatchesSearchTerm(s, t))) {
    return true;
  }

  // 2. Candidate Name
  if (textMatches(candidate.first_name) || textMatches(candidate.last_name)) return true;
  const fullName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
  if (fullName && textMatches(fullName)) return true;

  // 3. Current Title & Headline
  if (textMatches(candidate.current_title) || textMatches(candidate.headline)) return true;

  // 4. Candidate Email - short 1-2 char terms (like "r" or "c") must NEVER match email substrings (e.g. "@rhirepro")
  if (!isShort && candidate.email) {
    const emailLower = candidate.email.toLowerCase();
    if (emailLower === t || boundaryRegex.test(candidate.email)) return true;
    const atIdx = emailLower.indexOf("@");
    const userPart = atIdx > 0 ? emailLower.slice(0, atIdx) : emailLower;
    if (userPart.includes(t) && t.length >= 3) return true;
  }

  // 5. Decrypted Phone
  if (candidate.phone) {
    const cleanDigits = t.replace(/[\s\-\+\(\)]/g, "");
    if (cleanDigits.length >= 3) {
      const decPhone = decryptPhone(candidate.phone).replace(/[\s\-\+\(\)]/g, "");
      if (decPhone && decPhone.includes(cleanDigits)) return true;
    }
  }

  // 6. Work Experience
  if ((candidate.work_experience || []).some(we =>
    textMatches(we.title) ||
    textMatches(we.company) ||
    textMatches(we.description)
  )) {
    return true;
  }

  // 7. About section & Current Company
  if (textMatches(candidate.current_company) || textMatches(candidate.about)) return true;

  return false;
}

/**
 * Evaluates whether a candidate profile matches a search query using full Boolean algebra.
 * If query is a standard comma/space query, it checks that the candidate matches all terms.
 * If query is a Boolean expression, it parses and evaluates the AST.
 */
export function evaluateCandidateWithQuery(
  candidate: BooleanCandidateProfile,
  query: string,
  booleanModeOverride?: boolean
): boolean {
  const clean = query.trim();
  if (!clean) return true;

  const isBool = booleanModeOverride !== undefined ? booleanModeOverride : isBooleanQuery(clean);

  if (isBool) {
    const tokens = tokenizeBooleanQuery(clean);
    const parser = new BooleanParser(tokens);
    const ast = parser.parse();
    if (!ast) return true;

    return evaluateNode(ast, (term) => candidateMatchesTerm(candidate, term));
  } else {
    // Standard mode: comma-separated list (every segment should match)
    const segments = clean
      .split(",")
      .map(s => s.trim().replace(/^['"]+|['"]+$/g, "").trim())
      .filter(Boolean);

    if (segments.length === 0) return true;

    return segments.every(seg => candidateMatchesTerm(candidate, seg));
  }
}

/**
 * Parses a search input string into tokens, respecting Boolean mode.
 *
 * BUG-1 FIX: Extracted from RecruiterDashboard.tsx where it was duplicated
 * in both SearchCandidatesPage and EmailingPage.
 *
 * BUG-4 FIX: In standard mode, splits by comma only (not by space within
 * each segment), so multi-word skills like "Machine Learning" stay intact
 * instead of being split into ["Machine", "Learning"].
 */
export function parseSearchTokens(
  input: string,
  booleanEnabled: boolean
): { tokens: string[]; isOr: boolean; notTokens: string[] } {
  const trimmed = input.trim();
  if (!trimmed) return { tokens: [], isOr: false, notTokens: [] };

  if (booleanEnabled) {
    // BOOLEAN SEARCH MODE (toggle is ON):
    // Commas (,) are ignored/stripped. Only AND, OR, NOT operators are respected.
    const cleanInput = trimmed.replace(/,/g, " ");

    const notTokens: string[] = [];
    const notParts = cleanInput.split(/\bnot\b/i);
    const mainPart = notParts[0];
    for (let i = 1; i < notParts.length; i++) {
      const notWord = notParts[i].trim().split(/\s+/)[0];
      if (notWord) notTokens.push(notWord.toLowerCase().replace(/^['"]+|['"]+$/g, ""));
    }

    const isOr = /\bor\b/i.test(mainPart);
    let tokens: string[] = [];

    if (isOr) {
      tokens = mainPart
        .split(/\bor\b/i)
        .map(s => s.replace(/\b(?:and|not)\b/gi, "").trim().replace(/^['"]+|['"]+$/g, "").trim())
        .filter(Boolean);
    } else {
      tokens = mainPart
        .split(/\s+/)
        .map(t => t.replace(/\b(?:and|not)\b/gi, "").trim().replace(/^['"]+|['"]+$/g, "").trim())
        .filter(t => Boolean(t) && !/^(and|or|not)$/i.test(t));
    }

    return { tokens, isOr, notTokens };
  } else {
    // STANDARD SEARCH MODE (toggle is OFF):
    // AND, OR, NOT are treated as regular text.
    // BUG-4 FIX: Split by comma only, NOT by space within segments.
    // This preserves multi-word skills: "Machine Learning, Data Science"
    // → ["Machine Learning", "Data Science"] instead of ["Machine", "Learning", "Data", "Science"]
    const tokens = trimmed
      .split(",")
      .map(s => s.trim().replace(/^['"]+|['"]+$/g, "").trim())
      .filter(Boolean);
    return { tokens, isOr: true, notTokens: [] };
  }
}

/**
 * Extracts the current search token from the input text for autocomplete.
 *
 * BUG-1 FIX: Extracted from RecruiterDashboard.tsx where it was duplicated
 * in both SearchCandidatesPage and EmailingPage.
 */
export function getCurrentSearchToken(text: string): {
  token: string;
  prefix: string;
  separatorType: "none" | "comma" | "operator";
} {
  const lastCommaIndex = text.lastIndexOf(",");
  const operatorRegex = /\b(AND|OR|NOT)\b/gi;
  let match;
  let lastOperatorIndex = -1;
  let lastOperatorLength = 0;

  while ((match = operatorRegex.exec(text)) !== null) {
    lastOperatorIndex = match.index;
    lastOperatorLength = match[0].length;
  }

  if (lastCommaIndex === -1 && lastOperatorIndex === -1) {
    return { token: text, prefix: "", separatorType: "none" as const };
  }

  if (lastCommaIndex > lastOperatorIndex) {
    const prefix = text.slice(0, lastCommaIndex + 1);
    const token = text.slice(lastCommaIndex + 1);
    return { token, prefix, separatorType: "comma" as const };
  } else {
    const prefix = text.slice(0, lastOperatorIndex + lastOperatorLength);
    const token = text.slice(lastOperatorIndex + lastOperatorLength);
    return { token, prefix, separatorType: "operator" as const };
  }
}

/**
 * BUG-10 FIX: Location aliases extracted from hardcoded if-chains into a
 * shared, extensible map. Covers Indian city renames and common international
 * abbreviations.
 */
export const LOCATION_ALIASES: Record<string, string[]> = {
  bangalore: ["bengaluru"],
  bengaluru: ["bangalore"],
  gurgaon: ["gurugram"],
  gurugram: ["gurgaon"],
  mumbai: ["bombay"],
  bombay: ["mumbai"],
  delhi: ["ncr", "new delhi"],
  ncr: ["delhi", "new delhi"],
  "new delhi": ["delhi", "ncr"],
  kolkata: ["calcutta"],
  calcutta: ["kolkata"],
  chennai: ["madras"],
  madras: ["chennai"],
  pune: ["poona"],
  poona: ["pune"],
  thiruvananthapuram: ["trivandrum"],
  trivandrum: ["thiruvananthapuram"],
  // International
  "new york": ["nyc", "new york city"],
  nyc: ["new york", "new york city"],
  "new york city": ["new york", "nyc"],
  "san francisco": ["sf", "bay area"],
  sf: ["san francisco", "bay area"],
  "bay area": ["san francisco", "sf"],
  "los angeles": ["la"],
  la: ["los angeles"],
};

/**
 * Expands a location string into all its alias variants.
 */
export function expandLocationAliases(location: string): string[] {
  const locLower = location.trim().toLowerCase();
  const variants = [locLower];
  const aliases = LOCATION_ALIASES[locLower];
  if (aliases) {
    variants.push(...aliases);
  }
  return variants;
}

/**
 * Checks whether a candidate's current or preferred location matches any of the
 * requested location filters, taking into account common aliases (e.g. Pune/Poona, Bengaluru/Bangalore).
 */
export function candidateMatchesLocations(
  candidate: { location?: string | null; preferred_location?: any },
  requestedLocations: string[]
): boolean {
  if (!requestedLocations || requestedLocations.length === 0) return true;

  const locs = [
    candidate.location,
    ...(Array.isArray(candidate.preferred_location)
      ? candidate.preferred_location
      : typeof candidate.preferred_location === "string"
        ? candidate.preferred_location.split(",").map((s: string) => s.trim())
        : [candidate.preferred_location])
  ].filter(Boolean) as string[];

  if (locs.length === 0) return false;

  return requestedLocations.some(reqLoc => {
    const cleanReq = reqLoc.trim().toLowerCase();
    if (!cleanReq) return false;
    const aliases = expandLocationAliases(cleanReq);
    return locs.some(cLoc => {
      const cClean = cLoc.trim().toLowerCase();
      return aliases.some(alias => {
        const a = alias.toLowerCase().trim();
        if (!a) return false;
        const boundaryRegex = new RegExp(`\\b${a.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i");
        return cClean.includes(a) || boundaryRegex.test(cClean);
      });
    });
  });
}

/**
 * BUG-7 FIX: BM25-inspired candidate relevance scoring extracted as a shared
 * utility so both SearchCandidatesPage and EmailingPage can rank results.
 */
export function computeCandidateRelevanceScore(
  candidate: BooleanCandidateProfile & {
    current_company?: string | null;
    work_experience?: Array<{ title?: string | null; company?: string | null; description?: string | null }> | null;
  },
  queryStr: string,
  booleanEnabled: boolean
): number {
  if (!queryStr.trim()) return 0;
  const isBool = booleanEnabled || isBooleanQuery(queryStr);
  const tokens = isBool ? extractSearchTerms(queryStr) : parseSearchTokens(queryStr.toLowerCase(), false).tokens;
  if (tokens.length === 0) return 0;

  let score = 0;
  tokens.forEach(token => {
    const t = token.toLowerCase().trim();
    if (!t) return;
    const cSkills = (candidate.skills || []).map(s => s.toLowerCase().trim());

    if (cSkills.includes(t)) {
      score += 50;
    } else if (cSkills.some(s => skillMatchesSearchTerm(s, t))) {
      score += 30;
    }

    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundaryRegex = new RegExp(`\\b${escaped}\\b`, "i");

    if (candidate.current_title && boundaryRegex.test(candidate.current_title)) {
      score += 40;
    }
    if (candidate.headline && boundaryRegex.test(candidate.headline)) {
      score += 25;
    }
    const isShortToken = t.length < 3;
    if (candidate.current_company && (boundaryRegex.test(candidate.current_company) || (!isShortToken && fuzzyMatch(t, candidate.current_company)))) {
      score += 45;
    }
    if ((candidate.work_experience || []).some(we => we.title && boundaryRegex.test(we.title))) {
      score += 15;
    }
    if ((candidate.work_experience || []).some(we => we.company && (boundaryRegex.test(we.company) || (!isShortToken && fuzzyMatch(t, we.company))))) {
      score += 35;
    }
  });

  return score;
}

