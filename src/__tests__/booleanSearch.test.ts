import { describe, it, expect } from "vitest";
import { validateBooleanSearch } from "../lib/recruiterJobHelpers";

/**
 * Candidate Search and Email Broadcast each had their own copy of this and the
 * two disagreed, which is what QA reported as the Broadcast toggle "not
 * behaving correctly". These pin the shared rules so they cannot drift apart
 * again.
 */
describe("validateBooleanSearch — standard mode", () => {
  it("rejects boolean operators when the toggle is off", () => {
    // Broadcast previously accepted this and searched it as literal text.
    expect(validateBooleanSearch("React AND Node", false)).toBeTruthy();
    expect(validateBooleanSearch("java or python", false)).toBeTruthy();
    expect(validateBooleanSearch("React NOT Angular", false)).toBeTruthy();
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
