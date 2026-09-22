import { useState } from "react";
import clsx from "clsx";
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
            "flex-1 px-3 py-2 text-sm font-medium",
            tab === "collections"
              ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          Collections
        </button>
        <button
          onClick={() => setTab("history")}
          className={clsx(
            "flex-1 px-3 py-2 text-sm font-medium",
            tab === "history"
              ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
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
