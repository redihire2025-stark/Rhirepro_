import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { draftKey, readDraft, clearDraft } from "../lib/useFormDraft";

describe("form draft storage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it("scopes the key to the owner so drafts cannot leak between accounts", () => {
    expect(draftKey("f", "user-a")).not.toEqual(draftKey("f", "user-b"));
    expect(draftKey("f", "user-a")).toContain("user-a");
  });

  it("returns null when the owner is unknown, so nothing is stored anonymously", () => {
    expect(draftKey("f", null)).toBeNull();
    expect(draftKey("f", undefined)).toBeNull();
    expect(readDraft(null)).toBeNull();
  });

  it("round-trips a stored draft", () => {
    const key = draftKey("f", "u1")!;
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value: { title: "Engineer" } }));
    expect(readDraft<{ title: string }>(key)).toEqual({ title: "Engineer" });
  });

  it("expires a stale draft instead of resurrecting week-old work", () => {
    const key = draftKey("f", "u1")!;
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    localStorage.setItem(key, JSON.stringify({ savedAt: twoDaysAgo, value: { title: "Old" } }));
    expect(readDraft(key)).toBeNull();
    // and cleans it up rather than leaving it to be re-checked forever
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("ignores corrupt or foreign data rather than throwing", () => {
    const key = draftKey("f", "u1")!;
    localStorage.setItem(key, "not json");
    expect(readDraft(key)).toBeNull();
    localStorage.setItem(key, JSON.stringify({ value: { a: 1 } })); // no savedAt
    expect(readDraft(key)).toBeNull();
  });

  it("clearDraft removes it and tolerates a null key", () => {
    const key = draftKey("f", "u1")!;
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value: {} }));
    clearDraft(key);
    expect(localStorage.getItem(key)).toBeNull();
    expect(() => clearDraft(null)).not.toThrow();
  });

  it("survives storage being unavailable, as in private mode", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(readDraft(draftKey("f", "u1"))).toBeNull();
    spy.mockRestore();
  });
});
