import { parseSetCookieHeader } from "../../lib/parseCookies";
import { EmptyState } from "../common/EmptyState";

export function CookiesTab({ headers }: { headers: Record<string, string> }) {
  const setCookie = headers["set-cookie"] ?? headers["Set-Cookie"];
  const cookies = parseSetCookieHeader(setCookie);

  if (cookies.length === 0) {
    return <EmptyState title="No cookies" description="This response didn't set any cookies." />;
  }

  return (
    <div className="flex flex-col gap-2 overflow-auto p-3">
      {cookies.map((cookie, index) => (
        <div
          key={`${cookie.name}-${index}`}
          className="rounded-md border border-slate-200 p-2.5 text-sm dark:border-slate-800"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{cookie.name}</span>
            <span className="break-all font-mono text-xs text-slate-500 dark:text-slate-400">{cookie.value}</span>
          </div>
          {cookie.attributes.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">{cookie.attributes.join(" · ")}</p>
          )}
        </div>
      ))}
    </div>
  );
}
