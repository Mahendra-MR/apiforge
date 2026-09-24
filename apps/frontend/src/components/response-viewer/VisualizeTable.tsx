import { EmptyState } from "../common/EmptyState";

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Auto-tables a JSON array of objects — the columns are every key seen across all rows (not just the first), so a row missing an occasional field doesn't silently drop that column. */
export function VisualizeTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Array.from(rows.reduce((keys, row) => { Object.keys(row).forEach((k) => keys.add(k)); return keys; }, new Set<string>()));

  if (columns.length === 0) {
    return <EmptyState title="Nothing to visualize" description="This array doesn't contain any object fields." />;
  }

  return (
    <div className="h-full overflow-auto p-3">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-white dark:bg-surface-dark">
          <tr className="text-xs uppercase text-slate-400">
            {columns.map((column) => (
              <th key={column} className="border-b border-slate-200 px-3 py-2 font-medium dark:border-slate-800">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-white/5">
              {columns.map((column) => (
                <td key={column} className="max-w-xs truncate px-3 py-1.5 font-mono text-xs text-slate-700 dark:text-slate-200">
                  {cellText(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
