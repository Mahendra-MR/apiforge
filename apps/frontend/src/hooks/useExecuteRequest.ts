import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { executeRequest } from "../api/requests";
import { ApiClientError } from "../api/client";
import { historyQueryKey } from "./useHistory";

/**
 * Executes the current draft against the backend proxy. On success it
 * invalidates the history list (the backend already recorded the entry) so
 * the sidebar picks up the new request without a manual refresh.
 */
export function useExecuteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: executeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historyQueryKey() });
    },
    onError: (error) => {
      const message = error instanceof ApiClientError ? error.message : "Failed to send request";
      toast.error(message);
    },
  });
}
