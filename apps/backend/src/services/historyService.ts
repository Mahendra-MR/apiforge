import { newId, nowIso } from "../db/ids.js";
import { pool } from "../db/pool.js";
import { type HistoryEntry, type HistoryRow, mapHistoryRow } from "../types/history.js";

export interface RecordHistoryInput {
  /** The saved request this execution came from, if any (Collections), for traceability. */
  requestId?: string;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseTimeMs?: number;
  responseSizeBytes?: number;
  error?: string;
}

export interface ListHistoryOptions {
  search?: string;
  limit?: number;
}

/** Escapes ILIKE wildcard characters so a search term is matched literally. */
function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Persists one executed request as a history entry. */
export async function recordHistory(input: RecordHistoryInput): Promise<HistoryEntry> {
  const result = await pool.query<HistoryRow>(
    `INSERT INTO request_history
       (id, request_id, method, url, request_headers, request_body, response_status, response_headers,
        response_body, response_time_ms, response_size_bytes, error, executed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      newId(),
      input.requestId ?? null,
      input.method,
      input.url,
      input.requestHeaders ? JSON.stringify(input.requestHeaders) : null,
      input.requestBody !== undefined ? JSON.stringify(input.requestBody) : null,
      input.responseStatus ?? null,
      input.responseHeaders ? JSON.stringify(input.responseHeaders) : null,
      input.responseBody !== undefined ? JSON.stringify(input.responseBody) : null,
      input.responseTimeMs ?? null,
      input.responseSizeBytes ?? null,
      input.error ?? null,
      nowIso(),
    ],
  );
  return mapHistoryRow(result.rows[0]);
}

/** Lists history entries, newest first, optionally filtered by a search term over method/URL. */
export async function listHistory(options: ListHistoryOptions = {}): Promise<HistoryEntry[]> {
  const { search, limit = 100 } = options;

  // The search term is bound twice (once per LIKE) rather than reusing one
  // placeholder — SQLite's `?` params are strictly positional, unlike
  // Postgres's `$1` which can be referenced more than once.
  const result = search
    ? await pool.query<HistoryRow>(
        `SELECT * FROM request_history
         WHERE url LIKE $1 ESCAPE '\\' OR method LIKE $2 ESCAPE '\\'
         ORDER BY executed_at DESC
         LIMIT $3`,
        [`%${escapeLikeTerm(search)}%`, `%${escapeLikeTerm(search)}%`, limit],
      )
    : await pool.query<HistoryRow>(
        `SELECT * FROM request_history ORDER BY executed_at DESC LIMIT $1`,
        [limit],
      );

  return result.rows.map(mapHistoryRow);
}

/** Deletes a single history entry. Returns false if it did not exist. */
export async function deleteHistoryEntry(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM request_history WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

/** Clears all history entries. Returns the number of rows deleted. */
export async function clearHistory(): Promise<number> {
  const result = await pool.query("DELETE FROM request_history");
  return result.rowCount ?? 0;
}
