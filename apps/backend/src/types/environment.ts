export interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  variables: EnvironmentVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentRow {
  id: string;
  user_id: string;
  name: string;
  /** SQLite has no native boolean type — better-sqlite3 returns this column as 0 or 1. */
  is_active: boolean | 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentVariableRow {
  id: string;
  environment_id: string;
  key: string;
  value: string;
  /** SQLite has no native boolean type — better-sqlite3 returns this column as 0 or 1. */
  is_secret: boolean | 0 | 1;
  created_at: string;
  updated_at: string;
}

export function mapVariableRow(row: EnvironmentVariableRow): EnvironmentVariable {
  return {
    id: row.id,
    environmentId: row.environment_id,
    key: row.key,
    value: row.value,
    isSecret: Boolean(row.is_secret),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEnvironmentRow(row: EnvironmentRow, variables: EnvironmentVariable[] = []): Environment {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    isActive: Boolean(row.is_active),
    variables,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
