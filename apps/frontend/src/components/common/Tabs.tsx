import clsx from "clsx";

export interface TabItem {
  id: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Distinguishes this tab group for assistive tech and tests when more than one Tabs renders at once (e.g. request vs. response panels). */
  "aria-label"?: string;
}

export function Tabs({ tabs, activeId, onChange, "aria-label": ariaLabel }: TabsProps) {
  return (
    <div
      className="flex gap-1 border-b border-slate-200 px-2 dark:border-slate-800"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeId}
          onClick={() => onChange(tab.id)}
          className={clsx(
            "relative px-3 py-2.5 text-[13px] font-medium transition-colors",
            tab.id === activeId
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          {tab.label}
          {typeof tab.badge === "number" && tab.badge > 0 && (
            <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {tab.badge}
            </span>
          )}
          {tab.id === activeId && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-500" />
          )}
        </button>
      ))}
    </div>
  );
}
