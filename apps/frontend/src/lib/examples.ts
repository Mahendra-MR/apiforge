import type { CreateExampleInput, ExecuteRequestResponse, RequestExample } from "../types";

/** Snapshot of a live response as an example payload, named after its status line like Postman does. */
export function exampleInputFromResponse(response: ExecuteRequestResponse): CreateExampleInput {
  return {
    name: `${response.status} ${response.statusText}`.trim(),
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body: response.body,
    timeMs: response.timeMs,
    sizeBytes: response.sizeBytes,
  };
}

/** Turns a saved example back into the shape the response viewer renders, re-deriving parsed JSON from the stored body. */
export function exampleToResponse(example: RequestExample): ExecuteRequestResponse {
  let bodyJson: unknown | null = null;
  try {
    bodyJson = example.body.trim() !== "" ? JSON.parse(example.body) : null;
  } catch {
    bodyJson = null;
  }
  return {
    status: example.status,
    statusText: example.statusText,
    headers: example.headers,
    body: example.body,
    bodyJson,
    timeMs: example.timeMs ?? 0,
    sizeBytes: example.sizeBytes ?? example.body.length,
  };
}
