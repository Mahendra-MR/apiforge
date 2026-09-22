import { newId, nowIso, toDbBool } from "../db/ids.js";
import { pool } from "../db/pool.js";
import type { AuthType, BodyType, SavedRequest, SavedRequestRow } from "../types/collection.js";
import { mapSavedRequestRow } from "../types/collection.js";

/**
 * Saved requests are scoped to their collection's owner, but since there's
 * only one local user right now (see config/constants.ts), these functions
 * operate on `requests` directly rather than joining through `collections`
 * to check ownership. Revisit once real multi-user auth exists.
 */

export interface SaveRequestInput {
  name: string;
  method: string;
  url: string;
  queryParams?: unknown;
  pathParams?: unknown;
  headers?: Record<string, string>;
  authType?: AuthType;
  authConfig?: unknown;
  bodyType?: BodyType;
  body?: unknown;
}

export async function createSavedRequest(collectionId: string, input: SaveRequestInput): Promise<SavedRequest> {
  const timestamp = nowIso();
  const result = await pool.query<SavedRequestRow>(
    `INSERT INTO requests
       (id, collection_id, name, method, url, query_params, path_params, headers, auth_type, auth_config, body_type, body, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      newId(),
      collectionId,
      input.name,
      input.method,
      input.url,
      jsonOrNull(input.queryParams),
      jsonOrNull(input.pathParams),
      jsonOrNull(input.headers),
      input.authType ?? "none",
      jsonOrNull(input.authConfig),
      input.bodyType ?? "none",
      jsonOrNull(input.body),
      timestamp,
      timestamp,
    ],
  );
  return mapSavedRequestRow(result.rows[0]);
}

export async function getSavedRequest(id: string): Promise<SavedRequest | null> {
  const result = await pool.query<SavedRequestRow>(`SELECT * FROM requests WHERE id = $1`, [id]);
  return result.rows.length > 0 ? mapSavedRequestRow(result.rows[0]) : null;
}

export interface UpdateSavedRequestInput extends Partial<SaveRequestInput> {
  collectionId?: string | null;
}

export async function updateSavedRequest(
  id: string,
  input: UpdateSavedRequestInput,
): Promise<SavedRequest | null> {
  const result = await pool.query<SavedRequestRow>(
    `UPDATE requests SET
       name = COALESCE($1, name),
       method = COALESCE($2, method),
       url = COALESCE($3, url),
       query_params = CASE WHEN $4 THEN $5 ELSE query_params END,
       path_params = CASE WHEN $6 THEN $7 ELSE path_params END,
       headers = CASE WHEN $8 THEN $9 ELSE headers END,
       auth_type = COALESCE($10, auth_type),
       auth_config = CASE WHEN $11 THEN $12 ELSE auth_config END,
       body_type = COALESCE($13, body_type),
       body = CASE WHEN $14 THEN $15 ELSE body END,
       collection_id = CASE WHEN $16 THEN $17 ELSE collection_id END,
       updated_at = $18
     WHERE id = $19
     RETURNING *`,
    [
      input.name ?? null,
      input.method ?? null,
      input.url ?? null,
      toDbBool("queryParams" in input),
      jsonOrNull(input.queryParams),
      toDbBool("pathParams" in input),
      jsonOrNull(input.pathParams),
      toDbBool("headers" in input),
      jsonOrNull(input.headers),
      input.authType ?? null,
      toDbBool("authConfig" in input),
      jsonOrNull(input.authConfig),
      input.bodyType ?? null,
      toDbBool("body" in input),
      jsonOrNull(input.body),
      toDbBool("collectionId" in input),
      input.collectionId ?? null,
      nowIso(),
      id,
    ],
  );
  return result.rows.length > 0 ? mapSavedRequestRow(result.rows[0]) : null;
}

export async function deleteSavedRequest(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM requests WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listRequestsForCollections(collectionIds: string[]): Promise<SavedRequest[]> {
  if (collectionIds.length === 0) return [];
  const placeholders = collectionIds.map(() => "?").join(", ");
  const result = await pool.query<SavedRequestRow>(
    `SELECT * FROM requests WHERE collection_id IN (${placeholders}) ORDER BY name ASC`,
    collectionIds,
  );
  return result.rows.map(mapSavedRequestRow);
}

function jsonOrNull(value: unknown): string | null {
  return value !== undefined && value !== null ? JSON.stringify(value) : null;
}
