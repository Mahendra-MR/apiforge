import { apiFetch } from "./client";
import type { ExecuteRequestPayload, ExecuteRequestResponse, SaveRequestInput, SavedRequest } from "../types";

export function executeRequest(payload: ExecuteRequestPayload): Promise<ExecuteRequestResponse> {
  return apiFetch<ExecuteRequestResponse>("/requests/execute", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchSavedRequest(id: string): Promise<SavedRequest> {
  return apiFetch<SavedRequest>(`/requests/${id}`);
}

export interface UpdateSavedRequestInput extends Partial<SaveRequestInput> {
  collectionId?: string | null;
}

export function updateSavedRequest(id: string, input: UpdateSavedRequestInput): Promise<SavedRequest> {
  return apiFetch<SavedRequest>(`/requests/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteSavedRequest(id: string): Promise<void> {
  return apiFetch<void>(`/requests/${id}`, { method: "DELETE" });
}
