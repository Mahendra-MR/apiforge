export interface HistoryEntry {
  id: string;
  userId: string | null;
  requestId: string | null;
  method: string;
  url: string;
  requestHeaders: Record<string, string> | null;
  requestBody: unknown;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: unknown;
  responseTimeMs: number | null;
  responseSizeBytes: number | null;
  error: string | null;
  executedAt: string;
}

/** Raw shape of a `request_history` row as returned by better-sqlite3 (snake_case). JSON columns (request_headers/request_body/response_headers/response_body) come back as raw strings, not parsed objects — see mapHistoryRow. */
export interface HistoryRow {
  id: string;
  user_id: string | null;
  request_id: string | null;
  method: string;
  url: string;
  request_headers: string | null;
  request_body: string | null;
  response_status: number | null;
  response_headers: string | null;
  response_body: string | null;
  response_time_ms: number | null;
  response_size_bytes: number | null;
  error: string | null;
  executed_at: string;
}

function parseJsonColumn(value: string | null): unknown {
  return value !== null ? JSON.parse(value) : null;
}

export function mapHistoryRow(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    requestId: row.request_id,
    method: row.method,
    url: row.url,
    requestHeaders: parseJsonColumn(row.request_headers) as Record<string, string> | null,
    requestBody: parseJsonColumn(row.request_body),
    responseStatus: row.response_status,
    responseHeaders: parseJsonColumn(row.response_headers) as Record<string, string> | null,
    responseBody: parseJsonColumn(row.response_body),
    responseTimeMs: row.response_time_ms,
    responseSizeBytes: row.response_size_bytes,
    error: row.error,
    executedAt: row.executed_at,
  };
}
