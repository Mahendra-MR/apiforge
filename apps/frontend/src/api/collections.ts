import { apiFetch } from "./client";
import type { Collection, SaveRequestInput, SavedRequest } from "../types";

export interface CollectionsResponse {
  collections: Collection[];
  requests: SavedRequest[];
}

export function fetchCollections(): Promise<CollectionsResponse> {
  return apiFetch<CollectionsResponse>("/collections");
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  parentId?: string | null;
}

export function createCollection(input: CreateCollectionInput): Promise<Collection> {
  return apiFetch<Collection>("/collections", { method: "POST", body: JSON.stringify(input) });
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

export function updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection> {
  return apiFetch<Collection>(`/collections/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteCollection(id: string): Promise<void> {
  return apiFetch<void>(`/collections/${id}`, { method: "DELETE" });
}

/** Saves a request draft into a collection. */
export function saveRequestToCollection(collectionId: string, input: SaveRequestInput): Promise<SavedRequest> {
  return apiFetch<SavedRequest>(`/collections/${collectionId}/requests`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
