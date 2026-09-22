import { apiFetch } from "./client";
import type { Environment } from "../types";

export async function fetchEnvironments(): Promise<Environment[]> {
  const { environments } = await apiFetch<{ environments: Environment[] }>("/environments");
  return environments;
}

export function createEnvironment(name: string): Promise<Environment> {
  return apiFetch<Environment>("/environments", { method: "POST", body: JSON.stringify({ name }) });
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
