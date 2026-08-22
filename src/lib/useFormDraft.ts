import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps an in-progress form alive across navigation.
 *
 * Forms in the dashboards are unmounted when the user switches tab, so anything
 * typed but not yet saved was simply gone on return. This parks the value in
 * localStorage and hands it back on the way in.
 *
 * Notes on the design:
 *  - The key includes the owning user id, so drafts never leak between accounts
 *    sharing a browser.
 *  - Drafts expire, because a half-finished form from last week is noise rather
 *    than something the user is still working on.
 *  - Writes are debounced; keystroke-rate localStorage writes are wasteful and
 *    localStorage is synchronous, so it blocks the main thread.
 *  - Every access is wrapped: localStorage throws outright in private mode and
 *    when a browser is set to block site data, and losing a draft must never
 *    take the form down with it.
 */

const DRAFT_PREFIX = "rhirepro_draft_";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

type StoredDraft<T> = { savedAt: number; value: T };

export function draftKey(formName: string, ownerId: string | null | undefined): string | null {
  if (!ownerId) return null;
  return `${DRAFT_PREFIX}${formName}_${ownerId}`;
}

export function readDraft<T>(key: string | null, ttlMs = DEFAULT_TTL_MS): T | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function clearDraft(key: string | null): void {
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/**
 * @param key      from draftKey(), or null to disable (e.g. before the user id is known)
 * @param value    the current form state
 * @param active   only persist while the form is actually being edited, so merely
 *                 viewing a page does not write a draft of untouched server data
 */
export function useFormDraft<T>(key: string | null, value: T, active: boolean) {
  // Restore is deliberately not automatic: the caller decides when to apply it,
  // because these forms are populated from server data and an unconditional
  // overwrite would clobber a freshly loaded profile.
  const [restorable] = useState<T | null>(() => readDraft<T>(key));
  const seeded = useRef(false);

  useEffect(() => {
    if (!key || !active) return;
    // Skip the first pass so opening a form does not immediately persist the
    // untouched server values as if they were a draft.
    if (!seeded.current) {
      seeded.current = true;
      return;
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value } as StoredDraft<T>));
      } catch {
        // Quota exceeded or storage blocked — the form still works.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [key, value, active]);

  const discard = useCallback(() => {
    clearDraft(key);
    seeded.current = false;
  }, [key]);

  return { restorable, discard };
}
