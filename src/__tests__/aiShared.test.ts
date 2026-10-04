import { describe, it, expect, vi, afterEach } from "vitest";
// @ts-expect-error — plain .mjs modules shared with the Netlify Functions
import { profileEmbeddingText, jobEmbeddingText, toVector, sha256, clean, generateJson, embedText } from "../../netlify/shared/ai.mjs";
// @ts-expect-error — plain .mjs module shared with the Netlify Functions
import { checkRateLimit, enforceRateLimit, clientIp } from "../../netlify/shared/rateLimit.mjs";

describe("embedding text builders", () => {
  it("never includes contact details and strips markup", () => {
    const text = profileEmbeddingText({
      id: "abc", email: "a@b.com", phone: "999",
      headline: "<b>Backend</b> engineer", skills: ["Node", "Postgres"], about: "Builds APIs",
    });
    expect(text).toContain("Backend engineer");
    expect(text).toContain("Skills: Node, Postgres");
    expect(text).not.toMatch(/a@b\.com|999|abc/);
    expect(text).not.toContain("<b>");
  });

  it("builds job text and tolerates missing fields", () => {
    const text = jobEmbeddingText({ title: "React Dev", experience_min: 2, experience_max: 5, skills: ["React"] });
    expect(text).toContain("React Dev");
    expect(text).toContain("Experience: 2-5 years");
    expect(jobEmbeddingText({})).toBe("");
  });

  it("formats a pgvector literal and a stable hash", async () => {
    expect(toVector([0.1, -2, 3])).toBe("[0.1,-2,3]");
    expect(await sha256("x")).toBe(await sha256("x"));
    expect(await sha256("x")).not.toBe(await sha256("y"));
    expect(clean("  a   b  ", 10)).toBe("a b");
  });
});

describe("rate limiter", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("fails open when Supabase is not configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", ""); vi.stubEnv("SUPABASE_URL", ""); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect((await checkRateLimit("k", 1, 60)).allowed).toBe(true);
  });

  it("fails open when the RPC errors (e.g. migration not run)", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await checkRateLimit("k", 1, 60)).allowed).toBe(true);
  });

  it("returns a 429 with Retry-After when the limit is exceeded", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ allowed: false, retry_after: 42 }] }));
    const res = await enforceRateLimit([["k", 1, 60]]);
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("42");
  });

  it("returns null when under the limit", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ allowed: true, retry_after: 0 }] }));
    expect(await enforceRateLimit([["k", 5, 60]])).toBeNull();
  });

  it("prefers the Netlify client IP header", () => {
    const req = new Request("https://x", { headers: { "x-nf-client-connection-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
});

describe("OpenAI wrappers", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("generateJson parses the model's JSON and retries once on a 503", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => "busy" })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{"score":77}' } }] }) });
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateJson({ system: "s", user: "u" });
    expect(out).toEqual({ score: 77 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(sent.response_format).toEqual({ type: "json_object" });
  });

  it("generateJson does not retry a 401", async () => {
    vi.stubEnv("OPENAI_API_KEY", "bad");
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "no" });
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateJson({ system: "s", user: "u" })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("embedText requests 768 dims and rejects a wrong-sized vector", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const ok = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ embedding: new Array(768).fill(0.1) }] }) });
    vi.stubGlobal("fetch", ok);
    expect(await embedText("hi")).toHaveLength(768);
    expect(JSON.parse(ok.mock.calls[0][1].body)).toMatchObject({ model: "text-embedding-3-small", dimensions: 768 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ embedding: [1, 2] }] }) }));
    await expect(embedText("hi")).rejects.toThrow(/unexpected/);
  });
});
