import { apiFetch } from "./client";
import type { Environment } from "../types";

export async function fetchEnvironments(): Promise<Environment[]> {
  const { environments } = await apiFetch<{ environments: Environment[] }>("/environments");
  return environments;
}

/**
 * Creates an environment. Omit `collectionId` (or pass null) for a global,
 * app-wide environment — the request body then has no `collectionId` key at
 * all, matching the API's shape from before per-folder environments existed.
 * Pass a folder id to bind it to that top-level folder's subtree instead.
 */
export function createEnvironment(name: string, collectionId?: string | null): Promise<Environment> {
  const payload: { name: string; collectionId?: string } = { name };
  if (collectionId) payload.collectionId = collectionId;
  return apiFetch<Environment>("/environments", { method: "POST", body: JSON.stringify(payload) });
}

export function renameEnvironment(id: string, name: string): Promise<Environment> {
  return apiFetch<Environment>(`/environments/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export function activateEnvironment(id: string): Promise<Environment> {
  return apiFetch<Environment>(`/environments/${id}/activate`, { method: "POST" });
}

export function deleteEnvironment(id: string): Promise<void> {
  return apiFetch<void>(`/environments/${id}`, { method: "DELETE" });
}

export interface UpsertVariableInput {
  key: string;
  value: string;
  isSecret?: boolean;
}

export function createVariable(environmentId: string, input: UpsertVariableInput) {
  return apiFetch(`/environments/${environmentId}/variables`, { method: "POST", body: JSON.stringify(input) });
}

export function updateVariable(environmentId: string, variableId: string, input: Partial<UpsertVariableInput>) {
  return apiFetch(`/environments/${environmentId}/variables/${variableId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteVariable(environmentId: string, variableId: string): Promise<void> {
  return apiFetch<void>(`/environments/${environmentId}/variables/${variableId}`, { method: "DELETE" });
}
