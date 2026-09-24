import { useState } from "react";
import { ChevronDown, Settings, Sparkles, Zap } from "lucide-react";
import { EnvironmentManager } from "../environments/EnvironmentManager";
import { useActivateEnvironment, useEnvironmentsList } from "../../hooks/useEnvironments";
import { ThemeToggle } from "../common/ThemeToggle";

const NO_ENVIRONMENT = "__none__";

export function TopBar() {
  const [managerOpen, setManagerOpen] = useState(false);
  const { data: environments } = useEnvironmentsList();
  const activateEnvironment = useActivateEnvironment();
  const activeId = environments?.find((environment) => environment.isActive)?.id ?? NO_ENVIRONMENT;

  function handleSelect(id: string) {
    if (id === NO_ENVIRONMENT) return;
    activateEnvironment.mutate(id);
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-surface-dark-subtle">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-subtle">
          <Zap size={15} fill="currentColor" strokeWidth={0} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">APIForge AI</span>
      </div>

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

      <button
        disabled
        title="Multiple workspaces are coming in a later phase"
        className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-400"
      >
        My Workspace
        <ChevronDown size={14} />
      </button>

      <div className="flex items-center gap-1.5">
        <select
          value={activeId}
          onChange={(e) => handleSelect(e.target.value)}
          aria-label="Active environment"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-subtle focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
        >
          {!environments?.some((environment) => environment.isActive) && <option value={NO_ENVIRONMENT}>No Environment</option>}
          {environments?.map((environment) => (
            <option key={environment.id} value={environment.id}>
              {environment.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setManagerOpen(true)}
          title="Manage environments"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200"
        >
          <Settings size={16} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          disabled
          title="The AI Assistant is coming in a later phase"
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-400 dark:border-slate-700"
        >
          <Sparkles size={14} />
          AI Assistant
        </button>
        <ThemeToggle />
      </div>

      <EnvironmentManager open={managerOpen} onClose={() => setManagerOpen(false)} />
    </header>
  );
}
