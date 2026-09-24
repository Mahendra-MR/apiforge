import { Download } from "lucide-react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { CopyButton } from "../common/CopyButton";
import { exportCollectionToPostman } from "../../lib/exportPostmanCollection";
import type { CollectionTreeNode } from "../../lib/collectionsTree";

interface ShareCollectionModalProps {
  node: CollectionTreeNode;
  onClose: () => void;
}

function fileNameFor(folderName: string): string {
  const slug = folderName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "collection"}.postman_collection.json`;
}

/** Sharing a folder here means exporting just that folder's subtree as a Postman-compatible JSON file — there's no account or cloud link to share through yet, so "share" is "hand someone a file they (or this app's own Import) can open", the same format the Collections panel's Import button already reads. */
export function ShareCollectionModal({ node, onClose }: ShareCollectionModalProps) {
  const json = JSON.stringify(exportCollectionToPostman(node), null, 2);

  function handleDownload() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFor(node.collection.name);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open title={`Share "${node.collection.name}"`} onClose={onClose} size="lg">
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Exports just this folder — not your whole workspace — as a Postman collection file. Send it to anyone; they
          can open it in Postman, or import it back into APIForge with the Import button in the Collections
          panel.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Basic, Bearer, and API key auth carry over. OAuth2 tokens don't (they'd already be expired by the time
          anyone opened the file), so those requests export as unauthenticated.
        </p>
        <textarea
          readOnly
          value={json}
          rows={10}
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        />
        <div className="flex justify-end gap-2">
          <CopyButton value={json} label="Copy JSON" />
          <Button variant="primary" onClick={handleDownload}>
            <Download size={14} />
            Download
          </Button>
        </div>
      </div>
    </Modal>
  );
}
