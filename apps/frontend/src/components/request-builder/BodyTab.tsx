import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import clsx from "clsx";
import { useThemeStore } from "../../store/useThemeStore";
import type { BodyMode, RequestDraft } from "../../types";
import { KeyValueEditor } from "./KeyValueEditor";

const BODY_MODES: { id: BodyMode; label: string }[] = [
  { id: "none", label: "None" },
  { id: "json", label: "JSON" },
  { id: "raw", label: "Raw" },
  { id: "form-data", label: "Form Data" },
];

interface BodyTabProps {
  draft: RequestDraft;
  onBodyModeChange: (mode: BodyMode) => void;
  onJsonBodyChange: (value: string) => void;
  onRawBodyChange: (value: string) => void;
  onFormRowUpdate: (id: string, patch: Partial<{ key: string; value: string; enabled: boolean }>) => void;
  onFormRowRemove: (id: string) => void;
}

export function BodyTab({
  draft,
  onBodyModeChange,
  onJsonBodyChange,
  onRawBodyChange,
  onFormRowUpdate,
  onFormRowRemove,
}: BodyTabProps) {
  const theme = useThemeStore((s) => s.theme);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        {BODY_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onBodyModeChange(mode.id)}
            className={clsx(
              "rounded px-2.5 py-1 text-xs font-medium",
              draft.bodyMode === mode.id
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {draft.bodyMode === "none" && (
        <p className="p-4 text-sm text-slate-400">This request does not have a body.</p>
      )}

      {draft.bodyMode === "json" && (
        <CodeMirror
          value={draft.jsonBody}
          height="240px"
          extensions={[json()]}
          theme={theme}
          onChange={onJsonBodyChange}
          placeholder={'{\n  "name": "John",\n  "email": "john@example.com"\n}'}
          basicSetup={{ foldGutter: true, lineNumbers: true }}
        />
      )}

      {draft.bodyMode === "raw" && (
        <textarea
          value={draft.rawBody}
          onChange={(e) => onRawBodyChange(e.target.value)}
          placeholder="Raw request body"
          spellCheck={false}
          className="h-60 w-full resize-none border-0 bg-transparent p-3 font-mono text-sm text-slate-800 focus:outline-none dark:text-slate-100"
        />
      )}

      {draft.bodyMode === "form-data" && (
        <KeyValueEditor
          rows={draft.formData}
          onUpdate={onFormRowUpdate}
          onRemove={onFormRowRemove}
          keyPlaceholder="Field"
          valuePlaceholder="Value"
        />
      )}
    </div>
  );
}
