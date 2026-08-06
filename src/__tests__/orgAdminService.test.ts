import { describe, it, expect } from "vitest";
import { orgAdminService } from "../app/services/orgAdminService";
import { RecruiterProfile } from "../lib/supabase";

describe("orgAdminService Business Logic", () => {
  it("restricts invitation when verification_status is Pending", () => {
    const mockProfile: Partial<RecruiterProfile> = {
      verification_status: "Pending",
    };
    const res = orgAdminService.validateCompanyVerification(mockProfile as RecruiterProfile);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("pending");
  });

  it("restricts invitation when verification_status is Rejected", () => {
    const mockProfile: Partial<RecruiterProfile> = {
      verification_status: "Rejected",
    };
    const res = orgAdminService.validateCompanyVerification(mockProfile as RecruiterProfile);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("rejected");
  });

  it("allows invitation when verification_status is Verified", () => {
    const mockProfile: Partial<RecruiterProfile> = {
      verification_status: "Verified",
    };
    const res = orgAdminService.validateCompanyVerification(mockProfile as RecruiterProfile);
    expect(res.allowed).toBe(true);
  });

  it("prevents sending invitation if active link_opened invitation exists", async () => {
    const mockProfile: Partial<RecruiterProfile> = {
      verification_status: "Verified",
      email: "admin@company.com",
      company_name: "Company Inc",
      max_seats: 5,
    };

    const res = await orgAdminService.sendTeamInvitation({
      inviteEmail: "user@company.com",
      recruiterProfile: mockProfile as RecruiterProfile,
      userId: "admin-id",
      activeCount: 1,
      existingInvitations: [{ invited_email: "user@company.com", status: "link_opened" }],
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("already exists");
  });

  it("calculates overview KPIs accurately", () => {
    const members = [{ is_active: true }, { is_active: false }, { is_active: true }];
    const teamJobs = [{ status: "Active" }, { status: "Active" }, { status: "Closed" }];
    const teamApps = [
      { profile_id: "p1", applied_at: new Date().toISOString(), status: "Applied" },
      { profile_id: "p2", applied_at: new Date().toISOString(), status: "Interview Scheduled" },
      { profile_id: "p3", applied_at: new Date().toISOString(), status: "Hired" },
    ];

    const kpis = orgAdminService.calculateOverviewKpis(members, teamJobs, teamApps);

    expect(kpis.totalRecruiters).toBe(3);
    expect(kpis.activeRecruiters).toBe(2);
    expect(kpis.totalJobs).toBe(3);
    expect(kpis.activeJobs).toBe(2);
    expect(kpis.closedJobs).toBe(1);
    expect(kpis.totalCandidates).toBe(3);
    expect(kpis.applicationsToday).toBe(3);
    expect(kpis.interviewsScheduled).toBe(1);
    expect(kpis.successfulHires).toBe(1);
  });
});
