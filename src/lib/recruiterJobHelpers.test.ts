import { describe, expect, it } from "vitest";
import { getRelevantSkillsForJobContext } from "./recruiterJobHelpers";

describe("getRelevantSkillsForJobContext", () => {
  it("keeps only skills that align with the job title and JD context", () => {
    const relevant = getRelevantSkillsForJobContext(
      "Frontend Developer",
      "<p>We are hiring a React Engineer to build responsive interfaces with TypeScript and modern UI patterns.</p>",
      ["React", "TypeScript", "JavaScript", "Marketing"],
      ["React", "TypeScript", "JavaScript"],
    );

    expect(relevant).toEqual(["React", "TypeScript", "JavaScript"]);
  });

  it("accepts a recruiter-added skill when it is similar to a suggested role-aligned skill", () => {
    const relevant = getRelevantSkillsForJobContext(
      "Frontend Developer",
      "<p>We are hiring a React Engineer to build responsive interfaces with TypeScript and modern UI patterns.</p>",
      ["React JS", "TypeScript", "JavaScript"],
      ["React", "TypeScript", "JavaScript"],
    );

    expect(relevant).toEqual(["React JS", "TypeScript", "JavaScript"]);
  });

  it("returns an empty list when the selected skills do not map to the job context", () => {
    const relevant = getRelevantSkillsForJobContext(
      "Frontend Developer",
      "<p>We are hiring a React Engineer to build responsive interfaces with TypeScript.</p>",
      ["Sales", "Negotiation", "Customer Success"],
      ["React", "TypeScript", "JavaScript"],
    );

    expect(relevant).toEqual([]);
  });
});
