import type { RequestDraft } from "../types";

export const DRAFT_STORAGE_KEY = "apiforge:draft";

/**
 * Reads the last autosaved draft from local storage, if any. Swallows
 * storage/parse errors (private browsing, corrupted JSON) since a missing
 * autosave should just fall back to a blank draft rather than crash the app.
 */
export function loadDraftFromStorage(): RequestDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RequestDraft;
  } catch {
    return null;
  }
}

/**
 * Autosaves the in-progress draft (method/url/headers/body/etc.) so it
 * survives a reload — separate from explicitly saving it into a collection
 * via the Save button.
 */
export function saveDraftToStorage(draft: RequestDraft): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage can be full or unavailable (private browsing); losing the
    // autosave isn't worth surfacing an error to the user for.
  }
}
