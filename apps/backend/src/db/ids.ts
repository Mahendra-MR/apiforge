import { randomUUID } from "node:crypto";

/**
 * SQLite has no `gen_random_uuid()`/`now()` server-side defaults the way
 * Postgres did, so ids and timestamps are generated here in application code
 * and passed explicitly into INSERT/UPDATE statements instead.
 */

export function newId(): string {
  return randomUUID();
}

/** ISO-8601 with milliseconds, e.g. "2026-01-01T00:00:00.000Z" — matches the format already asserted on throughout the existing tests. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** better-sqlite3 rejects raw JS booleans as bind parameters ("can only bind numbers, strings, bigints, buffers, and null") — convert to 0/1 before binding one. SQLite treats any nonzero integer as true in a boolean context (e.g. `CASE WHEN ? THEN ...`), so no `::boolean` cast is needed on the SQL side either. */
export function toDbBool(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}
