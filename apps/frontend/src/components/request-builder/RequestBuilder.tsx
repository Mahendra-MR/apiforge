import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { Code2 } from "lucide-react";
import { useAutosaveRequest } from "../../hooks/useAutosaveRequest";
import { parseCurlCommand } from "../../lib/parseCurl";
import { useRequestStore } from "../../store/useRequestStore";
import { SaveRequestModal } from "../collections/SaveRequestModal";
import { Button } from "../common/Button";
import { Tabs } from "../common/Tabs";
import { AuthTab } from "./AuthTab";
import { BodyTab } from "./BodyTab";
import { KeyValueEditor } from "./KeyValueEditor";
import { MethodSelect } from "./MethodSelect";
import { RequestHeader } from "./RequestHeader";

type BuilderTab = "params" | "headers" | "auth" | "body";

function countActive(rows: { key: string; enabled: boolean }[]): number {
  return rows.filter((row) => row.enabled && row.key.trim() !== "").length;
}

interface RequestBuilderProps {
  onSend: () => void;
  isSending: boolean;
  codeOpen?: boolean;
  onToggleCode?: () => void;
}

export function RequestBuilder({ onSend, isSending, codeOpen = false, onToggleCode }: RequestBuilderProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("params");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const draft = useRequestStore((s) => s.draft);
  const setMethod = useRequestStore((s) => s.setMethod);
  const setUrl = useRequestStore((s) => s.setUrl);
  const loadFromCurl = useRequestStore((s) => s.loadFromCurl);
  const updateRow = useRequestStore((s) => s.updateRow);
  const removeRow = useRequestStore((s) => s.removeRow);
  const setBodyMode = useRequestStore((s) => s.setBodyMode);
  const setJsonBody = useRequestStore((s) => s.setJsonBody);
  const setRawBody = useRequestStore((s) => s.setRawBody);
  const autosaveStatus = useAutosaveRequest();
  const isSaved = draft.savedRequestId !== null;
  const canSend = draft.url.trim() !== "" && !isSending;

  // Requests in a collection save themselves; Cmd/Ctrl+S only matters for an
  // unsaved draft, where it opens the "save into a collection" dialog.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onSend();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!isSaved) setSaveModalOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onSend, isSaved]);

  // A freshly added (blank) request lands with the cursor in the URL bar, ready to type or paste a curl.
  useEffect(() => {
    if (draft.url === "") urlInputRef.current?.focus();
    // Only when a different request is opened, not on every keystroke.
  }, [draft.id]);

  // Pasting a full curl command (from a terminal, a browser's "Copy as cURL",
  // or this app's own code snippet) into the URL bar imports it, like Postman.
  function handleUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (!/^\s*curl\s/i.test(pasted)) return; // not a curl command — let the normal paste happen
    e.preventDefault();
    const result = parseCurlCommand(pasted);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    loadFromCurl(result.result);
    toast.success("Imported from cURL");
  }

  const tabs = [
    { id: "params", label: "Params", badge: countActive(draft.params) },
    { id: "headers", label: "Headers", badge: countActive(draft.headers) },
    { id: "auth", label: "Auth" },
    { id: "body", label: "Body" },
  ];

  return (
    <div className="flex h-full flex-col bg-white dark:bg-surface-dark">
      <RequestHeader status={autosaveStatus} onSaveDraft={() => setSaveModalOpen(true)} />

      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="flex min-w-0 flex-1 rounded-lg border border-slate-200 bg-white shadow-subtle focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15 dark:border-white/10 dark:bg-white/[0.03]">
          <MethodSelect value={draft.method} onChange={setMethod} />
          <div className="my-2 w-px bg-slate-200 dark:bg-white/10" />
          <input
            ref={urlInputRef}
            value={draft.url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={handleUrlPaste}
            placeholder="Enter URL or paste a cURL command — e.g. https://api.example.com/users"
            aria-label="Request URL"
            spellCheck={false}
            className="h-9 min-w-0 flex-1 rounded-r-lg bg-transparent px-3 font-mono text-[13px] text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
        </div>
        <Button variant="primary" onClick={onSend} disabled={!canSend} className="w-[88px]">
          {isSending ? "Sending…" : "Send"}
        </Button>
        {onToggleCode && (
          <button
            onClick={onToggleCode}
            aria-label="Code snippet"
            aria-pressed={codeOpen}
            title="View as cURL"
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
              codeOpen
                ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:text-white",
            )}
          >
            <Code2 size={16} />
          </button>
        )}
      </div>

      <Tabs tabs={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as BuilderTab)} aria-label="Request sections" />

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === "params" && (
          <KeyValueEditor
            rows={draft.params}
            onUpdate={(id, patch) => updateRow("params", id, patch)}
            onRemove={(id) => removeRow("params", id)}
          />
        )}
        {activeTab === "headers" && (
          <KeyValueEditor
            rows={draft.headers}
            onUpdate={(id, patch) => updateRow("headers", id, patch)}
            onRemove={(id) => removeRow("headers", id)}
          />
        )}
        {activeTab === "auth" && <AuthTab />}
        {activeTab === "body" && (
          <BodyTab
            draft={draft}
            onBodyModeChange={setBodyMode}
            onJsonBodyChange={setJsonBody}
            onRawBodyChange={setRawBody}
            onFormRowUpdate={(id, patch) => updateRow("formData", id, patch)}
            onFormRowRemove={(id) => removeRow("formData", id)}
          />
        )}
      </div>

      {saveModalOpen && <SaveRequestModal onClose={() => setSaveModalOpen(false)} />}
    </div>
  );
}
