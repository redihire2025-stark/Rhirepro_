import { describe, it, expect } from "vitest";
import {
  isBooleanQuery,
  tokenizeBooleanQuery,
  extractSearchTerms,
  evaluateCandidateWithQuery,
  candidateMatchesTerm,
  skillMatchesSearchTerm,
  computeCandidateRelevanceScore,
  type BooleanCandidateProfile,
} from "../lib/booleanSearchEvaluator";

describe("booleanSearchEvaluator", () => {
  const seniorQuery = '("ServiceNow" OR "ServiceNow Developer") AND ("Agentic AI" OR "AI") AND ("REST API" OR "REST") AND ("JavaScript")';

  describe("isBooleanQuery", () => {
    it("detects complex boolean queries with operators and parentheses", () => {
      expect(isBooleanQuery(seniorQuery)).toBe(true);
      expect(isBooleanQuery("React AND Node")).toBe(true);
      expect(isBooleanQuery("React OR Vue")).toBe(true);
      expect(isBooleanQuery("(React OR Angular)")).toBe(true);
      expect(isBooleanQuery('"ServiceNow Developer"')).toBe(true);
    });

    it("returns false for plain comma-separated skill lists", () => {
      expect(isBooleanQuery("React, Node, TypeScript")).toBe(false);
      expect(isBooleanQuery("Python")).toBe(false);
      expect(isBooleanQuery("")).toBe(false);
    });
  });

  describe("extractSearchTerms", () => {
    it("extracts clean unquoted terms from complex grouped expressions", () => {
      const terms = extractSearchTerms(seniorQuery);
      expect(terms).toEqual([
        "ServiceNow",
        "ServiceNow Developer",
        "Agentic AI",
        "AI",
        "REST API",
        "REST",
        "JavaScript",
      ]);
    });
  });

  describe("evaluateCandidateWithQuery — Senior Recruiter Query", () => {
    it("matches a candidate who has ServiceNow, AI, REST API, and JavaScript", () => {
      const candidate: BooleanCandidateProfile = {
        first_name: "Rahul",
        last_name: "Sharma",
        skills: ["ServiceNow", "AI", "REST API", "JavaScript"],
      };

      expect(evaluateCandidateWithQuery(candidate, seniorQuery)).toBe(true);
    });

    it("matches a candidate where 'ServiceNow Developer' is in title, 'Agentic AI' in headline, and 'REST' and 'JavaScript' in skills", () => {
      const candidate: BooleanCandidateProfile = {
        first_name: "Anita",
        last_name: "Deshmukh",
        current_title: "Senior ServiceNow Developer",
        headline: "Specialist in Agentic AI and Autonomous Agents",
        skills: ["REST", "JavaScript", "TypeScript"],
      };

      expect(evaluateCandidateWithQuery(candidate, seniorQuery)).toBe(true);
    });

    it("rejects a candidate missing the AI requirement", () => {
      const candidate: BooleanCandidateProfile = {
        first_name: "Vikram",
        last_name: "Patel",
        skills: ["ServiceNow", "REST API", "JavaScript"],
      };

      expect(evaluateCandidateWithQuery(candidate, seniorQuery)).toBe(false);
    });

    it("rejects a candidate missing the ServiceNow requirement", () => {
      const candidate: BooleanCandidateProfile = {
        first_name: "Sneha",
        last_name: "Rao",
        skills: ["Agentic AI", "AI", "REST API", "REST", "JavaScript"],
      };

      expect(evaluateCandidateWithQuery(candidate, seniorQuery)).toBe(false);
    });

    it("handles NOT operator correctly: (React OR Vue) NOT Angular", () => {
      const query = "(React OR Vue) NOT Angular";

      const candidateWithReact: BooleanCandidateProfile = {
        skills: ["React", "JavaScript"],
      };
      expect(evaluateCandidateWithQuery(candidateWithReact, query)).toBe(true);

      const candidateWithAngular: BooleanCandidateProfile = {
        skills: ["React", "Angular"],
      };
      expect(evaluateCandidateWithQuery(candidateWithAngular, query)).toBe(false);
    });

    it("prevents short skill abbreviations from matching unrelated substrings (e.g. AI in email)", () => {
      const candidateAI: BooleanCandidateProfile = {
        skills: ["AI"],
      };
      // "email" contains "ai", but is NOT a match for skill "AI"
      expect(candidateMatchesTerm(candidateAI, "email")).toBe(false);
      expect(candidateMatchesTerm(candidateAI, "chair")).toBe(false);
      // Legitimate queries for AI should still match
      expect(candidateMatchesTerm(candidateAI, "AI")).toBe(true);
      expect(candidateMatchesTerm(candidateAI, "AI Engineer")).toBe(true);

      const candidateGo: BooleanCandidateProfile = {
        skills: ["Go"],
      };
      // "algorithm" contains "go", but is NOT a match for skill "Go"
      expect(candidateMatchesTerm(candidateGo, "algorithm")).toBe(false);
      expect(candidateMatchesTerm(candidateGo, "Go")).toBe(true);
      expect(candidateMatchesTerm(candidateGo, "Go Developer")).toBe(true);

      const candidateR: BooleanCandidateProfile = {
        skills: ["R"],
      };
      // "senior" contains "r", but is NOT a match for skill "R"
      expect(candidateMatchesTerm(candidateR, "senior")).toBe(false);
      expect(candidateMatchesTerm(candidateR, "R")).toBe(true);

      // Candidates who merely have 'r' inside title (Engineer), name (Rahul), or email (@rhirepro) must NOT match query "r"
      const candidateDevOps: BooleanCandidateProfile = {
        first_name: "Rahul",
        last_name: "Verma",
        current_title: "DevOps Engineer",
        email: "rahul@rhirepro-loadtest.invalid",
        skills: ["DevOps", "Kubernetes", "Docker", "AWS", "Terraform", "CI/CD", "Jenkins"],
      };
      expect(candidateMatchesTerm(candidateDevOps, "r")).toBe(false);
      expect(evaluateCandidateWithQuery(candidateDevOps, "r", false)).toBe(false);
      expect(evaluateCandidateWithQuery(candidateDevOps, "r", true)).toBe(false);

      // Candidate with actual R skill MUST match query "r" in both standard and boolean modes
      const candidateRDataScientist: BooleanCandidateProfile = {
        first_name: "Sunil",
        current_title: "Data Analyst",
        skills: ["R", "SQL", "Statistics"],
      };
      expect(candidateMatchesTerm(candidateRDataScientist, "r")).toBe(true);
      expect(evaluateCandidateWithQuery(candidateRDataScientist, "r", false)).toBe(true);
      expect(evaluateCandidateWithQuery(candidateRDataScientist, "r", true)).toBe(true);
    });

    it("evaluates 'React AND Node' strictly: JavaScript candidates without Node must NOT match", () => {
      const query = "React AND Node";

      // 1. Candidate with ONLY JavaScript must not match React or Node
      const jsOnly: BooleanCandidateProfile = {
        skills: ["JavaScript"],
      };
      expect(candidateMatchesTerm(jsOnly, "Node")).toBe(false);
      expect(candidateMatchesTerm(jsOnly, "React")).toBe(false);
      expect(evaluateCandidateWithQuery(jsOnly, query)).toBe(false);

      // 2. Candidate with React + JavaScript (no Node) must NOT match React AND Node
      const reactJsOnly: BooleanCandidateProfile = {
        first_name: "Teja",
        headline: "BTech Graduate",
        skills: ["React", "JavaScript", "Java", "Python", "HTML", "CSS"],
      };
      expect(evaluateCandidateWithQuery(reactJsOnly, query)).toBe(false);

      // 3. Candidate with React + Node.js MUST match React AND Node
      const fullstackCandidate: BooleanCandidateProfile = {
        first_name: "Suvarna",
        skills: ["React", "JavaScript", "Node.js"],
      };
      expect(evaluateCandidateWithQuery(fullstackCandidate, query)).toBe(true);

      // 4. Candidate with explicit Node skill MUST match
      const explicitNodeCandidate: BooleanCandidateProfile = {
        first_name: "Alex",
        skills: ["React", "Node"],
      };
      expect(evaluateCandidateWithQuery(explicitNodeCandidate, query)).toBe(true);
    });

    it("preserves apostrophes in words like O'Brien, Master's, Bachelor's without swallowing operators", () => {
      const query1 = "O'Brien AND React";
      const candidate1: BooleanCandidateProfile = {
        last_name: "O'Brien",
        skills: ["React"],
      };
      const candidateWrongLastName: BooleanCandidateProfile = {
        last_name: "Smith",
        skills: ["React"],
      };
      expect(evaluateCandidateWithQuery(candidate1, query1)).toBe(true);
      expect(evaluateCandidateWithQuery(candidateWrongLastName, query1)).toBe(false);

      const query2 = "Master's Degree AND Python";
      const candidate2: BooleanCandidateProfile = {
        about: "Holds a Master's Degree in CS",
        skills: ["Python"],
      };
      const candidateNoDegree: BooleanCandidateProfile = {
        about: "High school graduate",
        skills: ["Python"],
      };
      expect(evaluateCandidateWithQuery(candidate2, query2)).toBe(true);
      expect(evaluateCandidateWithQuery(candidateNoDegree, query2)).toBe(false);
    });

    it("matches candidates by company name in current_company and work_experience", () => {
      // 1. Candidate with current_company matching query
      const candidateCurrentComp: BooleanCandidateProfile = {
        first_name: "Raju",
        current_company: "Google",
        skills: ["Go", "Kubernetes"],
      };
      expect(candidateMatchesTerm(candidateCurrentComp, "Google")).toBe(true);
      expect(evaluateCandidateWithQuery(candidateCurrentComp, '("Google" OR "Amazon") AND "Kubernetes"')).toBe(true);
      expect(evaluateCandidateWithQuery(candidateCurrentComp, '("Microsoft" OR "Apple") AND "Kubernetes"')).toBe(false);

      // 2. Candidate with company in work_experience matching query
      const candidatePastExp: BooleanCandidateProfile = {
        first_name: "Pavithran",
        current_company: "Stealth Startup",
        work_experience: [
          { company: "Persistent System Limited", title: "Senior DevOps Engineer" },
          { company: "Nuivio ventures", title: "DevOps Engineer" },
        ],
        skills: ["AWS", "Terraform", "Docker"],
      };
      expect(candidateMatchesTerm(candidatePastExp, "Persistent System Limited")).toBe(true);
      expect(candidateMatchesTerm(candidatePastExp, "Persistent")).toBe(true);
      expect(candidateMatchesTerm(candidatePastExp, "Nuivio")).toBe(true);
      expect(evaluateCandidateWithQuery(candidatePastExp, '("Persistent" OR "Infosys") AND "Docker"')).toBe(true);
      expect(evaluateCandidateWithQuery(candidatePastExp, '("Wipro" OR "TCS") AND "Docker"')).toBe(false);

      // 3. Relevance scoring prioritizes company matches
      const scoreWithCompany = computeCandidateRelevanceScore(candidateCurrentComp, "Google", false);
      const scoreWithoutCompany = computeCandidateRelevanceScore({ first_name: "John", skills: ["Go"] }, "Google", false);
      expect(scoreWithCompany).toBeGreaterThan(scoreWithoutCompany);
    });
  });

  describe("skillMatchesSearchTerm — Tag Highlighting & Precise Matching", () => {
    it("never highlights skill tags containing the letter 'r' when searching 'r'", () => {
      // Reported bug: Operations, Recruitment, Onboarding, Payroll, HR Operations all contain 'r'
      // and were incorrectly highlighted when searching 'r'
      expect(skillMatchesSearchTerm("Operations", "r")).toBe(false);
      expect(skillMatchesSearchTerm("Recruitment", "r")).toBe(false);
      expect(skillMatchesSearchTerm("Onboarding", "r")).toBe(false);
      expect(skillMatchesSearchTerm("Payroll", "r")).toBe(false);
      expect(skillMatchesSearchTerm("HR Operations", "r")).toBe(false);
      expect(skillMatchesSearchTerm("Employee Engagement", "r")).toBe(false);
      expect(skillMatchesSearchTerm("React", "r")).toBe(false);
      expect(skillMatchesSearchTerm("Redux", "r")).toBe(false);
      expect(skillMatchesSearchTerm("REST API", "r")).toBe(false);
    });

    it("correctly highlights genuine R language skill variations", () => {
      expect(skillMatchesSearchTerm("R", "r")).toBe(true);
      expect(skillMatchesSearchTerm("R Programming", "r")).toBe(true);
      expect(skillMatchesSearchTerm("R Language", "r")).toBe(true);
      expect(skillMatchesSearchTerm("R", "R Programming")).toBe(true);
    });

    it("handles other single/double-letter skills safely", () => {
      expect(skillMatchesSearchTerm("C", "c")).toBe(true);
      expect(skillMatchesSearchTerm("C Programming", "c")).toBe(true);
      expect(skillMatchesSearchTerm("CSS", "c")).toBe(false);
      expect(skillMatchesSearchTerm("Cloud Computing", "c")).toBe(false);

      expect(skillMatchesSearchTerm("Go", "go")).toBe(true);
      expect(skillMatchesSearchTerm("Golang", "go")).toBe(true);
      expect(skillMatchesSearchTerm("Algorithm", "go")).toBe(false);

      expect(skillMatchesSearchTerm("AI", "ai")).toBe(true);
      expect(skillMatchesSearchTerm("Artificial Intelligence", "ai")).toBe(true);
      expect(skillMatchesSearchTerm("Email", "ai")).toBe(false);
      expect(skillMatchesSearchTerm("Chair", "ai")).toBe(false);
    });

    it("strictly separates Java and JavaScript so that Java candidates never match JavaScript", () => {
      // "Java" must NOT match "JavaScript" and vice-versa
      expect(skillMatchesSearchTerm("Java", "JavaScript")).toBe(false);
      expect(skillMatchesSearchTerm("JavaScript", "Java")).toBe(false);

      // Whole word variants still work properly
      expect(skillMatchesSearchTerm("Core Java", "Java")).toBe(true);
      expect(skillMatchesSearchTerm("Java Developer", "Java")).toBe(true);
      expect(skillMatchesSearchTerm("Vanilla JavaScript", "JavaScript")).toBe(true);

      // Candidate with "JavaScript" in About or Experience description must NOT match "Java"
      const candidateDasari = {
        first_name: "Dasari",
        last_name: "Chandra",
        headline: "Senior Software Engineer & Game Developer | Unity 2D/3D, AR, React, TypeScript",
        skills: ["JavaScript", "React", "TypeScript", "HTML", "CSS", "Tailwind CSS", "PHP"],
        about: "Skilled in Unity (2D/3D), PlayCanvas, Three.js, React, TypeScript, JavaScript, and AR development.",
        work_experience: [
          { company: "Global Health X", title: "Senior Software Developer", description: "Worked with Three.js, TypeScript, and JavaScript to deliver high-performance interactive experiences." },
        ],
      };

      expect(candidateMatchesTerm(candidateDasari, "JavaScript")).toBe(true);
      expect(candidateMatchesTerm(candidateDasari, "Java")).toBe(false);
      expect(evaluateCandidateWithQuery(candidateDasari, "Java AND JavaScript", true)).toBe(false);
    });

    it("reliably matches candidates by email, phone number, and company name", () => {
      const candidate: BooleanCandidateProfile = {
        first_name: "Pooja",
        last_name: "Reddy",
        email: "pooja.reddy@techcorp.com",
        phone: "+91 98765 43210",
        current_company: "Infosys",
        work_experience: [
          { company: "Tata Consultancy Services", title: "Software Engineer" },
        ],
        skills: ["Java", "Spring Boot"],
      };

      // Email tests
      expect(candidateMatchesTerm(candidate, "pooja.reddy@techcorp.com")).toBe(true);
      expect(candidateMatchesTerm(candidate, "pooja.reddy")).toBe(true);
      expect(candidateMatchesTerm(candidate, "pooja")).toBe(true);
      // Domain noise should NOT match unrelated terms
      expect(candidateMatchesTerm(candidate, "corp")).toBe(false);

      // Phone tests
      expect(candidateMatchesTerm(candidate, "9876543210")).toBe(true);
      expect(candidateMatchesTerm(candidate, "+91 98765 43210")).toBe(true);
      expect(candidateMatchesTerm(candidate, "98765")).toBe(true);

      // Company tests
      expect(candidateMatchesTerm(candidate, "Infosys")).toBe(true);
      expect(candidateMatchesTerm(candidate, "Tata Consultancy Services")).toBe(true);
      expect(candidateMatchesTerm(candidate, "TCS")).toBe(false); // only exact/fuzzy full terms
      expect(evaluateCandidateWithQuery(candidate, "Infosys AND Java", true)).toBe(true);
      expect(evaluateCandidateWithQuery(candidate, "Infosys AND Python", true)).toBe(false);
    });
  });
});


