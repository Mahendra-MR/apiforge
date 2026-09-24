import { bodyModeToBodyType } from "./bodyType";
import type { AuthConfig, AuthType, RequestDraft, SaveRequestInput, SavedQueryParam, SavedRequest } from "../types";

function enabledRecord(rows: { key: string; value: string; enabled: boolean }[]): Record<string, string> | undefined {
  const entries = rows.filter((row) => row.enabled && row.key.trim() !== "").map((row) => [row.key, row.value] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Keeps disabled param rows too (only fully blank ones are dropped), so un-ticking a param doesn't lose it on the next load. */
function savedQueryParams(rows: RequestDraft["params"]): SavedQueryParam[] | undefined {
  const params = rows
    .filter((row) => row.key.trim() !== "" || row.value.trim() !== "")
    .map(({ key, value, enabled }) => ({ key, value, enabled }));
  return params.length > 0 ? params : undefined;
}

/** Only the active auth type's config is persisted — the others hold whatever the user last typed while trying different types and aren't meaningful to save. */
function activeAuthConfig(authType: AuthType, auth: AuthConfig): unknown {
  return authType === "none" ? undefined : auth[authType];
}

export type BuildSaveRequestInputResult = { ok: true; input: SaveRequestInput } | { ok: false; error: string };

/**
 * Turns the current draft into the payload the save-request endpoints
 * expect. Returns a result object instead of throwing so the caller can show
 * a JSON-parse failure inline rather than an unhandled rejection.
 */
export function buildSaveRequestInput(draft: RequestDraft, name: string): BuildSaveRequestInputResult {
  let body: unknown;

  if (draft.bodyMode === "json" && draft.jsonBody.trim() !== "") {
    try {
      body = JSON.parse(draft.jsonBody);
    } catch {
      return { ok: false, error: "The JSON body is invalid — fix it before saving." };
    }
  } else if (draft.bodyMode === "raw" && draft.rawBody.trim() !== "") {
    body = draft.rawBody;
  } else if (draft.bodyMode === "form-data") {
    body = enabledRecord(draft.formData);
  }

  return {
    ok: true,
    input: {
      name,
      method: draft.method,
      url: draft.url,
      queryParams: savedQueryParams(draft.params),
      headers: enabledRecord(draft.headers),
      authType: draft.authType,
      authConfig: activeAuthConfig(draft.authType, draft.auth),
      bodyType: bodyModeToBodyType(draft.bodyMode),
      body,
    },
  };
}

/** A saved request's stored fields as a create payload — used to duplicate it into the same folder. */
export function savedRequestToInput(request: SavedRequest, name: string): SaveRequestInput {
  return {
    name,
    method: request.method,
    url: request.url,
    queryParams: Array.isArray(request.queryParams) ? (request.queryParams as SavedQueryParam[]) : undefined,
    headers: request.headers ?? undefined,
    authType: request.authType,
    authConfig: request.authConfig ?? undefined,
    bodyType: request.bodyType,
    body: request.body ?? undefined,
  };
}
