import { describe, it, expect } from "vitest";
import { validateJobTextField } from "../lib/recruiterJobHelpers";

/**
 * Pins the exact junk values from the QA report while protecting the
 * legitimate titles that a naive symbol blacklist would have broken.
 */
describe("validateJobTextField — rejects the reported junk", () => {
  it("rejects the values that were accepted before", () => {
    expect(validateJobTextField("Job Title", "qwe233+-/")).toBeTruthy();
    expect(validateJobTextField("Department", "sdf4d55,,,,")).toBeTruthy();
    expect(validateJobTextField("Industry", "421.+-/12")).toBeTruthy();
  });

  it("rejects values with no actual word", () => {
    expect(validateJobTextField("Job Title", "12345")).toBeTruthy();
    expect(validateJobTextField("Job Title", "!!!")).toBeTruthy();
  });

  it("rejects unsupported characters outright", () => {
    expect(validateJobTextField("Job Title", "Developer <script>")).toBeTruthy();
    expect(validateJobTextField("Job Title", "Engineer @ Home")).toBeTruthy();
  });
});

describe("validateJobTextField — must not break real job titles", () => {
  it("accepts titles that legitimately contain symbols", () => {
    for (const title of [
      "Senior React Developer",
      "C++ Developer",
      "R&D Manager",
      ".NET Developer",
      "Front-end / Back-end Engineer",
      "Manager (Sales)",
      "Node.js Engineer",
      "Level 3 Support",
      "Analyst, Risk",
      "O'Brien Associates Consultant",
      "C# Developer",
    ]) {
      expect(validateJobTextField("Job Title", title), title).toBeNull();
    }
  });

  it("leaves an empty value alone — required-ness is enforced elsewhere", () => {
    expect(validateJobTextField("Job Title", "")).toBeNull();
    expect(validateJobTextField("Job Title", "   ")).toBeNull();
  });

  it("names the field in the message so the user knows which one failed", () => {
    expect(validateJobTextField("Department", "421.+-/12")).toContain("Department");
  });
});
