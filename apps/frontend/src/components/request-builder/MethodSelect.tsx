import clsx from "clsx";
import { HTTP_METHODS, type HttpMethod } from "../../types";
import { METHOD_TEXT_COLOR } from "../../lib/methodColors";

export function MethodSelect({ value, onChange }: { value: HttpMethod; onChange: (method: HttpMethod) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as HttpMethod)}
      className={clsx(
        "h-9 shrink-0 rounded-l-lg border border-r-0 border-slate-200 bg-white pl-3 pr-2 text-sm font-bold tracking-tight focus:z-10 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 dark:border-slate-700 dark:bg-slate-800/60",
        METHOD_TEXT_COLOR[value],
      )}
      aria-label="HTTP method"
    >
      {HTTP_METHODS.map((method) => (
        <option key={method} value={method} className="text-slate-900">
          {method}
        </option>
      ))}
    </select>
  );
}
