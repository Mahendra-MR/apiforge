import { apiFetch } from "./client";
import type { CreateExampleInput, RequestExample } from "../types";

export function createExample(requestId: string, input: CreateExampleInput): Promise<RequestExample> {
  return apiFetch<RequestExample>(`/requests/${requestId}/examples`, { method: "POST", body: JSON.stringify(input) });
}

export function renameExample(id: string, name: string): Promise<RequestExample> {
  return apiFetch<RequestExample>(`/examples/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export function deleteExample(id: string): Promise<void> {
  return apiFetch<void>(`/examples/${id}`, { method: "DELETE" });
}
