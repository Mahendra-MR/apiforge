import { EmptyState } from "../common/EmptyState";

export function HeadersTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return <EmptyState title="No headers" description="This response didn't include any headers." />;
  }

  return (
    <div className="overflow-auto p-3">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-400">
            <th className="w-1/3 pb-2 font-medium">Key</th>
            <th className="pb-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td className="py-1.5 pr-3 font-mono text-xs text-slate-500 dark:text-slate-400">{key}</td>
              <td className="break-all py-1.5 font-mono text-xs text-slate-700 dark:text-slate-200">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
