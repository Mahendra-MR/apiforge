import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Check, ChevronRight, Loader2 } from "lucide-react";
import { useCollectionsTree } from "../../hooks/useCollections";
import type { AutosaveStatus } from "../../hooks/useAutosaveRequest";
import { folderPath } from "../../lib/collectionsTree";
import { useRequestStore } from "../../store/useRequestStore";
import { RenameInput } from "../collections/TreeRow";

interface RequestHeaderProps {
  status: AutosaveStatus;
  onSaveDraft: () => void;
}

/** Breadcrumb (folder path / request name, click the name to rename) plus the autosave status. */
export function RequestHeader({ status, onSaveDraft }: RequestHeaderProps) {
  const draft = useRequestStore((s) => s.draft);
  const setName = useRequestStore((s) => s.setName);
  const { data } = useCollectionsTree();
  const [renaming, setRenaming] = useState(false);
  const path = folderPath(data?.collections ?? [], draft.collectionId);

  return (
    <div className="flex h-10 items-center gap-3 px-4">
      <nav aria-label="Request location" className="flex min-w-0 flex-1 items-center gap-1 text-[13px]">
        {path.map((name, index) => (
          <span key={`${name}-${index}`} className="flex shrink-0 items-center gap-1 text-slate-400 dark:text-slate-500">
            <span className="max-w-[160px] truncate">{name}</span>
            <ChevronRight size={12} />
          </span>
        ))}
        {renaming ? (
          <RenameInput
            initial={draft.name}
            onCommit={(name) => { setName(name); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <button
            onClick={() => setRenaming(true)}
            title="Rename request"
            className="min-w-0 truncate rounded px-1 py-0.5 font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/[0.06]"
          >
            {draft.name}
          </button>
        )}
      </nav>
      <SaveStatus status={status} onSaveDraft={onSaveDraft} />
    </div>
  );
}

function SaveStatus({ status, onSaveDraft }: RequestHeaderProps) {
  const base = "flex shrink-0 items-center gap-1.5 text-xs";

  switch (status) {
    case "unsaved":
      return (
        <button
          onClick={onSaveDraft}
          title="Save this request into a collection (⌘/Ctrl+S)"
          className={clsx(base, "rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-slate-200")}
        >
          Not in a collection · <kbd className="font-sans">⌘S</kbd>
        </button>
      );
    case "saving":
      return (
        <span className={clsx(base, "text-slate-400")}>
          <Loader2 size={12} className="animate-spin" />
          Saving…
        </span>
      );
    case "invalid":
      return (
        <span className={clsx(base, "text-amber-600 dark:text-amber-400")}>
          <AlertTriangle size={12} />
          Fix the JSON body to save
        </span>
      );
    case "error":
      return (
        <span className={clsx(base, "text-red-600 dark:text-red-400")}>
          <AlertTriangle size={12} />
          Couldn't save
        </span>
      );
    case "saved":
    default:
      return (
        <span className={clsx(base, "text-slate-400 dark:text-slate-500")}>
          <Check size={12} />
          Saved
        </span>
      );
  }
}
