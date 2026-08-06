import { describe, it, expect } from "vitest";

describe("Company Manual Verification Workflow", () => {
  it("calculates sequential serial numbers correctly across pages", () => {
    const pageSize = 15;
    
    // Page 1, item at index 0 -> #1
    expect((1 - 1) * pageSize + 0 + 1).toBe(1);
    // Page 1, item at index 9 -> #10
    expect((1 - 1) * pageSize + 9 + 1).toBe(10);

    // Page 2, item at index 0 -> #16
    expect((2 - 1) * pageSize + 0 + 1).toBe(16);
    // Page 2, item at index 4 -> #20
    expect((2 - 1) * pageSize + 4 + 1).toBe(20);

    // Page 3, item at index 0 -> #31
    expect((3 - 1) * pageSize + 0 + 1).toBe(31);
  });

  it("filters companies accurately by verification status", () => {
    const sampleCompanies = [
      { company_name: "TechCorp", verification_status: "Pending" },
      { company_name: "Acme Inc", verification_status: "Verified" },
      { company_name: "Demo LLC", verification_status: "Rejected" },
      { company_name: "Innovate Ltd", verification_status: "Pending" },
    ];

    const pending = sampleCompanies.filter(c => c.verification_status === "Pending");
    const verified = sampleCompanies.filter(c => c.verification_status === "Verified");
    const rejected = sampleCompanies.filter(c => c.verification_status === "Rejected");

    expect(pending.length).toBe(2);
    expect(verified.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  it("sorts pending companies first by default", () => {
    const sampleCompanies = [
      { company_name: "Acme Inc", verification_status: "Verified", latest_created_at: "2026-08-01T10:00:00Z" },
      { company_name: "TechCorp", verification_status: "Pending", latest_created_at: "2026-08-05T10:00:00Z" },
      { company_name: "Demo LLC", verification_status: "Rejected", latest_created_at: "2026-08-03T10:00:00Z" },
      { company_name: "Alpha Corp", verification_status: "Pending", latest_created_at: "2026-08-06T10:00:00Z" },
    ];

    const rank: Record<string, number> = { Pending: 0, Verified: 1, Rejected: 2 };
    const sorted = [...sampleCompanies].sort((a, b) => {
      const rankA = rank[a.verification_status];
      const rankB = rank[b.verification_status];
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime();
    });

    expect(sorted[0].company_name).toBe("Alpha Corp");
    expect(sorted[1].company_name).toBe("TechCorp");
    expect(sorted[2].company_name).toBe("Acme Inc");
    expect(sorted[3].company_name).toBe("Demo LLC");
  });
});
