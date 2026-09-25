import { useState } from "react";
import clsx from "clsx";
import { Check, Layers, Settings2 } from "lucide-react";
import { useActivateEnvironment, useEnvironmentsList } from "../../hooks/useEnvironments";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { EnvironmentManager } from "./EnvironmentManager";

/**
 * Sidebar panel for the app-wide (global) environments — replaces the old
 * top-bar switcher. Clicking one makes it active; "Manage" opens the full
 * editor for names and variables. A folder's own environment is still
 * managed from that folder's "..." menu.
 */
export function EnvironmentsPanel() {
  const { data: environments, isLoading } = useEnvironmentsList();
  const activateEnvironment = useActivateEnvironment();
  const [managerOpen, setManagerOpen] = useState(false);
  const globalEnvironments = environments?.filter((environment) => environment.collectionId === null) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3.5 pb-2 pt-2.5">
        <p className="truncate text-xs text-slate-400 dark:text-slate-500">Global · all requests</p>
        <Button size="sm" variant="ghost" onClick={() => setManagerOpen(true)}>
          <Settings2 size={13} />
          Manage
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-1.5 pb-3">
        {isLoading && <p className="px-3 py-4 text-xs text-slate-400">Loading environments…</p>}

        {!isLoading && globalEnvironments.length === 0 && (
          <EmptyState
            icon={<Layers size={18} />}
            title="No environments yet"
            description="Environments hold {{variables}} like a base URL or token. Folder-specific ones live in each folder's menu."
            action={
              <Button size="sm" variant="secondary" onClick={() => setManagerOpen(true)}>
                New environment
              </Button>
            }
          />
        )}

        {globalEnvironments.map((environment) => (
          <button
            key={environment.id}
            onClick={() => !environment.isActive && activateEnvironment.mutate(environment.id)}
            aria-pressed={environment.isActive}
            title={environment.isActive ? "Active environment" : "Make this the active environment"}
            className={clsx(
              "flex h-[30px] w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] transition-colors",
              environment.isActive
                ? "bg-slate-200/70 font-medium text-slate-900 dark:bg-white/[0.08] dark:text-white"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.04]",
            )}
          >
            <span className="flex w-4 shrink-0 justify-center">
              {environment.isActive && <Check size={13} className="text-brand-600 dark:text-brand-400" />}
            </span>
            <span className="min-w-0 flex-1 truncate">{environment.name}</span>
            <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
              {environment.variables.length} {environment.variables.length === 1 ? "variable" : "variables"}
            </span>
          </button>
        ))}
      </div>

      <EnvironmentManager open={managerOpen} onClose={() => setManagerOpen(false)} />
    </div>
  );
}
