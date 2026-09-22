import { applyAuth } from "./applyAuth";
import { resolveVariables } from "./resolveVariables";
import type { AuthConfig, AuthType, ExecuteRequestPayload, KeyValueRow, RequestDraft } from "../types";

function enabledEntries(rows: RequestDraft["params"]): [string, string][] {
  return rows.filter((row) => row.enabled && row.key.trim().length > 0).map((row) => [row.key, row.value]);
}

/** Merges enabled param rows into the draft's URL, preserving any query string already typed into the URL bar. */
export function buildUrlWithParams(draft: RequestDraft): string {
  const params = enabledEntries(draft.params);
  if (params.length === 0) return draft.url;

  try {
    const url = new URL(draft.url);
    for (const [key, value] of params) {
      url.searchParams.append(key, value);
    }
    return url.toString();
  } catch {
    // draft.url isn't a valid absolute URL yet (e.g. still being typed, or
    // uses an unresolved {{baseUrl}} variable) — append params manually so
    // the request still has *something* sensible to show/send.
    const separator = draft.url.includes("?") ? "&" : "?";
    const query = params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
    return `${draft.url}${separator}${query}`;
  }
}

function buildHeaders(draft: RequestDraft): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of enabledEntries(draft.headers)) {
    headers[key] = value;
  }

  const hasContentType = Object.keys(headers).some((h) => h.toLowerCase() === "content-type");
  if (!hasContentType && draft.bodyMode === "json") {
    headers["Content-Type"] = "application/json";
  } else if (!hasContentType && draft.bodyMode === "form-data") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  return headers;
}

function buildBody(draft: RequestDraft): string | null {
  switch (draft.bodyMode) {
    case "json":
      return draft.jsonBody.trim().length > 0 ? draft.jsonBody : null;
    case "raw":
      return draft.rawBody.trim().length > 0 ? draft.rawBody : null;
    case "form-data": {
      const entries = enabledEntries(draft.formData);
      if (entries.length === 0) return null;
      return entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
    }
    case "none":
    default:
      return null;
  }
}

function resolveRows(rows: KeyValueRow[], variables: Record<string, string>): KeyValueRow[] {
  return rows.map((row) => ({
    ...row,
    key: resolveVariables(row.key, variables),
    value: resolveVariables(row.value, variables),
  }));
}

/** Resolves `{{variables}}` in the fields of whichever auth type is active. The other (inactive) types are left untouched since they won't be sent. */
function resolveActiveAuthConfig(authType: AuthType, auth: AuthConfig, variables: Record<string, string>): AuthConfig {
  switch (authType) {
    case "bearer":
      return { ...auth, bearer: { token: resolveVariables(auth.bearer.token, variables) } };
    case "basic":
      return {
        ...auth,
        basic: {
          username: resolveVariables(auth.basic.username, variables),
          password: resolveVariables(auth.basic.password, variables),
        },
      };
    case "apiKey":
      return {
        ...auth,
        apiKey: {
          ...auth.apiKey,
          key: resolveVariables(auth.apiKey.key, variables),
          value: resolveVariables(auth.apiKey.value, variables),
        },
      };
    case "oauth2":
    case "none":
    default:
      return auth;
  }
}

/**
 * Turns an editable draft into the payload the backend's execute endpoint
 * expects: resolves `{{variable}}` tokens from the active environment
 * throughout the URL, params, headers and body, then applies the active
 * auth type on top of the composed headers/URL.
 */
export function buildExecutePayload(
  draft: RequestDraft,
  variables: Record<string, string> = {},
): ExecuteRequestPayload {
  const resolvedDraft: RequestDraft = {
    ...draft,
    url: resolveVariables(draft.url, variables),
    params: resolveRows(draft.params, variables),
    headers: resolveRows(draft.headers, variables),
    jsonBody: resolveVariables(draft.jsonBody, variables),
    rawBody: resolveVariables(draft.rawBody, variables),
    formData: resolveRows(draft.formData, variables),
    auth: resolveActiveAuthConfig(draft.authType, draft.auth, variables),
  };

  const url = buildUrlWithParams(resolvedDraft);
  const headers = buildHeaders(resolvedDraft);
  const body = buildBody(resolvedDraft);
  const { headers: finalHeaders, url: finalUrl } = applyAuth(resolvedDraft.authType, resolvedDraft.auth, headers, url);

  return {
    method: resolvedDraft.method,
    url: finalUrl,
    headers: finalHeaders,
    body,
    requestId: draft.savedRequestId ?? undefined,
  };
}
