/**
 * Resolves the external search service (the FastAPI + Elasticsearch backend).
 *
 * VITE_API_URL is inlined at build time, and it has been shipping as
 * `http://localhost:8000`. On the deployed HTTPS site that is a candidate for
 * every failure mode at once: it points at the *visitor's* own machine, and
 * the browser blocks it outright as mixed content before the request is even
 * attempted. Every search therefore burned a blocked request and a console
 * error on its way to the Supabase fallback that was always going to serve it.
 *
 * Returning null when there is no usable service lets callers skip the attempt
 * entirely instead of failing into it.
 */
export function getSearchApiUrl(): string | null {
  const raw = (import.meta.env.VITE_API_URL || "").trim();
  if (!raw) return null;

  // A loopback address is a developer's own machine. Useful in dev, never
  // reachable from a deployed site, so do not try it there.
  const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(raw);
  if (isLoopback && import.meta.env.PROD) return null;

  // An http:// service cannot be called from an https:// page at all — the
  // browser blocks it as mixed content. Skipping is honest; upgrading the
  // scheme on the caller's behalf would just fail differently.
  if (typeof window !== "undefined" && window.location.protocol === "https:" && raw.startsWith("http://")) {
    return null;
  }

  return raw.replace(/\/+$/, "");
}
