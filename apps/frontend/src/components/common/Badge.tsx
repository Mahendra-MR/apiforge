import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
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
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
