import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ApiClientError } from "../api/client";
import { createExample, deleteExample, renameExample } from "../api/examples";
import type { CreateExampleInput } from "../types";
import { collectionsQueryKey } from "./useCollections";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

/** Examples are returned alongside the collections tree, so every mutation here just refreshes that one query. */
function useExampleMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>, errorFallback: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionsQueryKey() }),
    onError: (error) => toast.error(errorMessage(error, errorFallback)),
  });
}

export function useCreateExample() {
  return useExampleMutation(
    ({ requestId, input }: { requestId: string; input: CreateExampleInput }) => createExample(requestId, input),
    "Failed to save example",
  );
}

export function useRenameExample() {
  return useExampleMutation(({ id, name }: { id: string; name: string }) => renameExample(id, name), "Failed to rename example");
}

export function useDeleteExample() {
  return useExampleMutation((id: string) => deleteExample(id), "Failed to delete example");
}
