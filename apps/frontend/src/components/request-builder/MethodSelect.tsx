import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { HTTP_METHODS, type HttpMethod } from "../../types";
import { METHOD_TEXT_COLOR } from "../../lib/methodColors";
import { MenuItem, Popover } from "../common/Popover";

export function MethodSelect({ value, onChange }: { value: HttpMethod; onChange: (method: HttpMethod) => void }) {
  return (
    <Popover
      align="left"
      width="min-w-[110px]"
      trigger={(toggle, isOpen) => (
        <button
          onClick={toggle}
          aria-label="HTTP method"
          className={clsx(
            "flex h-9 w-[92px] shrink-0 items-center justify-between gap-1 rounded-l-lg border border-r-0 border-slate-200 bg-white pl-3 pr-2 text-sm font-bold tracking-tight dark:border-slate-700 dark:bg-slate-800/60",
            isOpen && "z-10 ring-1 ring-emerald-500/50",
            METHOD_TEXT_COLOR[value],
          )}
        >
          {value}
          <ChevronDown size={13} className="text-slate-400" />
        </button>
      )}
    >
      {(close) => (
        <>
          {HTTP_METHODS.map((method) => (
            <MenuItem
              key={method}
              onClick={() => { onChange(method); close(); }}
            >
              <span className={clsx("text-sm font-bold", METHOD_TEXT_COLOR[method])}>{method}</span>
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  );
}
