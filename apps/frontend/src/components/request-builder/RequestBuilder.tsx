import { useEffect, useState } from "react";
import { SaveRequestModal } from "../collections/SaveRequestModal";
import { Tabs } from "../common/Tabs";
import { Button } from "../common/Button";
import { useRequestStore } from "../../store/useRequestStore";
import { AuthTab } from "./AuthTab";
import { ImportCurlModal } from "./ImportCurlModal";
import { MethodSelect } from "./MethodSelect";
import { KeyValueEditor } from "./KeyValueEditor";
import { BodyTab } from "./BodyTab";

type BuilderTab = "params" | "headers" | "auth" | "body";

function countActive(rows: { key: string; enabled: boolean }[]): number {
  return rows.filter((row) => row.enabled && row.key.trim() !== "").length;
}

interface RequestBuilderProps {
  onSend: () => void;
  isSending: boolean;
}

export function RequestBuilder({ onSend, isSending }: RequestBuilderProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("params");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const draft = useRequestStore((s) => s.draft);
  const setMethod = useRequestStore((s) => s.setMethod);
  const setUrl = useRequestStore((s) => s.setUrl);
  const updateRow = useRequestStore((s) => s.updateRow);
  const removeRow = useRequestStore((s) => s.removeRow);
  const setBodyMode = useRequestStore((s) => s.setBodyMode);
  const setJsonBody = useRequestStore((s) => s.setJsonBody);
  const setRawBody = useRequestStore((s) => s.setRawBody);

  // Cmd/Ctrl+Enter sends the request from anywhere in the builder.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSend();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onSend]);

  const tabs = [
    { id: "params", label: "Params", badge: countActive(draft.params) },
    { id: "headers", label: "Headers", badge: countActive(draft.headers) },
    { id: "auth", label: "Auth" },
    { id: "body", label: "Body" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-3">
        <MethodSelect value={draft.method} onChange={setMethod} />
        <input
          value={draft.url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/users"
          spellCheck={false}
          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        />
        <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
          Import
        </Button>
        <Button variant="secondary" onClick={() => setSaveModalOpen(true)} disabled={draft.url.trim() === ""}>
          Save
        </Button>
        <Button variant="primary" onClick={onSend} disabled={isSending || draft.url.trim() === ""}>
          {isSending ? "Sending…" : "Send"}
        </Button>
      </div>

      <Tabs
        tabs={tabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as BuilderTab)}
        aria-label="Request sections"
      />

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
      {importModalOpen && <ImportCurlModal onClose={() => setImportModalOpen(false)} />}
    </div>
  );
}
