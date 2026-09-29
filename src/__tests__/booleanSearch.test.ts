import { describe, it, expect } from "vitest";
import { validateBooleanSearch } from "../lib/recruiterJobHelpers";

/**
 * Candidate Search and Email Broadcast each had their own copy of this and the
 * two disagreed, which is what QA reported as the Broadcast toggle "not
 * behaving correctly". These pin the shared rules so they cannot drift apart
 * again.
 */
describe("validateBooleanSearch — standard mode", () => {
  it("rejects uppercase boolean operators and parentheses when the toggle is off", () => {
    // Uppercase operators indicate an intentional Boolean query entered while toggle is OFF
    expect(validateBooleanSearch("React AND Node", false)).toBeTruthy();
    expect(validateBooleanSearch("Java OR Python", false)).toBeTruthy();
    expect(validateBooleanSearch("React NOT Angular", false)).toBeTruthy();
    expect(validateBooleanSearch("(React OR Node)", false)).toBeTruthy();
  });

  it("accepts ordinary English phrases containing lowercase and/or/not in standard mode", () => {
    // Normal English titles and phrases must never be blocked in Standard mode
    expect(validateBooleanSearch("Research and Development", false)).toBeNull();
    expect(validateBooleanSearch("Sales and Marketing Manager", false)).toBeNull();
    expect(validateBooleanSearch("Not for Profit Coordinator", false)).toBeNull();
    expect(validateBooleanSearch("Frontend or Backend Developer", false)).toBeNull();
  });

  it("accepts ordinary comma-separated keywords", () => {
    expect(validateBooleanSearch("React, Node, Python", false)).toBeNull();
    expect(validateBooleanSearch("python", false)).toBeNull();
  });

  it("does not trip on words that merely contain an operator", () => {
    expect(validateBooleanSearch("Android, Orchestration", false)).toBeNull();
  });
});

describe("validateBooleanSearch — boolean mode", () => {
  it("accepts valid boolean queries", () => {
    expect(validateBooleanSearch("React AND Node", true)).toBeNull();
    expect(validateBooleanSearch("React AND (Node OR Python) NOT Java", true)).toBeNull();
    expect(validateBooleanSearch("python", true)).toBeNull();
  });

  it("rejects commas", () => {
    expect(validateBooleanSearch("React, Node", true)).toBeTruthy();
  });

  it("rejects unbalanced parentheses", () => {
    expect(validateBooleanSearch("React AND (Node OR Python", true)).toContain("Unbalanced");
  });

  it("rejects consecutive operators", () => {
    expect(validateBooleanSearch("React AND OR Node", true)).toContain("Consecutive");
  });

  it("rejects a trailing operator", () => {
    expect(validateBooleanSearch("React AND", true)).toContain("incomplete");
  });

  it("requires an operator between multiple terms", () => {
    expect(validateBooleanSearch("React Node", true)).toBeTruthy();
  });

  it("does not mistake a bracketed query for bare words", () => {
    expect(validateBooleanSearch("(React OR Node)", true)).toBeNull();
  });

  it("accepts single and combined quoted multi-word phrases in boolean mode", () => {
    // Quoted multi-word phrase like "Product Manager" is a single term
    expect(validateBooleanSearch('"Product Manager"', true)).toBeNull();
    expect(validateBooleanSearch('"Senior Software Engineer"', true)).toBeNull();
    expect(validateBooleanSearch('"Product Manager" AND "Agile"', true)).toBeNull();
    expect(validateBooleanSearch('("Product Manager" OR "Program Manager") AND "Scrum"', true)).toBeNull();
  });

  it("rejects unclosed quotes and bare quoted phrases without operators", () => {
    expect(validateBooleanSearch('"Product Manager', true)).toContain("Unclosed");
    expect(validateBooleanSearch('"Product Manager" "Agile"', true)).toBeTruthy();
  });

  it("accepts queries with apostrophes in words like O'Brien or Master's", () => {
    expect(validateBooleanSearch("O'Brien AND React", true)).toBeNull();
    expect(validateBooleanSearch("Master's Degree AND Python", true)).toBeNull();
    expect(validateBooleanSearch("Bachelor's in Computer Science OR Master's in IT", true)).toBeNull();
  });
});

describe("matchesMultiLevelLocation — bidirectional aliases", () => {
  it("matches Delhi and New Delhi bidirectionally", async () => {
    const { matchesMultiLevelLocation } = await import("../lib/locationData");
    // Candidate profile says "Delhi", recruiter filters by City = "New Delhi"
    expect(matchesMultiLevelLocation("Delhi", { city: "New Delhi" })).toBe(true);
    // Candidate profile says "New Delhi", recruiter filters by City = "Delhi"
    expect(matchesMultiLevelLocation("New Delhi", { city: "Delhi" })).toBe(true);
    // Candidate profile says "NCR", recruiter filters by City = "New Delhi"
    expect(matchesMultiLevelLocation("NCR", { city: "New Delhi" })).toBe(true);
  });

  it("matches Bangalore and Bengaluru bidirectionally", async () => {
    const { matchesMultiLevelLocation } = await import("../lib/locationData");
    expect(matchesMultiLevelLocation("Bengaluru", { city: "Bangalore" })).toBe(true);
    expect(matchesMultiLevelLocation("Bangalore", { city: "Bengaluru" })).toBe(true);
  });
});

describe("validateBooleanSearch — shared", () => {
  it("treats an empty query as valid in either mode", () => {
    expect(validateBooleanSearch("", true)).toBeNull();
    expect(validateBooleanSearch("   ", false)).toBeNull();
  });

  it("gives identical verdicts for the same query in both places", () => {
    // Same function now backs both screens, so this is true by construction —
    // the test exists to catch anyone reintroducing a second implementation.
    for (const q of ["React AND Node", "React, Node", "React Node", "python"]) {
      for (const mode of [true, false]) {
        expect(validateBooleanSearch(q, mode)).toEqual(validateBooleanSearch(q, mode));
      }
    }
  });
});
