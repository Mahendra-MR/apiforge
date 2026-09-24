import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { METHOD_TEXT_COLOR } from "../../lib/methodColors";
import { useRequestStore } from "../../store/useRequestStore";
import type { SavedRequest } from "../../types";

interface SavedRequestRowProps {
  request: SavedRequest;
  depth: number;
  onOpen: () => void;
  onDelete: () => void;
}

export function SavedRequestRow({ request, depth, onOpen, onDelete }: SavedRequestRowProps) {
  const isActive = useRequestStore((s) => s.draft.savedRequestId === request.id);

  return (
    <div
      className={clsx(
        "group flex items-center gap-2 rounded-md py-1 pr-2",
        isActive ? "bg-emerald-50 dark:bg-emerald-500/10" : "hover:bg-slate-100 dark:hover:bg-slate-800",
      )}
      style={{ paddingLeft: `${depth * 16 + 24}px` }}
    >
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className={clsx("w-12 shrink-0 text-xs font-bold", METHOD_TEXT_COLOR[request.method] ?? "text-slate-500")}>
          {request.method}
        </span>
        <span
          className={clsx(
            "truncate text-sm",
            isActive ? "font-medium text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200",
          )}
        >
          {request.name}
        </span>
      </button>
      <button
        onClick={onDelete}
        aria-label={`Delete request ${request.name}`}
        className="shrink-0 rounded p-1 text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100 dark:text-slate-600"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
