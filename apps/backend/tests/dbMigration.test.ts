import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCHEMA_SQL } from "../src/db/schema.js";

/**
 * Regression test for a real upgrade bug: someone upgrading from an older
 * APIForge build already has an `environments` table without `collection_id`
 * on disk. `SCHEMA_SQL`'s `CREATE TABLE IF NOT EXISTS` is a no-op against that
 * existing table, but it used to also `CREATE INDEX ... ON
 * environments(collection_id)` in the same script -- which threw "no such
 * column: collection_id" before `runMigrations()` (see pool.ts) could add it,
 * crashing the app on startup for every upgrading user.
 *
 * `sqliteIntegration.test.ts` runs against a fresh `:memory:` database, so it
 * can't catch this. The seed here is today's real SCHEMA_SQL with only the
 * environments table's `collection_id` column stripped back out, so every
 * other table stays faithful to the current schema.
 */
function columnNames(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}

describe("database upgrade migration", () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "apiforge-migration-test-"));
    dbPath = join(dir, "apiforge.db");

    const preMigrationSchema = SCHEMA_SQL.replace(
      "\n  collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,\n",
      "\n",
    );
    const seed = new Database(dbPath);
    seed.exec(preMigrationSchema);
    expect(columnNames(seed, "environments")).not.toContain("collection_id");
    seed.close();

    vi.stubEnv("DB_PATH", dbPath);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(dir, { recursive: true, force: true });
  });

  it("adds collection_id and its index to an existing environments table without crashing", async () => {
    await expect(import("../src/db/pool.js")).resolves.toBeDefined();

    const check = new Database(dbPath, { readonly: true });
    expect(columnNames(check, "environments")).toContain("collection_id");
    const indexes = check.prepare("PRAGMA index_list(environments)").all() as { name: string }[];
    expect(indexes.map((i) => i.name)).toContain("environments_collection_id_idx");
    check.close();
  });
});
