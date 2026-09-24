import { create } from "zustand";
import { bodyTypeToBodyMode } from "../lib/bodyType";
import { loadDraftFromStorage, saveDraftToStorage } from "../lib/draftStorage";
import { createRowId } from "../lib/id";
import type { ParsedCurlRequest } from "../lib/parseCurl";
import type {
  AuthConfig,
  AuthType,
  BodyMode,
  HistoryEntry,
  HttpMethod,
  KeyValueRow,
  OAuth2TokenResponse,
  RequestDraft,
  SavedRequest,
} from "../types";
import { createEmptyAuthConfig } from "../types";

function emptyRow(): KeyValueRow {
  return { id: createRowId(), key: "", value: "", enabled: true };
}

function createDraft(): RequestDraft {
  return {
    id: createRowId(),
    savedRequestId: null,
    collectionId: null,
    name: "Untitled request",
    method: "GET",
    url: "",
    params: [emptyRow()],
    headers: [emptyRow()],
    bodyMode: "none",
    jsonBody: "",
    rawBody: "",
    formData: [emptyRow()],
    authType: "none",
    auth: createEmptyAuthConfig(),
  };
}

/** The draft a fresh session starts from: whatever was last autosaved, or a blank one if there's nothing to restore. */
function initialDraft(): RequestDraft {
  return loadDraftFromStorage() ?? createDraft();
}

function rowsFromEntries(entries: [string, string][]): KeyValueRow[] {
  const rows = entries.map(([key, value]) => ({ id: createRowId(), key, value, enabled: true }));
  return rows.length > 0 ? [...rows, emptyRow()] : [emptyRow()];
}

function rowsFromRecord(record: Record<string, string> | null | undefined): KeyValueRow[] {
  return rowsFromEntries(record ? Object.entries(record) : []);
}

/** Derives a short request name from a URL's path, for requests that don't have one yet (history entries, cURL imports). Falls back to the raw url when it isn't a valid absolute URL (e.g. still uses an unresolved `{{baseUrl}}`). */
function nameFromUrl(method: HttpMethod, url: string): string {
  try {
    return `${method} ${new URL(url).pathname}`;
  } catch {
    return `${method} ${url}`;
  }
}

/** Rebuilds a full AuthConfig from a saved request's single-type authConfig blob, leaving the other types blank. */
function authConfigFromSavedRequest(authType: AuthType, authConfig: unknown): AuthConfig {
  const base = createEmptyAuthConfig();
  if (authType === "none" || !authConfig || typeof authConfig !== "object") return base;
  return { ...base, [authType]: { ...base[authType], ...authConfig } };
}

type RowList = "params" | "headers" | "formData";

interface RequestState {
  draft: RequestDraft;
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setName: (name: string) => void;
  addRow: (list: RowList) => void;
  updateRow: (list: RowList, id: string, patch: Partial<KeyValueRow>) => void;
  removeRow: (list: RowList, id: string) => void;
  setBodyMode: (mode: BodyMode) => void;
  setJsonBody: (value: string) => void;
  setRawBody: (value: string) => void;
  setAuthType: (authType: AuthType) => void;
  updateAuthConfig: <T extends Exclude<AuthType, "none">>(type: T, patch: Partial<AuthConfig[T]>) => void;
  setOAuth2Token: (token: OAuth2TokenResponse) => void;
  loadFromHistory: (entry: HistoryEntry) => void;
  loadFromSavedRequest: (request: SavedRequest) => void;
  loadFromCurl: (parsed: ParsedCurlRequest) => void;
  markSaved: (savedRequestId: string, collectionId: string | null) => void;
  reset: () => void;
}

/** Ensures there's always exactly one trailing empty row, like Postman's key/value editors. */
function withTrailingEmptyRow(rows: KeyValueRow[]): KeyValueRow[] {
  const last = rows[rows.length - 1];
  if (!last || last.key.trim() !== "" || last.value.trim() !== "") {
    return [...rows, emptyRow()];
  }
  return rows;
}

