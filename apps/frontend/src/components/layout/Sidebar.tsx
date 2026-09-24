import { useState } from "react";
import clsx from "clsx";
import { FolderClosed, History as HistoryIcon } from "lucide-react";
import { CollectionsPanel } from "../collections/CollectionsPanel";
import { HistoryPanel } from "../history/HistoryPanel";

type SidebarTab = "collections" | "history";

export function Sidebar() {
  const [tab, setTab] = useState<SidebarTab>("collections");

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-dark-subtle">
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setTab("collections")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors",
            tab === "collections"
              ? "border-emerald-500 text-slate-900 dark:text-white"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <FolderClosed size={14} />
          Collections
        </button>
        <button
          onClick={() => setTab("history")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors",
            tab === "history"
              ? "border-emerald-500 text-slate-900 dark:text-white"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <HistoryIcon size={14} />
          History
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "collections" && <CollectionsPanel />}
        {tab === "history" && <HistoryPanel />}
      </div>
    </aside>
  );
}
