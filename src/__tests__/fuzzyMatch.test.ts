import { describe, it, expect } from "vitest";
import { fuzzyMatch } from "../lib/skillKeywords";

/**
 * Pins the exact cases from the QA report. fuzzyMatch previously forgave 2
 * edits regardless of query length, so at 3-4 characters almost any word
 * matched — the dropdowns looked like they were not filtering at all.
 */
describe("fuzzyMatch — reported dropdown noise", () => {
  it('"hyd" no longer matches unrelated short place names', () => {
    // Every one of these is exactly 2 edits from "hyd".
    for (const noise of ["Bid", "Khed", "Kud", "Dod Ballapur", "Guru Har Sahai", "Karanja Lad"]) {
      expect(fuzzyMatch("hyd", noise)).toBe(false);
    }
  });

  it('"hyd" still finds Hyderabad', () => {
    expect(fuzzyMatch("hyd", "Hyderabad")).toBe(true);
  });

  it('"html" no longer matches unrelated skills', () => {
    for (const noise of ["AML Compliance", "ETL", "Home Care", "Home Nursing", "Hotel Booking", "Hotel Operations", "HT LT Panels"]) {
      expect(fuzzyMatch("html", noise)).toBe(false);
    }
  });

  it('"html" still finds HTML', () => {
    expect(fuzzyMatch("html", "HTML")).toBe(true);
  });
});

describe("fuzzyMatch — behaviour that must be preserved", () => {
  it("still matches on substrings, which is how short queries work", () => {
    expect(fuzzyMatch("java", "Java Developer")).toBe(true);
    expect(fuzzyMatch("react", "React Native")).toBe(true);
    expect(fuzzyMatch("ban", "Bangalore")).toBe(true);
  });

  it("still forgives genuine typos in longer words", () => {
    expect(fuzzyMatch("javascrpt", "JavaScript")).toBe(true);
    expect(fuzzyMatch("kubernets", "Kubernetes")).toBe(true);
    expect(fuzzyMatch("hyderbad", "Hyderabad")).toBe(true);
  });

  it("is case-insensitive and ignores surrounding space", () => {
    expect(fuzzyMatch("  HTML  ", "html")).toBe(true);
  });

  it("treats an empty query as matching everything", () => {
    expect(fuzzyMatch("", "anything")).toBe(true);
  });

  it("requires every query token to match somewhere in the target", () => {
    expect(fuzzyMatch("senior react", "Senior React Developer")).toBe(true);
    expect(fuzzyMatch("senior python", "Senior React Developer")).toBe(false);
  });
});
