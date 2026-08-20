import { describe, it, expect } from "vitest";
import {
  parseSkillExperiences,
  parseCandidateTotalExperienceYears,
  evaluateOverallExperience,
  estimateCandidateSkillExperienceYears,
  evaluateJobSkillMatrix,
  calculateCandidateExperienceMatch,
} from "../lib/experienceMatching";

describe("Overall & Skill-Specific Experience Requirements Engine", () => {
  describe("parseSkillExperiences", () => {
    it("parses record mapping correctly", () => {
      const input = { React: 3, "Node.JS": 2 };
      const parsed = parseSkillExperiences(input);
      expect(parsed).toEqual({ react: 3, "node.js": 2 });
    });

    it("parses array format correctly", () => {
      const input = [
        { skill: "React", min_years: 4 },
        { skill: "TypeScript", min_years: 2 },
      ];
      const parsed = parseSkillExperiences(input);
      expect(parsed).toEqual({ react: 4, typescript: 2 });
    });

    it("handles null or invalid input gracefully", () => {
      expect(parseSkillExperiences(null)).toEqual({});
      expect(parseSkillExperiences(undefined)).toEqual({});
    });
  });

  describe("evaluateOverallExperience", () => {
    it("identifies candidate within min and max range as ideal", () => {
      const result = evaluateOverallExperience(6, 5, 8);
      expect(result.status).toBe("ideal");
      expect(result.score).toBe(100);
      expect(result.label).toContain("Ideal fit");
    });

    it("identifies candidate below min requirement as underqualified with penalty", () => {
      const result = evaluateOverallExperience(3, 5, 8);
      expect(result.status).toBe("underqualified");
      expect(result.score).toBeLessThan(100);
      expect(result.label).toContain("Underqualified");
    });

    it("identifies candidate above max requirement as overqualified", () => {
      const result = evaluateOverallExperience(12, 5, 8);
      expect(result.status).toBe("overqualified");
      expect(result.score).toBe(70);
      expect(result.label).toContain("Overqualified");
    });

    it("handles single minimum bound requirement", () => {
      const passResult = evaluateOverallExperience(5, 5, null);
      expect(passResult.status).toBe("ideal");
      expect(passResult.score).toBe(100);

      const failResult = evaluateOverallExperience(2, 5, null);
      expect(failResult.status).toBe("underqualified");
    });
  });

  describe("estimateCandidateSkillExperienceYears", () => {
    it("calculates candidate experience years for a skill from work_experience entries", () => {
      const candidate = {
        skills: ["React", "TypeScript", "Node.js"],
        total_experience: "5 years",
        work_experience: [
          {
            title: "Senior React Engineer",
            description: "Built web applications using React and TypeScript",
            start_date: "2021-01-01",
            end_date: "2024-01-01",
            is_current: false,
          },
        ],
      };

      const reactYears = estimateCandidateSkillExperienceYears("React", candidate);
      expect(reactYears).toBe(3);
    });

    it("returns 0 if candidate does not possess the skill", () => {
      const candidate = {
        skills: ["Python", "Django"],
        total_experience: "3 years",
        work_experience: [],
      };

      const years = estimateCandidateSkillExperienceYears("React", candidate);
      expect(years).toBe(0);
    });
  });

  describe("evaluateJobSkillMatrix & calculateCandidateExperienceMatch", () => {
    it("evaluates Job Skill Matrix against candidate skill experience requirements", () => {
      const job = {
        skills: ["React", "TypeScript"],
        skill_experiences: { React: 3, TypeScript: 2 },
        experience_min: 4,
        experience_max: 8,
      };

      const candidate = {
        skills: ["React", "TypeScript"],
        total_experience: "5 years",
        work_experience: [
          {
            title: "Frontend Developer",
            description: "React and TypeScript development",
            start_date: "2019-01-01",
            end_date: "2024-01-01",
            is_current: false,
          },
        ],
      };

      const matrixEval = evaluateJobSkillMatrix(job, candidate);
      expect(matrixEval.skillMatrixScore).toBe(100);
      expect(matrixEval.items).toHaveLength(2);
      expect(matrixEval.items.every((item) => item.match)).toBe(true);

      const matchResult = calculateCandidateExperienceMatch(candidate, job);
      expect(matchResult.matchScore).toBe(100);
      expect(matchResult.overallFitStatus).toBe("ideal");
    });
  });
});
