import { useMemo, useState } from "react";
import { Download, FolderPlus, Plus, Search, X } from "lucide-react";
import { useCollectionsTree, useCreateCollection } from "../../hooks/useCollections";
import { buildCollectionsTree, filterCollectionsTree, groupExamplesByRequest } from "../../lib/collectionsTree";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { CollectionNode } from "./CollectionNode";
import { ImportCollectionModal } from "./ImportCollectionModal";
import { RenameInput } from "./TreeRow";

export function CollectionsPanel() {
  const { data, isLoading } = useCollectionsTree();
  const createCollection = useCreateCollection();
  const [addingFolder, setAddingFolder] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const tree = useMemo(() => buildCollectionsTree(data?.collections ?? [], data?.requests ?? []), [data]);
  const visibleTree = useMemo(() => filterCollectionsTree(tree, filter), [tree, filter]);
  const examplesByRequest = useMemo(() => groupExamplesByRequest(data?.examples ?? []), [data]);
  const isFiltering = filter.trim() !== "";

  function handleCreate(name: string) {
    setAddingFolder(false);
    createCollection.mutate({ name });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-2.5">
        <div className="relative min-w-0 flex-1">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setFilter("")}
            placeholder="Filter requests"
            aria-label="Filter collections"
            className="h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-6 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-100"
          />
          {isFiltering && (
            <button
              onClick={() => setFilter("")}
              aria-label="Clear filter"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => setAddingFolder(true)}
          title="New collection"
          aria-label="New collection"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
        >
          <Plus size={15} />
        </button>
        <button
          onClick={() => setImportOpen(true)}
          title="Import a collection from your computer"
          aria-label="Import a collection"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
        >
          <Download size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-1.5 pb-3">
        {addingFolder && (
          <div className="flex h-[30px] items-center gap-2 pl-[26px] pr-2">
            <FolderPlus size={14} strokeWidth={1.75} className="shrink-0 text-slate-400" />
            <RenameInput initial="" placeholder="Collection name" onCommit={handleCreate} onCancel={() => setAddingFolder(false)} />
          </div>
        )}

        {isLoading && <p className="px-3 py-4 text-xs text-slate-400">Loading collections…</p>}

        {!isLoading && tree.length === 0 && !addingFolder && (
          <EmptyState
            icon={<FolderPlus size={18} />}
            title="No collections yet"
            description="Collections group your requests into folders. Create one, or import a Postman collection."
            action={
              <Button size="sm" variant="secondary" onClick={() => setAddingFolder(true)}>
                <Plus size={13} />
                New collection
              </Button>
            }
          />
        )}

        {!isLoading && isFiltering && visibleTree.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-slate-400">No requests match "{filter.trim()}".</p>
        )}

        {visibleTree.map((node) => (
          <CollectionNode
            key={node.collection.id}
            node={node}
            depth={0}
            examplesByRequest={examplesByRequest}
            forceExpanded={isFiltering}
          />
        ))}
      </div>

      {importOpen && <ImportCollectionModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}
