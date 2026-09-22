import { useState } from "react";
import { useClearHistory, useDeleteHistoryEntry, useHistoryList } from "../../hooks/useHistory";
import { useRequestStore } from "../../store/useRequestStore";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { HistoryItem } from "./HistoryItem";

export function HistoryPanel() {
  const [search, setSearch] = useState("");
  const { data: entries, isLoading } = useHistoryList(search);
  const deleteEntry = useDeleteHistoryEntry();
  const clearAll = useClearHistory();
  const loadFromHistory = useRequestStore((s) => s.loadFromHistory);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search history…"
          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        />
        {entries && entries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending}
            aria-label="Clear all history"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-1 pb-2">
        {isLoading && <p className="px-2 py-4 text-xs text-slate-400">Loading history…</p>}

        {!isLoading && entries && entries.length === 0 && (
          <EmptyState
            title={search ? "No matching requests" : "No history yet"}
            description={search ? "Try a different search term." : "Requests you send will show up here."}
          />
        )}

        {entries?.map((entry) => (
          <HistoryItem
            key={entry.id}
            entry={entry}
            onOpen={() => loadFromHistory(entry)}
            onDelete={() => deleteEntry.mutate(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}
