import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env.js";
import { nowIso } from "./ids.js";
import { SCHEMA_SQL } from "./schema.js";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

function openDatabase(): Database.Database {
  if (env.DB_PATH !== ":memory:") {
    mkdirSync(dirname(env.DB_PATH), { recursive: true });
  }
  const db = new Database(env.DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  runMigrations(db);
  seedDefaultUser(db);
  return db;
}

/**
 * One-off column additions for databases created before this column existed.
 * `CREATE TABLE IF NOT EXISTS` (see schema.ts) only applies to brand-new
 * databases — an existing apiforge.db on someone's machine already has the
 * `environments` table without `collection_id`, and nothing else here would
 * ever add it. SQLite has no `ADD COLUMN IF NOT EXISTS` support we can rely
 * on across versions, so this checks `PRAGMA table_info` itself instead.
 */
function runMigrations(db: Database.Database): void {
  const environmentsColumns = db.prepare("PRAGMA table_info(environments)").all() as { name: string }[];
  const hasCollectionId = environmentsColumns.some((column) => column.name === "collection_id");
  if (!hasCollectionId) {
    db.exec("ALTER TABLE environments ADD COLUMN collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE");
  }
}

/**
 * APIForge has no login system yet — it's a local, single-user tool, like
 * Postman's desktop app. Every collection/environment is attributed to this
 * one fixed-id "local user" row (see config/constants.ts) until real
 * multi-user auth exists. Seeded idempotently on every startup rather than
 * via a one-off migration, since there's no migration runner anymore.
 */
function seedDefaultUser(db: Database.Database): void {
  const timestamp = nowIso();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, password_hash, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(DEFAULT_USER_ID, "local@apiforge.dev", "unused-no-login-system-yet", "Local User", timestamp, timestamp);
}

const db = openDatabase();

/** Translates Postgres-style `$1, $2, ...` placeholders (still used throughout the service layer) into SQLite's positional `?`. Safe because every query already uses them in strictly ascending order matching the params array — there's no reordering between the two styles. */
function toSqliteSql(sql: string): string {
  return sql.replace(/\$\d+/g, "?");
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

function execute<T>(sql: string, params: unknown[]): QueryResult<T> {
  const statement = db.prepare(toSqliteSql(sql));
  if (statement.reader) {
    const rows = statement.all(...params) as T[];
    return { rows, rowCount: rows.length };
  }
  const info = statement.run(...params);
  return { rows: [], rowCount: info.changes };
}

export interface PoolClient {
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>;
  release: () => void;
}

/**
 * A `pg`-`Pool`-shaped wrapper around a single embedded `better-sqlite3`
 * connection, so the service layer (written against node-postgres originally)
 * didn't need a rewrite beyond SQL-dialect differences. better-sqlite3 is
 * synchronous; every method here still returns a Promise to match the
 * existing `await pool.query(...)` call sites.
 */
export const pool = {
  query<T = unknown>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return Promise.resolve(execute<T>(sql, params));
  },
  /**
   * There's no real connection pooling with a single embedded SQLite file —
   * `connect()` just hands back a client backed by the same shared
   * connection. `BEGIN`/`COMMIT`/`ROLLBACK` work fine as ordinary statements
   * against it (used by environmentsService.setActiveEnvironment), and since
   * better-sqlite3 executes everything synchronously there's no risk of
   * another in-flight transaction interleaving with this one.
   */
  connect(): Promise<PoolClient> {
    return Promise.resolve({
      query: <T = unknown>(sql: string, params: unknown[] = []) => Promise.resolve(execute<T>(sql, params)),
      release: () => {},
    });
  },
};
