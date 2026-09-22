export class InvalidRequestUrlError extends Error {}

/**
 * Validates that a string is an absolute http(s) URL.
 *
 * Note: this intentionally does NOT block localhost/private-network hosts.
 * APIForge is a developer tool whose primary use case includes testing APIs
 * running on the developer's own machine or private network, so blocking
 * those would break core functionality. If this backend is ever deployed as
 * a shared multi-tenant service (rather than run locally by each developer),
 * add an SSRF-style allowlist/denylist here before exposing it publicly.
 */
export function validateRequestUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new InvalidRequestUrlError(`"${rawUrl}" is not a valid URL`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidRequestUrlError(`Unsupported protocol "${url.protocol}". Use http or https.`);
  }

  return url;
}
