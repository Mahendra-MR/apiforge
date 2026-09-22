import type { AuthConfig, AuthType } from "../types";

/** Appends a single query parameter to a URL, falling back to string concatenation if `url` isn't a valid absolute URL yet (e.g. still being typed, or uses an unresolved `{{baseUrl}}`). */
function appendQueryParam(url: string, key: string, value: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.append(key, value);
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

/**
 * Applies the request builder's active auth type on top of already-composed
 * headers/URL, producing the final headers/URL to send. Called after
 * `{{variable}}` resolution so auth fields (tokens, secrets, etc.) can also
 * reference environment variables.
 */
export function applyAuth(
  authType: AuthType,
  auth: AuthConfig,
  headers: Record<string, string>,
  url: string,
): { headers: Record<string, string>; url: string } {
  switch (authType) {
    case "bearer": {
      if (!auth.bearer.token) return { headers, url };
      return { headers: { ...headers, Authorization: `Bearer ${auth.bearer.token}` }, url };
    }

    case "basic": {
      const { username, password } = auth.basic;
      if (!username && !password) return { headers, url };
      const encoded = btoa(`${username}:${password}`);
      return { headers: { ...headers, Authorization: `Basic ${encoded}` }, url };
    }

    case "apiKey": {
      const { key, value, location } = auth.apiKey;
      if (!key) return { headers, url };
      if (location === "query") {
        return { headers, url: appendQueryParam(url, key, value) };
      }
      return { headers: { ...headers, [key]: value }, url };
    }

    case "oauth2": {
      const { accessToken, tokenType } = auth.oauth2;
      if (!accessToken) return { headers, url };
      return { headers: { ...headers, Authorization: `${tokenType ?? "Bearer"} ${accessToken}` }, url };
    }

    case "none":
    default:
      return { headers, url };
  }
}