export const useRequestStore = create<RequestState>((set) => ({
  draft: initialDraft(),

  setMethod: (method) => set((state) => ({ draft: { ...state.draft, method } })),
  setUrl: (url) => set((state) => ({ draft: { ...state.draft, url } })),
  setName: (name) => set((state) => ({ draft: { ...state.draft, name } })),

  addRow: (list) =>
    set((state) => ({ draft: { ...state.draft, [list]: [...state.draft[list], emptyRow()] } })),

  updateRow: (list, id, patch) =>
    set((state) => {
      const rows = state.draft[list].map((row) => (row.id === id ? { ...row, ...patch } : row));
      return { draft: { ...state.draft, [list]: withTrailingEmptyRow(rows) } };
    }),

  removeRow: (list, id) =>
    set((state) => {
      const rows = state.draft[list].filter((row) => row.id !== id);
      return { draft: { ...state.draft, [list]: rows.length > 0 ? rows : [emptyRow()] } };
    }),

  setBodyMode: (bodyMode) => set((state) => ({ draft: { ...state.draft, bodyMode } })),
  setJsonBody: (jsonBody) => set((state) => ({ draft: { ...state.draft, jsonBody } })),
  setRawBody: (rawBody) => set((state) => ({ draft: { ...state.draft, rawBody } })),

  setAuthType: (authType) => set((state) => ({ draft: { ...state.draft, authType } })),

  updateAuthConfig: (type, patch) =>
    set((state) => ({
      draft: { ...state.draft, auth: { ...state.draft.auth, [type]: { ...state.draft.auth[type], ...patch } } },
    })),

  setOAuth2Token: (token) =>
    set((state) => ({
      draft: {
        ...state.draft,
        auth: {
          ...state.draft.auth,
          oauth2: {
            ...state.draft.auth.oauth2,
            accessToken: token.accessToken,
            tokenType: token.tokenType,
            obtainedAt: token.obtainedAt,
          },
        },
      },
    })),

  loadFromHistory: (entry) =>
    set(() => {
      const isJsonBody =
        typeof entry.requestBody !== "string" && entry.requestBody !== null && entry.requestBody !== undefined;
      const jsonBody = isJsonBody ? JSON.stringify(entry.requestBody, null, 2) : "";
      const rawBody = !isJsonBody && typeof entry.requestBody === "string" ? entry.requestBody : "";

      return {
        draft: {
          id: createRowId(),
          savedRequestId: entry.requestId,
          collectionId: null,
          name: nameFromUrl(entry.method, entry.url),
          method: entry.method,
          url: entry.url,
          params: [emptyRow()],
          headers: rowsFromRecord(entry.requestHeaders),
          bodyMode: isJsonBody ? "json" : rawBody ? "raw" : "none",
          jsonBody,
          rawBody,
          formData: [emptyRow()],
          authType: "none",
          auth: createEmptyAuthConfig(),
        },
      };
    }),

  loadFromSavedRequest: (savedRequest) =>
    set(() => {
      const bodyMode = bodyTypeToBodyMode(savedRequest.bodyType);
      const jsonBody = bodyMode === "json" && savedRequest.body !== null ? JSON.stringify(savedRequest.body, null, 2) : "";
      const rawBody = bodyMode === "raw" && typeof savedRequest.body === "string" ? savedRequest.body : "";
      const formData =
        bodyMode === "form-data" && savedRequest.body !== null && typeof savedRequest.body === "object"
          ? rowsFromRecord(savedRequest.body as Record<string, string>)
          : [emptyRow()];

      return {
        draft: {
          id: createRowId(),
          savedRequestId: savedRequest.id,
          collectionId: savedRequest.collectionId,
          name: savedRequest.name,
          method: savedRequest.method,
          url: savedRequest.url,
          params: [emptyRow()],
          headers: rowsFromRecord(savedRequest.headers),
          bodyMode,
          jsonBody,
          rawBody,
          formData,
          authType: savedRequest.authType,
          auth: authConfigFromSavedRequest(savedRequest.authType, savedRequest.authConfig),
        },
      };
    }),

  loadFromCurl: (parsed) =>
    set(() => ({
      draft: {
        id: createRowId(),
        savedRequestId: null,
        collectionId: null,
        name: nameFromUrl(parsed.method, parsed.url),
        method: parsed.method,
        url: parsed.url,
        params: rowsFromEntries(parsed.queryParams),
        headers: rowsFromEntries(parsed.headers),
        bodyMode: parsed.bodyMode,
        jsonBody: parsed.jsonBody,
        rawBody: parsed.rawBody,
        formData: rowsFromEntries(parsed.formData),
        authType: parsed.authType,
        auth: authConfigFromSavedRequest(parsed.authType, parsed.authConfig),
      },
    })),

  markSaved: (savedRequestId, collectionId) =>
    set((state) => ({ draft: { ...state.draft, savedRequestId, collectionId } })),

  reset: () => set({ draft: createDraft() }),
}));

// Autosaves the draft to local storage on every change, so an in-progress
// request survives a reload without the user having to explicitly save it
// into a collection first.
useRequestStore.subscribe((state) => saveDraftToStorage(state.draft));
