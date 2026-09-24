import type { ExecuteRequestPayload } from "../types";

/** Wraps a value in single quotes for a POSIX shell, escaping embedded single quotes as '\''. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Renders the exact request that Send would execute (variables resolved,
 * auth applied — see buildExecutePayload) as a copy-pasteable cURL command,
 * in the same multi-line style Postman's code snippet uses. Pasting the
 * output back into the URL bar round-trips through parseCurl.
 */
export function payloadToCurl(payload: ExecuteRequestPayload): string {
  const parts = [`curl --location${payload.method === "GET" ? "" : ` --request ${payload.method}`} ${shellQuote(payload.url)}`];
  for (const [key, value] of Object.entries(payload.headers ?? {})) {
    parts.push(`--header ${shellQuote(`${key}: ${value}`)}`);
  }
  if (payload.body) {
    parts.push(`--data ${shellQuote(payload.body)}`);
  }
  return parts.join(" \\\n");
}
