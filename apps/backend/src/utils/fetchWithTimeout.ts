import { RequestExecutionError, RequestTimeoutError } from "../types/index.js";

/**
 * Thin wrapper around `fetch` that aborts after `timeoutMs` and normalizes
 * failures into our own error types. Shared by the request-execution proxy
 * and the OAuth2 token endpoint — both make an outbound HTTP call on the
 * user's behalf and need the same timeout/error handling.
 */
export async function fetchWithTimeout(
  url: string | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new RequestTimeoutError(timeoutMs);
    }
    throw new RequestExecutionError(error instanceof Error ? error.message : "Failed to execute request", error);
  } finally {
    clearTimeout(timeout);
  }
}
