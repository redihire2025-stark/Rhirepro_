import { describe, expect, it } from "vitest";
import { formatActiveTime, parseActiveDate } from "../lib/activeTime";

describe("activeTime helpers", () => {
  const baseTimeStr = "2026-08-13T12:00:00.000Z";
  const nowMs = new Date(baseTimeStr).getTime();

  it("parses active date correctly from last_active_at only", () => {
    expect(parseActiveDate({ last_active_at: "2026-08-13T10:00:00.000Z" })?.toISOString()).toBe("2026-08-13T10:00:00.000Z");
    expect(parseActiveDate({ updated_at: "2026-08-12T10:00:00.000Z" })).toBeNull();
    expect(parseActiveDate({ created_at: "2026-08-11T10:00:00.000Z" })).toBeNull();
    expect(parseActiveDate(null)).toBeNull();
    expect(parseActiveDate({})).toBeNull();
  });

  it("formats active time within 24 hours as 'Active Today'", () => {
    // 5 hours ago
    const active5h = new Date(nowMs - 5 * 60 * 60 * 1000).toISOString();
    expect(formatActiveTime(active5h, nowMs)).toBe("Active Today");

    // Exactly 24 hours ago
    const active24h = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    expect(formatActiveTime(active24h, nowMs)).toBe("Active Today");

    // Future timestamp
    const activeFuture = new Date(nowMs + 1000).toISOString();
    expect(formatActiveTime(activeFuture, nowMs)).toBe("Active Today");
  });

  it("formats active time between 24 and 48 hours as 'Active 1 day ago'", () => {
    // 25 hours ago
    const active25h = new Date(nowMs - 25 * 60 * 60 * 1000).toISOString();
    expect(formatActiveTime(active25h, nowMs)).toBe("Active 1 day ago");

    // 40 hours ago
    const active40h = new Date(nowMs - 40 * 60 * 60 * 1000).toISOString();
    expect(formatActiveTime(active40h, nowMs)).toBe("Active 1 day ago");
  });

  it("formats active time greater than 48 hours as 'Active N days ago'", () => {
    // 3 days ago (72 hours)
    const active3d = new Date(nowMs - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatActiveTime(active3d, nowMs)).toBe("Active 3 days ago");

    // 10 days ago
    const active10d = new Date(nowMs - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatActiveTime(active10d, nowMs)).toBe("Active 10 days ago");
  });

  it("formats active time for months and years correctly", () => {
    // 45 days ago
    const active45d = new Date(nowMs - 45 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatActiveTime(active45d, nowMs)).toBe("Active 1 month ago");

    // 90 days ago
    const active90d = new Date(nowMs - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatActiveTime(active90d, nowMs)).toBe("Active 3 months ago");
  });

  it("returns 'Active 6 months ago' for missing or invalid dates", () => {
    expect(formatActiveTime(null, nowMs)).toBe("Active 6 months ago");
    expect(formatActiveTime("invalid-date", nowMs)).toBe("Active 6 months ago");
  });
});
