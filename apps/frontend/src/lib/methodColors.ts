/** Shared HTTP-method → text-color mapping used anywhere a method badge is shown (method selector, history list, collections tree). */
export const METHOD_TEXT_COLOR: Record<string, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-amber-600 dark:text-amber-400",
  PUT: "text-blue-600 dark:text-blue-400",
  PATCH: "text-purple-600 dark:text-purple-400",
  DELETE: "text-red-600 dark:text-red-400",
  HEAD: "text-slate-500 dark:text-slate-400",
  OPTIONS: "text-slate-500 dark:text-slate-400",
};
