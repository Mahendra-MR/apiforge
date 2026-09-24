import { X } from "lucide-react";
import type { KeyValueRow } from "../../types";

interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onUpdate: (id: string, patch: Partial<KeyValueRow>) => void;
  onRemove: (id: string) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

const CELL_INPUT =
  "h-8 w-full bg-transparent px-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-brand-50/40 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-brand-500/[0.06]";

/** Reusable key/value grid (query params, headers, form-data rows), laid out as a bordered table like Postman's. */
export function KeyValueEditor({
  rows,
  onUpdate,
  onRemove,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueEditorProps) {
  return (
    <div className="p-4">
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
        <div className="grid grid-cols-[36px_minmax(0,2fr)_minmax(0,3fr)_32px] border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          <span />
          <span className="border-l border-slate-200 px-2.5 py-1.5 dark:border-white/10">Key</span>
          <span className="border-l border-slate-200 px-2.5 py-1.5 dark:border-white/10">Value</span>
          <span />
        </div>
        {rows.map((row, index) => {
          const isBlankLast = index === rows.length - 1 && row.key === "" && row.value === "";
          return (
            <div
              key={row.id}
              className="group grid grid-cols-[36px_minmax(0,2fr)_minmax(0,3fr)_32px] border-b border-slate-100 last:border-b-0 dark:border-white/[0.06]"
            >
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => onUpdate(row.id, { enabled: e.target.checked })}
                  aria-label={`Enable row ${index + 1}`}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
                />
              </label>
              <input
                value={row.key}
                onChange={(e) => onUpdate(row.id, { key: e.target.value })}
                placeholder={keyPlaceholder}
                spellCheck={false}
                className={`${CELL_INPUT} border-l border-slate-100 dark:border-white/[0.06] ${row.enabled ? "" : "text-slate-400 line-through dark:text-slate-500"}`}
              />
              <input
                value={row.value}
                onChange={(e) => onUpdate(row.id, { value: e.target.value })}
                placeholder={valuePlaceholder}
                spellCheck={false}
                className={`${CELL_INPUT} border-l border-slate-100 dark:border-white/[0.06] ${row.enabled ? "" : "text-slate-400 dark:text-slate-500"}`}
              />
              <button
                onClick={() => onRemove(row.id)}
                disabled={isBlankLast}
                aria-label={`Remove row ${index + 1}`}
                className="flex items-center justify-center text-slate-400 opacity-0 hover:text-red-500 focus:opacity-100 disabled:invisible group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
