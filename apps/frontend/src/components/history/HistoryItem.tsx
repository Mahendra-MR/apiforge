import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { formatTimestamp } from "../../lib/format";
import { METHOD_TEXT_COLOR } from "../../lib/methodColors";
import type { HistoryEntry } from "../../types";
import { Badge, statusToneForCode } from "../common/Badge";

interface HistoryItemProps {
  entry: HistoryEntry;
  onOpen: () => void;
  onDelete: () => void;
}

export function HistoryItem({ entry, onOpen, onDelete }: HistoryItemProps) {
  let path = entry.url;
  try {
    const url = new URL(entry.url);
    path = `${url.pathname}${url.search}`;
  } catch {
    // keep the raw url if it isn't a valid absolute URL
  }

  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={clsx("w-14 shrink-0 text-xs font-bold", METHOD_TEXT_COLOR[entry.method] ?? "text-slate-500")}>
            {entry.method}
          </span>
          <span className="truncate text-sm text-slate-700 dark:text-slate-200">{path}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 pl-16">
          {entry.responseStatus != null && (
            <Badge tone={statusToneForCode(entry.responseStatus)}>{entry.responseStatus}</Badge>
          )}
          {entry.error && <Badge tone="danger">error</Badge>}
          <span className="text-[11px] text-slate-400">{formatTimestamp(entry.executedAt)}</span>
        </div>
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete history entry"
        className="shrink-0 rounded p-1 text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100 dark:text-slate-600"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
