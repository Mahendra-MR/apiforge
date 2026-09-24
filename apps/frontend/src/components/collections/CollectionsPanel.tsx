import { useState } from "react";
import { FolderPlus, Upload } from "lucide-react";
import { useCollectionsTree, useCreateCollection } from "../../hooks/useCollections";
import { buildCollectionsTree } from "../../lib/collectionsTree";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { CollectionNode } from "./CollectionNode";
import { ImportCollectionModal } from "./ImportCollectionModal";

export function CollectionsPanel() {
  const { data, isLoading } = useCollectionsTree();
  const createCollection = useCreateCollection();
  const [newFolderName, setNewFolderName] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const tree = buildCollectionsTree(data?.collections ?? [], data?.requests ?? []);

  function handleCreate() {
    if (newFolderName.trim() === "") return;
    createCollection.mutate({ name: newFolderName.trim() }, { onSuccess: () => setNewFolderName("") });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 p-2">
        <input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New folder name…"
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCreate}
          disabled={newFolderName.trim() === "" || createCollection.isPending}
          title="Create folder"
        >
          <FolderPlus size={13} />
          New
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)} title="Import a collection from your computer">
          <Upload size={13} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-1 pb-2">
        {isLoading && <p className="px-2 py-4 text-xs text-slate-400">Loading collections…</p>}

        {!isLoading && tree.length === 0 && (
          <EmptyState
            icon={<FolderPlus size={18} />}
            title="No collections yet"
            description="Create a folder above, import one from your computer, or use Save on a request to add it."
          />
        )}

        {tree.map((node) => (
          <CollectionNode key={node.collection.id} node={node} depth={0} />
        ))}
      </div>

      {importOpen && <ImportCollectionModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}
