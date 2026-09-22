import { apiFetch } from "./client";
import type { HistoryEntry } from "../types";

export async function fetchHistory(search?: string): Promise<HistoryEntry[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const { entries } = await apiFetch<{ entries: HistoryEntry[] }>(`/history${query}`);
  return entries;
}

export function deleteHistoryEntry(id: string): Promise<void> {
  return apiFetch<void>(`/history/${id}`, { method: "DELETE" });
}

export function clearHistory(): Promise<{ deletedCount: number }> {
  return apiFetch<{ deletedCount: number }>("/history", { method: "DELETE" });
}
