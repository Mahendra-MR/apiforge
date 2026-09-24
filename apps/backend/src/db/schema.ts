/**
 * APIForge AI — SQLite schema, applied idempotently on every startup via
 * `CREATE TABLE IF NOT EXISTS`. There's no separate migration step to run
 * for an embedded, single-user desktop database at this scale.
 *
 * Kept as a TS string (rather than a loose `.sql` file) so it's included in
 * the compiled `dist/` output automatically — `tsc` only copies `.ts`
 * sources, and this file also has to work packaged inside the Electron app.
 *
 * Conversions from the earlier Postgres schema (see the project's build
 * notes for the full Phase 3 rewrite rationale):
 *   - UUID PRIMARY KEY DEFAULT gen_random_uuid()  -> TEXT PRIMARY KEY, id generated
 *     in application code (see src/db/ids.ts) and passed in explicitly.
 *   - ENUM types (auth_type, body_type)           -> TEXT + CHECK (col IN (...)).
 *   - BOOLEAN                                     -> INTEGER (0/1).
 *   - TIMESTAMPTZ DEFAULT now()                   -> TEXT (ISO-8601), generated in
 *     application code and passed in explicitly instead of a DB default.
 *   - JSONB                                       -> TEXT (already stored/read as
 *     JSON strings by the service layer's jsonOrNull()/JSON.parse()).
 *   - The set_updated_at() trigger                -> dropped; each UPDATE statement
 *     sets updated_at explicitly instead (simpler than reasoning about trigger
 *     timing relative to a RETURNING clause).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  query_params TEXT,
  path_params TEXT,
  headers TEXT,
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'basic', 'apiKey', 'oauth2')),
  auth_config TEXT,
  body_type TEXT NOT NULL DEFAULT 'none' CHECK (body_type IN ('none', 'json', 'raw', 'formData')),
  body TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS requests_collection_id_idx ON requests(collection_id);

CREATE TABLE IF NOT EXISTS environments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- NULL means this environment is global (the app-wide fallback); set means it only
  -- applies to that folder's subtree and is activated independently of every other scope.
  collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS environments_user_id_idx ON environments(user_id);
CREATE INDEX IF NOT EXISTS environments_collection_id_idx ON environments(collection_id);

CREATE TABLE IF NOT EXISTS environment_variables (
  id TEXT PRIMARY KEY,
  environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_secret INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (environment_id, key)
);

CREATE TABLE IF NOT EXISTS request_history (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  request_id TEXT REFERENCES requests(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  request_headers TEXT,
  request_body TEXT,
  response_status INTEGER,
  response_headers TEXT,
  response_body TEXT,
  response_time_ms INTEGER,
  response_size_bytes INTEGER,
  error TEXT,
  executed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS request_history_executed_at_idx ON request_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS request_history_user_id_idx ON request_history(user_id);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS ai_conversations_feature_idx ON ai_conversations(feature);
`;
