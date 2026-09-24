import { useState } from "react";
import { Settings, Sparkles } from "lucide-react";
import logo from "../../assets/apiforge-logo.png";
import { EnvironmentManager } from "../environments/EnvironmentManager";
import { EnvironmentSelect } from "../environments/EnvironmentSelect";
import { useActivateEnvironment, useEnvironmentsList } from "../../hooks/useEnvironments";
import { ThemeToggle } from "../common/ThemeToggle";

export function TopBar() {
  const [managerOpen, setManagerOpen] = useState(false);
  const { data: environments } = useEnvironmentsList();
  // The top bar only switches the app-wide global environment — a folder's
  // own environment is managed from that folder's "⋮" menu instead.
  const globalEnvironments = environments?.filter((environment) => environment.collectionId === null);
  const activateEnvironment = useActivateEnvironment();
  const activeId = globalEnvironments?.find((environment) => environment.isActive)?.id ?? "";

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-white/[0.06] dark:bg-surface-dark-subtle">
      <div className="flex items-center gap-2">
        <img src={logo} alt="" className="h-7 w-7 object-contain" />
        <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">APIForge</span>
      </div>

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

      <div className="flex items-center gap-1.5">
        <EnvironmentSelect
          environments={globalEnvironments}
          activeId={activeId}
          onSelect={(id) => activateEnvironment.mutate(id)}
        />

        <button
          onClick={() => setManagerOpen(true)}
          title="Manage environments and their variables"
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
