import { env } from "../config/env.js";
import { type ExecuteRequestInput, type ExecuteRequestResult } from "../types/index.js";
import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";
import { validateRequestUrl } from "../utils/validateUrl.js";

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function tryParseJson(text: string): unknown | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Executes an HTTP request on behalf of the frontend and returns a normalized
 * result. This is the "secure request execution layer" from the architecture:
 * it runs server-side so the browser never has to fight CORS, and so
 * credentials in headers never need to leave the backend's network context
 * more than necessary.
 */
export async function executeHttpRequest(
  input: ExecuteRequestInput,
): Promise<ExecuteRequestResult> {
  const url = validateRequestUrl(input.url);

  const startedAt = performance.now();
  const response = await fetchWithTimeout(
    url,
    {
      method: input.method,
      headers: input.headers,
      body: METHODS_WITHOUT_BODY.has(input.method) ? undefined : (input.body ?? undefined),
      redirect: "follow",
    },
    env.REQUEST_TIMEOUT_MS,
  );

  const rawBody = await response.text();
  const timeMs = Math.round(performance.now() - startedAt);
  const truncatedBody =
    rawBody.length > env.MAX_RESPONSE_BODY_BYTES ? rawBody.slice(0, env.MAX_RESPONSE_BODY_BYTES) : rawBody;

  return {
    status: response.status,
    statusText: response.statusText,
    headers: headersToRecord(response.headers),
    body: truncatedBody,
    bodyJson: tryParseJson(truncatedBody),
    timeMs,
    sizeBytes: Buffer.byteLength(rawBody, "utf8"),
  };
}
