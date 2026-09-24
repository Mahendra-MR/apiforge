import { X } from "lucide-react";
import { CopyButton } from "../common/CopyButton";

interface CodeSnippetPanelProps {
  code: string;
  onClose: () => void;
}

/** Right-hand panel showing the current request as a ready-to-run cURL command (variables resolved, auth applied). */
export function CodeSnippetPanel({ code, onClose }: CodeSnippetPanelProps) {
  const lines = code.split("\n");

  return (
    <section aria-label="Code snippet" className="flex h-full flex-col bg-white dark:bg-surface-dark-subtle">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-100 px-3 dark:border-white/[0.04]">
        <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Code snippet</h2>
        <button
          onClick={onClose}
          aria-label="Close code snippet"
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
          cURL
        </span>
        <CopyButton value={code} label="Copy" />
      </div>
      <pre className="min-h-0 flex-1 overflow-auto scrollbar-thin px-3 pb-4 font-mono text-[12px] leading-[1.7]">
        <code>
          {lines.map((line, index) => (
            <div key={index} className="flex gap-3">
              <span className="w-5 shrink-0 select-none text-right text-slate-300 dark:text-slate-600">{index + 1}</span>
              <span className="whitespace-pre-wrap break-all text-slate-700 dark:text-slate-200">{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </section>
  );
}
