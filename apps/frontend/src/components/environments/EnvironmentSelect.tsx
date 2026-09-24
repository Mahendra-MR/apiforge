import clsx from "clsx";
import { Check, ChevronDown, Layers } from "lucide-react";
import { MenuItem, Popover } from "../common/Popover";
import type { Environment } from "../../types";

const NO_ENVIRONMENT = "__none__";

interface EnvironmentSelectProps {
  environments: Environment[] | undefined;
  activeId: string;
  onSelect: (id: string) => void;
}

/** Custom-styled replacement for a native `<select>` so the closed state and the option list both match the rest of the app (colored active-state dot, proper hover/focus rings) instead of falling back to OS chrome. */
export function EnvironmentSelect({ environments, activeId, onSelect }: EnvironmentSelectProps) {
  const active = environments?.find((environment) => environment.id === activeId);

  return (
    <Popover
      align="left"
      width="min-w-[190px]"
      trigger={(toggle, isOpen) => (
        <button
          onClick={toggle}
          aria-label="Active environment"
          className={clsx(
            "flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm shadow-subtle transition-colors dark:border-slate-700 dark:bg-slate-800/60",
            active ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500",
            isOpen && "border-emerald-500 ring-1 ring-emerald-500/50",
          )}
        >
          <Layers size={13} className={active ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"} />
          <span className="max-w-[140px] truncate">{active?.name ?? "No Environment"}</span>
          <ChevronDown size={13} className="text-slate-400" />
        </button>
      )}
    >
      {(close) => (
        <>
          {!environments?.length && (
            <p className="px-3 py-1.5 text-xs text-slate-400">No environments yet</p>
          )}
          {environments?.map((environment) => (
            <MenuItem
              key={environment.id}
              icon={environment.id === activeId ? <Check size={13} className="text-emerald-500" /> : <span className="inline-block w-[13px]" />}
              onClick={() => { onSelect(environment.id); close(); }}
            >
              {environment.name}
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  );
}

export { NO_ENVIRONMENT };
