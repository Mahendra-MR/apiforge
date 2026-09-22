import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { clearHistory, deleteHistoryEntry, fetchHistory } from "../api/history";

export function historyQueryKey(search?: string) {
  return ["history", search ?? ""] as const;
}

export function useHistoryList(search: string) {
  return useQuery({
    queryKey: historyQueryKey(search),
    queryFn: () => fetchHistory(search || undefined),
  });
}

export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHistoryEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: () => toast.error("Failed to delete history entry"),
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearHistory,
    onSuccess: ({ deletedCount }) => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success(`Cleared ${deletedCount} history ${deletedCount === 1 ? "entry" : "entries"}`);
    },
    onError: () => toast.error("Failed to clear history"),
  });
}
