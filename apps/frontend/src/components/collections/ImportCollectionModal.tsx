import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileJson, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { collectionsQueryKey } from "../../hooks/useCollections";
import { createCollection } from "../../api/collections";
import { countFolders, countRequests, importNodes } from "../../lib/importCollection";
import { parsePostmanCollection, type ImportNode } from "../../lib/parsePostmanCollection";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

interface ImportCollectionModalProps {
  onClose: () => void;
}

interface Parsed {
  fileName: string;
  collectionName: string;
  nodes: ImportNode[];
}

/** Imports a Postman Collection v2.x export (the standard way to move a folder of requests between API tools) from a local file, recreating its folders and requests here. */
export function ImportCollectionModal({ onClose }: ImportCollectionModalProps) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  async function handleFile(file: File) {
    const text = await file.text();
    const result = parsePostmanCollection(text);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setParsed({ fileName: file.name, collectionName: result.collectionName, nodes: result.nodes });
  }

  async function handleImport() {
    if (!parsed) return;
    setIsImporting(true);
    try {
      const root = await createCollection({ name: parsed.collectionName });
      await importNodes(parsed.nodes, root.id);
      await queryClient.invalidateQueries({ queryKey: collectionsQueryKey() });
      toast.success(`Imported "${parsed.collectionName}"`);
      onClose();
    } catch {
      toast.error("Import failed partway through — check Collections for what came through, then try again.");
    } finally {
      setIsImporting(false);
    }
  }

  const requestCount = parsed ? countRequests(parsed.nodes) : 0;
  const folderCount = parsed ? countFolders(parsed.nodes) : 0;

  return (
    <Modal
      open
      title="Import collection"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleImport} disabled={!parsed || isImporting}>
            {isImporting ? "Importing…" : "Import"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        {!parsed && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/5"
          >
            <UploadCloud size={22} className="text-slate-400" />
            <span className="font-medium text-slate-600 dark:text-slate-300">Choose a collection file…</span>
            <span className="text-xs text-slate-400">A Postman Collection v2.x export (.json)</span>
          </button>
        )}

        {parsed && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-white/5">
            <FileJson size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{parsed.collectionName}</p>
              <p className="text-xs text-slate-400">{parsed.fileName}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {requestCount} {requestCount === 1 ? "request" : "requests"}
                {folderCount > 0 ? ` across ${folderCount} ${folderCount === 1 ? "folder" : "folders"}` : ""}
              </p>
            </div>
            <button
              onClick={() => setParsed(null)}
              className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Choose another
            </button>
          </div>
        )}

        <p className="text-xs leading-relaxed text-slate-400">
          This creates a new top-level folder with the same name as the collection. Basic and Bearer auth are
          imported directly; other auth types and file attachments in form-data fields aren't carried over.
        </p>
      </div>
    </Modal>
  );
}
