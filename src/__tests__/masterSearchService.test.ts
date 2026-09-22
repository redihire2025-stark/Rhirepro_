import { describe, it, expect } from "vitest";
import {
  getSuggestionsSync,
  getDatabaseSkillSuggestions,
  FALLBACK_SKILLS,
  FALLBACK_DESIGNATIONS,
  type SkillSuggestion,
} from "../app/services/masterSearchService";

describe("masterSearchService", () => {
  describe("Fallback Seed Datasets", () => {
    it("has pre-seeded skills available", () => {
      expect(FALLBACK_SKILLS.length).toBeGreaterThan(100);
      expect(FALLBACK_SKILLS).toContain("React");
      expect(FALLBACK_SKILLS).toContain("Python");
      expect(FALLBACK_SKILLS).toContain("Docker");
    });

    it("has pre-seeded designations available", () => {
      expect(FALLBACK_DESIGNATIONS.length).toBeGreaterThan(20);
      expect(FALLBACK_DESIGNATIONS).toContain("Software Engineer");
      expect(FALLBACK_DESIGNATIONS).toContain("DevOps Engineer");
      expect(FALLBACK_DESIGNATIONS).toContain("Frontend Developer");
    });
  });

  describe("getSuggestionsSync (Instantaneous Keystroke Lookup)", () => {
    it("returns empty array for empty or whitespace query", () => {
      expect(getSuggestionsSync("")).toEqual([]);
      expect(getSuggestionsSync("   ")).toEqual([]);
    });

    it("finds matching skills and designations for prefix 'react'", () => {
      const results = getSuggestionsSync("react");
      expect(results.length).toBeGreaterThan(0);
      const values = results.map(r => r.value.toLowerCase());
      expect(values.some(v => v.includes("react"))).toBe(true);
    });

    it("prioritizes prefix matches so 'j' returns Java and JavaScript before any substring matches", () => {
      const results = getSuggestionsSync("j");
      expect(results.length).toBeGreaterThan(0);
      const values = results.map(r => r.value.toLowerCase());
      // First items MUST start with 'j'
      expect(values[0].startsWith("j")).toBe(true);
      expect(values).toContain("java");
      expect(values).toContain("javascript");
      // Mid-word substrings like 'django' or 'express.js' must NOT appear for 1-char query 'j'
      expect(values).not.toContain("django");
      expect(values).not.toContain("express.js");
    });

    it("categorizes suggestions accurately as 'skill' or 'designation'", () => {
      const results = getSuggestionsSync("developer");
      expect(results.length).toBeGreaterThan(0);
      const designations = results.filter(r => r.type === "designation");
      expect(designations.length).toBeGreaterThan(0);
    });

    it("respects the limit option", () => {
      const results = getSuggestionsSync("dev", { limit: 5 });
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("excludes terms in the exclude list", () => {
      const resultsWithExclude = getSuggestionsSync("react", { exclude: ["React"] });
      const values = resultsWithExclude.map(r => r.value.toLowerCase());
      expect(values).not.toContain("react");
    });

    it("filters by type when requested", () => {
      const skillResults = getSuggestionsSync("dev", { type: "skill" });
      skillResults.forEach(item => {
        expect(item.type).toBe("skill");
      });

      const desigResults = getSuggestionsSync("dev", { type: "designation" });
      desigResults.forEach(item => {
        expect(item.type).toBe("designation");
      });
    });
  });

  describe("getDatabaseSkillSuggestions (Async Unified Engine)", () => {
    it("returns suggestions asynchronously with fallback resilience", async () => {
      const results = await getDatabaseSkillSuggestions("python");
      expect(results.length).toBeGreaterThan(0);
      const hasPython = results.some(r => r.value.toLowerCase().includes("python"));
      expect(hasPython).toBe(true);
    });

    it("handles zero query without error", async () => {
      const results = await getDatabaseSkillSuggestions("");
      expect(results).toEqual([]);
    });

    it("suggests 'DevOps Engineer' even with zero candidate records", async () => {
      const results = await getDatabaseSkillSuggestions("devops");
      const values = results.map(r => r.value.toLowerCase());
      expect(values.some(v => v.includes("devops"))).toBe(true);
    });
  });
});
