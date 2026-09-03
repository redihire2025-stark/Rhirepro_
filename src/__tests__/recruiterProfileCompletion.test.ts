import { describe, it, expect } from "vitest";
import {
  calculateRecruiterCompletion,
  RECRUITER_MIN_COMPLETION_THRESHOLD,
} from "../lib/recruiterProfileCompletion";

describe("Recruiter Profile Completion & Gating (< 60% threshold)", () => {
  it("returns score 0 and isEligible false when profile is null", () => {
    const result = calculateRecruiterCompletion(null);
    expect(result.score).toBe(0);
    expect(result.isEligible).toBe(false);
    expect(result.missingItems.length).toBe(0);
  });

  it("calculates partial score and blocks posting when score < 60", () => {
    // Only recruiter_name (10) + company_name (15) + phone (5) = 30%
    const partialProfile: any = {
      id: "rec-1",
      recruiter_name: "Sarah HR",
      company_name: "Acme Corp",
      phone: "+91 9876543210",
      industry: null,
      company_size: null,
      company_type: null,
      company_description: null,
      location: null,
      website: null,
    };

    const result = calculateRecruiterCompletion(partialProfile);
    expect(result.score).toBe(30);
    expect(result.score).toBeLessThan(RECRUITER_MIN_COMPLETION_THRESHOLD);
    expect(result.isEligible).toBe(false);
    expect(result.missingItems.some((i) => i.key === "company_description")).toBe(true);
    expect(result.missingItems.some((i) => i.key === "industry")).toBe(true);
  });

  it("permits posting when score reaches or exceeds 60%", () => {
    // recruiter_name (10) + company_name (15) + phone (5) + industry (15) + company_size (10) + location (10) = 65%
    const qualifiedProfile: any = {
      id: "rec-2",
      recruiter_name: "John Admin",
      company_name: "Tech Solutions",
      phone: "+91 9876543210",
      industry: "IT Services",
      company_size: "51-200",
      company_type: null,
      company_description: "",
      location: "Bengaluru, Karnataka",
      website: null,
    };

    const result = calculateRecruiterCompletion(qualifiedProfile);
    expect(result.score).toBe(65);
    expect(result.score).toBeGreaterThanOrEqual(RECRUITER_MIN_COMPLETION_THRESHOLD);
    expect(result.isEligible).toBe(true);
  });

  it("calculates 100% when all 9 fields are fully populated", () => {
    const fullProfile: any = {
      id: "rec-3",
      recruiter_name: "Jane Doe",
      company_name: "Global Tech Inc",
      phone: "+91 9876543210",
      industry: "Software",
      company_size: "500+",
      company_type: "Corporate",
      company_description: "We are a pioneering software company transforming modern recruiting platforms worldwide.",
      location: "Mumbai, Maharashtra",
      website: "https://globaltech.com",
    };

    const result = calculateRecruiterCompletion(fullProfile);
    expect(result.score).toBe(100);
    expect(result.isEligible).toBe(true);
    expect(result.missingItems.length).toBe(0);
  });

  it("allows team members to inherit company profile fields from team admin", () => {
    // Team member has personal info: recruiter_name (10) + phone (5) = 15%
    const teamMemberProfile: any = {
      id: "member-1",
      recruiter_name: "Junior Recruiter",
      phone: "+91 9123456780",
      org_admin_id: "admin-1",
      company_name: null,
      industry: null,
      company_size: null,
      company_type: null,
      company_description: null,
      location: null,
      website: null,
    };

    // Admin's company profile provides:
    // company_name (15) + industry (15) + company_size (10) + location (10) + website (10) = 60%
    const adminCompanyProfile: any = {
      company_name: "Enterprise Hub",
      industry: "Financial Services",
      company_size: "1000+",
      company_type: "Public",
      company_description: "A leading financial services provider operating globally.", // > 20 chars (20%)
      location: "Hyderabad, Telangana",
      website: "https://enterprisehub.com",
    };

    // Without admin company profile:
    const withoutAdmin = calculateRecruiterCompletion(teamMemberProfile, null, true);
    expect(withoutAdmin.score).toBe(15);
    expect(withoutAdmin.isEligible).toBe(false);

    // With admin company profile inherited:
    // 10 (name) + 5 (phone) + 15 (comp) + 15 (ind) + 10 (size) + 5 (type) + 20 (desc) + 10 (loc) + 10 (web) = 100%
    const withAdmin = calculateRecruiterCompletion(teamMemberProfile, adminCompanyProfile, true);
    expect(withAdmin.score).toBe(100);
    expect(withAdmin.isEligible).toBe(true);
  });

  it("blocks team members if team admin company profile is under 60%", () => {
    const teamMemberProfile: any = {
      id: "member-2",
      recruiter_name: "Recruiter Bob",
      phone: "+91 9123456789",
      org_admin_id: "admin-2",
    };

    // Admin only has company_name (15) and location (10)
    // Team member has name (10) + phone (5) + company (15) + location (10) = 40% (< 60%)
    const incompleteAdminCompany: any = {
      company_name: "Early Startup",
      location: "Pune, Maharashtra",
      industry: null,
      company_size: null,
      company_type: null,
      company_description: null,
      website: null,
    };

    const result = calculateRecruiterCompletion(teamMemberProfile, incompleteAdminCompany, true);
    expect(result.score).toBe(40);
    expect(result.isEligible).toBe(false);
  });
});
