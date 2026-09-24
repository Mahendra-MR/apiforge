import clsx from "clsx";
import { HTTP_METHODS, type HttpMethod } from "../../types";

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-amber-600 dark:text-amber-400",
  PUT: "text-blue-600 dark:text-blue-400",
  PATCH: "text-purple-600 dark:text-purple-400",
  DELETE: "text-red-600 dark:text-red-400",
  HEAD: "text-slate-500 dark:text-slate-400",
  OPTIONS: "text-slate-500 dark:text-slate-400",
};

export function MethodSelect({ value, onChange }: { value: HttpMethod; onChange: (method: HttpMethod) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as HttpMethod)}
      className={clsx(
        "h-9 rounded-lg border border-slate-200 bg-white pl-2.5 pr-1.5 text-sm font-bold shadow-subtle focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60",
        METHOD_COLORS[value],
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
