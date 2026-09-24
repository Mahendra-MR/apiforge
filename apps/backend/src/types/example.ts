/** A saved response attached to a saved request (Postman calls these "examples"). */
export interface RequestExample {
  id: string;
  requestId: string;
  name: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Raw `request_examples` row from better-sqlite3 — `headers` is a JSON string, see mapRequestExampleRow. */
export interface RequestExampleRow {
  id: string;
  request_id: string;
  name: string;
  status: number;
  status_text: string;
  headers: string | null;
  body: string;
  time_ms: number | null;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

export function mapRequestExampleRow(row: RequestExampleRow): RequestExample {
  return {
    id: row.id,
    requestId: row.request_id,
    name: row.name,
    status: row.status,
    statusText: row.status_text,
    headers: row.headers !== null ? (JSON.parse(row.headers) as Record<string, string>) : {},
    body: row.body,
    timeMs: row.time_ms,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
