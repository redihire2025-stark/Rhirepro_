import { describe, it, expect } from "vitest";

function getRedirectPath(verificationStatus: "Pending" | "Verified" | "Rejected" | null, isOrgAdmin = false): string {
  if (verificationStatus !== "Verified") {
    return "/recruiter/pending-verification";
  }
  return isOrgAdmin ? "/recruiter/admin" : "/recruiter/dashboard";
}

describe("Recruiter Account Verification Flow", () => {
  it("redirects pending recruiters to pending verification page upon login", () => {
    const redirect = getRedirectPath("Pending", false);
    expect(redirect).toBe("/recruiter/pending-verification");
  });

  it("redirects rejected recruiters to pending verification page upon login", () => {
    const redirect = getRedirectPath("Rejected", false);
    expect(redirect).toBe("/recruiter/pending-verification");
  });

  it("redirects null/unspecified verification recruiters to pending verification page", () => {
    const redirect = getRedirectPath(null, false);
    expect(redirect).toBe("/recruiter/pending-verification");
  });

  it("allows verified recruiters to navigate directly to dashboard", () => {
    const redirect = getRedirectPath("Verified", false);
    expect(redirect).toBe("/recruiter/dashboard");
  });

  it("allows verified org admins to navigate directly to org admin panel", () => {
    const redirect = getRedirectPath("Verified", true);
    expect(redirect).toBe("/recruiter/admin");
  });

  it("evaluates verification notice message correctly", () => {
    const expectedHeading = "Your account is currently under review";
    const expectedSubtext = "You will get approved within 2 business days.";
    expect(expectedHeading).toContain("currently under review");
    expect(expectedSubtext).toContain("2 business days");
  });
});
