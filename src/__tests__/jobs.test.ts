import { describe, expect, it } from "vitest";
import { buildJobDeadlineTimestamp, buildJobExpiryTimestamp, formatJobDeadline, getEffectiveJobStatus, getJobDaysRemaining, isJobExpired } from "../lib/jobs";

describe("job expiry helpers", () => {
  it("keeps legacy date-only jobs expiring on the deadline date", () => {
    expect(
      isJobExpired(
        { deadline: "2026-03-27", deadline_time: null },
        new Date("2026-03-27T06:00:00.000Z")
      )
    ).toBe(true);
  });

  it("waits until the configured deadline time for timed jobs", () => {
    const deadline = buildJobDeadlineTimestamp("2026-03-27", "18:30");

    expect(deadline).toBe("2026-03-27T13:00:00.000Z");
    expect(
      isJobExpired(
        { deadline, deadline_time: "18:30" },
        new Date("2026-03-27T12:59:00.000Z")
      )
    ).toBe(false);
    expect(
      isJobExpired(
        { deadline, deadline_time: "18:30" },
        new Date("2026-03-27T13:00:00.000Z")
      )
    ).toBe(true);
  });

  it("formats timed deadlines with both date and time", () => {
    expect(
      formatJobDeadline({ deadline: "2026-03-27T13:00:00.000Z", deadline_time: "18:30" })
    ).toContain("6:30 pm");
  });

  it("treats premature expired status as active until the deadline time is reached", () => {
    expect(
      getEffectiveJobStatus(
        { status: "Expired", deadline: "2026-03-27T13:00:00.000Z", deadline_time: "18:30" },
        new Date("2026-03-27T12:59:00.000Z")
      )
    ).toBe("Active");
  });

  it("builds automatic 15-day expiry timestamps for new and refreshed jobs", () => {
    expect(buildJobExpiryTimestamp(undefined, new Date("2026-03-01T10:00:00.000Z"))).toBe("2026-03-16T10:00:00.000Z");
  });

  it("expires active jobs at the automatic expiry timestamp", () => {
    const job = { status: "Active" as const, deadline: "2026-03-16T10:00:00.000Z", deadline_time: null };

    expect(isJobExpired(job, new Date("2026-03-16T09:59:59.000Z"))).toBe(false);
    expect(getEffectiveJobStatus(job, new Date("2026-03-16T10:00:00.000Z"))).toBe("Expired");
  });

  it("reports remaining days from the automatic expiry", () => {
    expect(getJobDaysRemaining({ deadline: "2026-03-16T10:00:00.000Z" }, new Date("2026-03-01T10:00:00.000Z"))).toBe(15);
  });
});
