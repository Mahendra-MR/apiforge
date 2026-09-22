import type { KeyValueRow } from "../../types";

interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onUpdate: (id: string, patch: Partial<KeyValueRow>) => void;
  onRemove: (id: string) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

/** Reusable key/value table used for query params, headers, and form-data rows. */
export function KeyValueEditor({
  rows,
  onUpdate,
  onRemove,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueEditorProps) {
  return (
    <div className="flex flex-col gap-1 p-3">
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        return (
          <div key={row.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(e) => onUpdate(row.id, { enabled: e.target.checked })}
              aria-label={`Enable row ${index + 1}`}
              className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
            />
            <input
              value={row.key}
              onChange={(e) => onUpdate(row.id, { key: e.target.value })}
              placeholder={keyPlaceholder}
              className="w-1/3 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              value={row.value}
              onChange={(e) => onUpdate(row.id, { value: e.target.value })}
              placeholder={valuePlaceholder}
              className="flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              onClick={() => onRemove(row.id)}
              disabled={isLast && row.key === "" && row.value === ""}
              aria-label={`Remove row ${index + 1}`}
              className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:invisible dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
