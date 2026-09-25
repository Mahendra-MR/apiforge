import { Sparkles } from "lucide-react";
import logo from "../../assets/apiforge-logo.png";
import { ThemeToggle } from "../common/ThemeToggle";

// Environments are chosen from the sidebar's Environments panel (global) and
// each folder's "..." menu (per folder), so the top bar stays minimal.
export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-white/[0.06] dark:bg-surface-dark-subtle">
      <div className="flex items-center gap-2">
        <img src={logo} alt="" className="h-7 w-7 object-contain" />
        <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">APIForge</span>
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
    </header>
  );
}
