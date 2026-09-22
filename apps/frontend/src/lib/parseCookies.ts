export interface ParsedCookie {
  name: string;
  value: string;
  attributes: string[];
}

/**
 * Splits a combined Set-Cookie header value into individual cookies.
 *
 * The Fetch API's Headers object joins multiple Set-Cookie headers into one
 * comma-separated string, which is ambiguous because cookie attributes like
 * `Expires=Wed, 21 Oct 2026 07:28:00 GMT` also contain commas. We split only
 * on a comma that's followed by what looks like the start of a new
 * `name=value` pair, which handles the common case correctly.
 */
export function splitSetCookieHeader(headerValue: string): string[] {
  return headerValue.split(/,(?=\s*[^=;,\s]+=)/).map((part) => part.trim());
}

export function parseCookie(raw: string): ParsedCookie {
  const [nameValue, ...attributes] = raw.split(";").map((part) => part.trim());
  const eqIndex = nameValue.indexOf("=");
  const name = eqIndex === -1 ? nameValue : nameValue.slice(0, eqIndex);
  const value = eqIndex === -1 ? "" : nameValue.slice(eqIndex + 1);
  return { name, value, attributes };
}

export function parseSetCookieHeader(headerValue: string | undefined): ParsedCookie[] {
  if (!headerValue) return [];
  return splitSetCookieHeader(headerValue).filter(Boolean).map(parseCookie);
}
