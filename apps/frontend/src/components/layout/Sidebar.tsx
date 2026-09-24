import { useState } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { FolderClosed, History as HistoryIcon } from "lucide-react";
import { CollectionsPanel } from "../collections/CollectionsPanel";
import { HistoryPanel } from "../history/HistoryPanel";

type SidebarTab = "collections" | "history";

const TABS: { id: SidebarTab; label: string; icon: ReactNode }[] = [
  { id: "collections", label: "Collections", icon: <FolderClosed size={17} strokeWidth={1.75} /> },
  { id: "history", label: "History", icon: <HistoryIcon size={17} strokeWidth={1.75} /> },
];

/** Postman-style sidebar: a narrow icon rail choosing what the panel beside it shows. */
export function Sidebar() {
  const [tab, setTab] = useState<SidebarTab>("collections");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <aside className="flex h-full w-full border-r border-slate-200 bg-white dark:border-white/[0.06] dark:bg-surface-dark-subtle">
      <nav
        aria-label="Sidebar"
        className="flex w-[70px] shrink-0 flex-col items-center gap-1 border-r border-slate-100 py-2 dark:border-white/[0.04]"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={clsx(
              "flex w-[62px] flex-col items-center gap-1 rounded-lg py-2 text-[10.5px] font-medium transition-colors",
              tab === item.id
                ? "bg-slate-100 text-slate-900 dark:bg-white/[0.07] dark:text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center border-b border-slate-100 px-3.5 dark:border-white/[0.04]">
          <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{active.label}</h2>
        </div>
        <div className="min-h-0 flex-1">
          {tab === "collections" && <CollectionsPanel />}
          {tab === "history" && <HistoryPanel />}
        </div>
      </div>
    </aside>
  );
}
