import { newId, nowIso, toDbBool } from "../db/ids.js";
import { pool } from "../db/pool.js";
import {
  type Environment,
  type EnvironmentRow,
  type EnvironmentVariable,
  type EnvironmentVariableRow,
  mapEnvironmentRow,
  mapVariableRow,
} from "../types/environment.js";

/** Fetches every environment for a user, each with its variables attached, active-first then by name. */
export async function listEnvironments(userId: string): Promise<Environment[]> {
  const envResult = await pool.query<EnvironmentRow>(
    `SELECT * FROM environments WHERE user_id = $1 ORDER BY is_active DESC, name ASC`,
    [userId],
  );
  if (envResult.rows.length === 0) return [];

  const environmentIds = envResult.rows.map((row) => row.id);
  const placeholders = environmentIds.map(() => "?").join(", ");
  const varsResult = await pool.query<EnvironmentVariableRow>(
    `SELECT * FROM environment_variables WHERE environment_id IN (${placeholders}) ORDER BY key ASC`,
    environmentIds,
  );

  const variablesByEnvironment = new Map<string, EnvironmentVariable[]>();
  for (const row of varsResult.rows) {
    const variable = mapVariableRow(row);
    const existing = variablesByEnvironment.get(variable.environmentId) ?? [];
    existing.push(variable);
    variablesByEnvironment.set(variable.environmentId, existing);
  }

  return envResult.rows.map((row) => mapEnvironmentRow(row, variablesByEnvironment.get(row.id) ?? []));
}

async function getEnvironmentOrThrow(id: string, userId: string): Promise<Environment | null> {
  const result = await pool.query<EnvironmentRow>(
    `SELECT * FROM environments WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  if (result.rows.length === 0) return null;

  const varsResult = await pool.query<EnvironmentVariableRow>(
    `SELECT * FROM environment_variables WHERE environment_id = $1 ORDER BY key ASC`,
    [id],
  );
  return mapEnvironmentRow(result.rows[0], varsResult.rows.map(mapVariableRow));
}

export { getEnvironmentOrThrow as getEnvironment };

/** Creates a new environment. The user's first environment is activated automatically for convenience. */
export async function createEnvironment(userId: string, name: string): Promise<Environment> {
  const { rows: existing } = await pool.query("SELECT 1 FROM environments WHERE user_id = $1 LIMIT 1", [userId]);
  const isFirstEnvironment = existing.length === 0;

  const timestamp = nowIso();
  const result = await pool.query<EnvironmentRow>(
    `INSERT INTO environments (id, user_id, name, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [newId(), userId, name, toDbBool(isFirstEnvironment), timestamp, timestamp],
  );
  return mapEnvironmentRow(result.rows[0], []);
}

export async function renameEnvironment(id: string, userId: string, name: string): Promise<Environment | null> {
  const result = await pool.query<EnvironmentRow>(
    `UPDATE environments SET name = $1, updated_at = $2 WHERE id = $3 AND user_id = $4 RETURNING *`,
    [name, nowIso(), id, userId],
  );
  if (result.rows.length === 0) return null;
  return getEnvironmentOrThrow(id, userId);
}

/** Activates one environment and deactivates all others for the user, atomically. */
export async function setActiveEnvironment(id: string, userId: string): Promise<Environment | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query<EnvironmentRow>(
      `UPDATE environments SET is_active = true, updated_at = $1 WHERE id = $2 AND user_id = $3 RETURNING id`,
      [nowIso(), id, userId],
    );
    if (updated.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(`UPDATE environments SET is_active = false WHERE user_id = $1 AND id != $2`, [userId, id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getEnvironmentOrThrow(id, userId);
}

export async function deleteEnvironment(id: string, userId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM environments WHERE id = $1 AND user_id = $2", [id, userId]);
  return (result.rowCount ?? 0) > 0;
}

export interface CreateVariableInput {
  key: string;
  value: string;
  isSecret?: boolean;
}

export async function createVariable(environmentId: string, input: CreateVariableInput): Promise<EnvironmentVariable> {
  const timestamp = nowIso();
  const result = await pool.query<EnvironmentVariableRow>(
    `INSERT INTO environment_variables (id, environment_id, key, value, is_secret, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (environment_id, key) DO UPDATE SET value = EXCLUDED.value, is_secret = EXCLUDED.is_secret, updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [newId(), environmentId, input.key, input.value, toDbBool(input.isSecret ?? false), timestamp, timestamp],
  );
  return mapVariableRow(result.rows[0]);
}

export interface UpdateVariableInput {
  key?: string;
  value?: string;
  isSecret?: boolean;
}

export async function updateVariable(
  variableId: string,
  environmentId: string,
  input: UpdateVariableInput,
): Promise<EnvironmentVariable | null> {
  const result = await pool.query<EnvironmentVariableRow>(
    `UPDATE environment_variables
     SET key = COALESCE($1, key), value = COALESCE($2, value), is_secret = COALESCE($3, is_secret), updated_at = $4
     WHERE id = $5 AND environment_id = $6
     RETURNING *`,
    [
      input.key ?? null,
      input.value ?? null,
      input.isSecret === undefined ? null : toDbBool(input.isSecret),
      nowIso(),
      variableId,
      environmentId,
    ],
  );
  return result.rows.length > 0 ? mapVariableRow(result.rows[0]) : null;
}

export async function deleteVariable(variableId: string, environmentId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM environment_variables WHERE id = $1 AND environment_id = $2", [
    variableId,
    environmentId,
  ]);
  return (result.rowCount ?? 0) > 0;
}
