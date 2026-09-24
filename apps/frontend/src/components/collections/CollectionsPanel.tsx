import { useState } from "react";
import { FolderPlus, Upload } from "lucide-react";
import { useCollectionsTree, useCreateCollection } from "../../hooks/useCollections";
import { buildCollectionsTree } from "../../lib/collectionsTree";
import { EmptyState } from "../common/EmptyState";
import { CollectionNode } from "./CollectionNode";
import { ImportCollectionModal } from "./ImportCollectionModal";

export function CollectionsPanel() {
  const { data, isLoading } = useCollectionsTree();
  const createCollection = useCreateCollection();
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const tree = buildCollectionsTree(data?.collections ?? [], data?.requests ?? []);

  function handleCreate() {
    if (newFolderName.trim() === "") {
      setAddingFolder(false);
      return;
    }
    createCollection.mutate(
      { name: newFolderName.trim() },
      { onSuccess: () => { setNewFolderName(""); setAddingFolder(false); } },
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-2 py-1.5 dark:border-slate-800">
        <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Collections</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setAddingFolder(true)}
            title="New folder"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-white/5 dark:hover:text-emerald-400"
          >
            <FolderPlus size={15} />
          </button>
          <button
            onClick={() => setImportOpen(true)}
            title="Import a collection from your computer"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200"
          >
            <Upload size={15} />
          </button>
        </div>
      </div>

      {addingFolder && (
        <div className="px-2 pt-1.5">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            onBlur={handleCreate}
            placeholder="Folder name"
            className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-1 py-1.5">
        {isLoading && <p className="px-2 py-4 text-xs text-slate-400">Loading collections…</p>}

        {!isLoading && tree.length === 0 && !addingFolder && (
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
