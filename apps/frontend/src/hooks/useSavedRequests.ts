import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteSavedRequest, updateSavedRequest, type UpdateSavedRequestInput } from "../api/requests";
import { ApiClientError } from "../api/client";
import { collectionsQueryKey } from "./useCollections";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

// Note: there's no useFetchSavedRequest hook — GET /api/collections already
// returns every saved request in full (see api/collections.ts), so the
// Collections tree loads a request via loadFromSavedRequest directly from
// that list instead of making a second round trip. The GET /api/requests/:id
// route this would call still exists on the backend for future direct-link use.

export function useUpdateSavedRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSavedRequestInput }) => updateSavedRequest(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionsQueryKey() }),
    onError: (error) => toast.error(errorMessage(error, "Failed to update request")),
  });
}

export function useDeleteSavedRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionsQueryKey() }),
    onError: (error) => toast.error(errorMessage(error, "Failed to delete request")),
  });
}
