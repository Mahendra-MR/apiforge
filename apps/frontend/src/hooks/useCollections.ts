import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createCollection,
  deleteCollection,
  fetchCollections,
  saveRequestToCollection,
  updateCollection,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "../api/collections";
import { ApiClientError } from "../api/client";
import type { SaveRequestInput } from "../types";

export function collectionsQueryKey() {
  return ["collections"] as const;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

export function useCollectionsTree() {
  return useQuery({ queryKey: collectionsQueryKey(), queryFn: fetchCollections });
}

/** Wraps a mutation that only needs to invalidate the collections tree on success and toast on failure — every mutation below follows this same shape. */
function useCollectionsMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  errorFallback: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionsQueryKey() }),
    onError: (error) => toast.error(errorMessage(error, errorFallback)),
  });
}

export function useCreateCollection() {
  return useCollectionsMutation((input: CreateCollectionInput) => createCollection(input), "Failed to create folder");
}

export function useUpdateCollection() {
  return useCollectionsMutation(
    ({ id, input }: { id: string; input: UpdateCollectionInput }) => updateCollection(id, input),
    "Failed to update folder",
  );
}

export function useDeleteCollection() {
  return useCollectionsMutation((id: string) => deleteCollection(id), "Failed to delete folder");
}

export function useSaveRequestToCollection() {
  return useCollectionsMutation(
    ({ collectionId, input }: { collectionId: string; input: SaveRequestInput }) =>
      saveRequestToCollection(collectionId, input),
    "Failed to save request",
  );
}
