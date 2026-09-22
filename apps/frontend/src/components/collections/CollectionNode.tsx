import { useState } from "react";
import { useCreateCollection, useDeleteCollection, useUpdateCollection } from "../../hooks/useCollections";
import { useDeleteSavedRequest } from "../../hooks/useSavedRequests";
import type { CollectionTreeNode } from "../../lib/collectionsTree";
import { useRequestStore } from "../../store/useRequestStore";
import { SavedRequestRow } from "./SavedRequestRow";

interface CollectionNodeProps {
  node: CollectionTreeNode;
  depth: number;
}

/** One folder in the Collections tree: renders its own row plus its subfolders and saved requests recursively. */
export function CollectionNode({ node, depth }: CollectionNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [name, setName] = useState(node.collection.name);
  const [addingSubfolder, setAddingSubfolder] = useState(false);
  const [subfolderName, setSubfolderName] = useState("");

  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const createCollection = useCreateCollection();
  const deleteSavedRequest = useDeleteSavedRequest();
  const loadFromSavedRequest = useRequestStore((s) => s.loadFromSavedRequest);

  function commitRename() {
    if (name.trim() !== "" && name !== node.collection.name) {
      updateCollection.mutate({ id: node.collection.id, input: { name: name.trim() } });
    }
  }

  function handleAddSubfolder() {
    if (subfolderName.trim() === "") return;
    createCollection.mutate(
      { name: subfolderName.trim(), parentId: node.collection.id },
      { onSuccess: () => { setSubfolderName(""); setAddingSubfolder(false); setExpanded(true); } },
    );
  }

  const hasChildren = node.children.length > 0 || node.requests.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md py-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? `Collapse ${node.collection.name}` : `Expand ${node.collection.name}`}
          className="shrink-0 text-slate-400"
        >
          {hasChildren ? (expanded ? "▾" : "▸") : "·"}
        </button>
        <span className="shrink-0">📁</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:text-slate-200 dark:focus:bg-slate-900"
        />
        <button
          onClick={() => { setAddingSubfolder(true); setExpanded(true); }}
          aria-label={`Add subfolder to ${node.collection.name}`}
          title="Add subfolder"
          className="shrink-0 rounded p-1 text-slate-300 opacity-0 hover:text-emerald-600 group-hover:opacity-100 dark:text-slate-600"
        >
          +
        </button>
        <button
          onClick={() => deleteCollection.mutate(node.collection.id)}
          aria-label={`Delete folder ${node.collection.name}`}
          className="shrink-0 rounded p-1 text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100 dark:text-slate-600"
        >
          ✕
        </button>
      </div>

      {expanded && (
        <div>
          {node.children.map((child) => (
            <CollectionNode key={child.collection.id} node={child} depth={depth + 1} />
          ))}
          {node.requests.map((request) => (
            <SavedRequestRow
              key={request.id}
              request={request}
              depth={depth + 1}
              onOpen={() => loadFromSavedRequest(request)}
              onDelete={() => deleteSavedRequest.mutate(request.id)}
            />
          ))}
          {addingSubfolder && (
            <div className="flex items-center gap-2 py-1 pr-2" style={{ paddingLeft: `${(depth + 1) * 16 + 4}px` }}>
              <input
                autoFocus
                value={subfolderName}
                onChange={(e) => setSubfolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSubfolder()}
                onBlur={() => { if (subfolderName.trim() === "") setAddingSubfolder(false); }}
                placeholder="Folder name"
                className="min-w-0 flex-1 rounded border border-dashed border-slate-300 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
