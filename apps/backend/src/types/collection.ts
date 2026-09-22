export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export function mapCollectionRow(row: CollectionRow): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type AuthType = "none" | "bearer" | "basic" | "apiKey" | "oauth2";
export type BodyType = "none" | "json" | "raw" | "formData";

export interface SavedRequest {
  id: string;
  collectionId: string | null;
  name: string;
  method: string;
  url: string;
  queryParams: unknown;
  pathParams: unknown;
  headers: Record<string, string> | null;
  authType: AuthType;
  authConfig: unknown;
  bodyType: BodyType;
  body: unknown;
  createdAt: string;
  updatedAt: string;
}

/** Raw shape of a `requests` row as returned by better-sqlite3. JSON columns (query_params/path_params/headers/auth_config/body) come back as raw strings, not parsed values — see mapSavedRequestRow. */
export interface SavedRequestRow {
  id: string;
  collection_id: string | null;
  name: string;
  method: string;
  url: string;
  query_params: string | null;
  path_params: string | null;
  headers: string | null;
  auth_type: AuthType;
  auth_config: string | null;
  body_type: BodyType;
  body: string | null;
  created_at: string;
  updated_at: string;
}

function parseJsonColumn(value: string | null): unknown {
  return value !== null ? JSON.parse(value) : null;
}

export function mapSavedRequestRow(row: SavedRequestRow): SavedRequest {
  return {
    id: row.id,
    collectionId: row.collection_id,
    name: row.name,
    method: row.method,
    url: row.url,
    queryParams: parseJsonColumn(row.query_params),
    pathParams: parseJsonColumn(row.path_params),
    headers: parseJsonColumn(row.headers) as Record<string, string> | null,
    authType: row.auth_type,
    authConfig: parseJsonColumn(row.auth_config),
    bodyType: row.body_type,
    body: parseJsonColumn(row.body),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
