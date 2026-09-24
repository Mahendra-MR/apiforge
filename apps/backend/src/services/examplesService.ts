import { newId, nowIso } from "../db/ids.js";
import { pool } from "../db/pool.js";
import type { RequestExample, RequestExampleRow } from "../types/example.js";
import { mapRequestExampleRow } from "../types/example.js";

export interface CreateExampleInput {
  name: string;
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  timeMs?: number | null;
  sizeBytes?: number | null;
}

export async function createExample(requestId: string, input: CreateExampleInput): Promise<RequestExample> {
  const timestamp = nowIso();
  const result = await pool.query<RequestExampleRow>(
    `INSERT INTO request_examples
       (id, request_id, name, status, status_text, headers, body, time_ms, size_bytes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      newId(),
      requestId,
      input.name,
      input.status,
      input.statusText ?? "",
      JSON.stringify(input.headers ?? {}),
      input.body ?? "",
      input.timeMs ?? null,
      input.sizeBytes ?? null,
      timestamp,
      timestamp,
    ],
  );
  return mapRequestExampleRow(result.rows[0]);
}

export async function renameExample(id: string, name: string): Promise<RequestExample | null> {
  const result = await pool.query<RequestExampleRow>(
    `UPDATE request_examples SET name = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
    [name, nowIso(), id],
  );
  return result.rows.length > 0 ? mapRequestExampleRow(result.rows[0]) : null;
}

export async function deleteExample(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM request_examples WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listExamplesForRequests(requestIds: string[]): Promise<RequestExample[]> {
  if (requestIds.length === 0) return [];
  const placeholders = requestIds.map(() => "?").join(", ");
  const result = await pool.query<RequestExampleRow>(
    `SELECT * FROM request_examples WHERE request_id IN (${placeholders}) ORDER BY created_at ASC`,
    requestIds,
  );
  return result.rows.map(mapRequestExampleRow);
}
