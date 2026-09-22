import { newId, nowIso, toDbBool } from "../db/ids.js";
import { pool } from "../db/pool.js";
import { type Collection, type CollectionRow, mapCollectionRow } from "../types/collection.js";

const MAX_ANCESTOR_DEPTH = 50;

export async function listCollections(userId: string): Promise<Collection[]> {
  const result = await pool.query<CollectionRow>(
    `SELECT * FROM collections WHERE user_id = $1 ORDER BY name ASC`,
    [userId],
  );
  return result.rows.map(mapCollectionRow);
}

export async function getCollection(id: string, userId: string): Promise<Collection | null> {
  const result = await pool.query<CollectionRow>(
    `SELECT * FROM collections WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return result.rows.length > 0 ? mapCollectionRow(result.rows[0]) : null;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  parentId?: string | null;
}

export async function createCollection(userId: string, input: CreateCollectionInput): Promise<Collection> {
  const timestamp = nowIso();
  const result = await pool.query<CollectionRow>(
    `INSERT INTO collections (id, user_id, name, description, parent_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [newId(), userId, input.name, input.description ?? null, input.parentId ?? null, timestamp, timestamp],
  );
  return mapCollectionRow(result.rows[0]);
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

/**
 * Walks up from `candidateParentId` following parent_id and returns true if
 * `collectionId` appears in that chain — i.e. moving `collectionId` under
 * `candidateParentId` would create a cycle. A depth cap guards against an
 * already-corrupt chain looping forever.
 */
async function wouldCreateCycle(collectionId: string, candidateParentId: string, userId: string): Promise<boolean> {
  let currentId: string | null = candidateParentId;
  for (let depth = 0; currentId !== null && depth < MAX_ANCESTOR_DEPTH; depth += 1) {
    if (currentId === collectionId) return true;
    const result: { rows: { parent_id: string | null }[] } = await pool.query<{ parent_id: string | null }>(
      `SELECT parent_id FROM collections WHERE id = $1 AND user_id = $2`,
      [currentId, userId],
    );
    if (result.rows.length === 0) return false;
    currentId = result.rows[0].parent_id;
  }
  return false;
}

export class CircularCollectionMoveError extends Error {
  constructor() {
    super("Cannot move a collection into one of its own subfolders");
    this.name = "CircularCollectionMoveError";
  }
}

export async function updateCollection(
  id: string,
  userId: string,
  input: UpdateCollectionInput,
): Promise<Collection | null> {
  if (input.parentId) {
    if (input.parentId === id) throw new CircularCollectionMoveError();
    if (await wouldCreateCycle(id, input.parentId, userId)) throw new CircularCollectionMoveError();
  }

  const result = await pool.query<CollectionRow>(
    `UPDATE collections
     SET name = COALESCE($1, name),
         description = CASE WHEN $2 THEN $3 ELSE description END,
         parent_id = CASE WHEN $4 THEN $5 ELSE parent_id END,
         updated_at = $6
     WHERE id = $7 AND user_id = $8
     RETURNING *`,
    [
      input.name ?? null,
      toDbBool("description" in input),
      input.description ?? null,
      toDbBool("parentId" in input),
      input.parentId ?? null,
      nowIso(),
      id,
      userId,
    ],
  );
  return result.rows.length > 0 ? mapCollectionRow(result.rows[0]) : null;
}

export async function deleteCollection(id: string, userId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM collections WHERE id = $1 AND user_id = $2", [id, userId]);
  return (result.rowCount ?? 0) > 0;
}
