import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

/** Maps an HTTP status code to a semantic tone (2xx success, 4xx warning, 5xx danger). */
export function statusToneForCode(status: number): Tone {
  if (status >= 200 && status < 300) return "success";
  if (status >= 400 && status < 500) return "warning";
  if (status >= 500) return "danger";
  return "neutral";
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold", TONE_CLASSES[tone])}>
      {children}
    </span>
  );
}
