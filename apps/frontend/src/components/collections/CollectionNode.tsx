import { useState } from "react";
import { Folder, FolderOpen, FolderPlus, Layers, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import {
  useCreateCollection,
  useDeleteCollection,
  useSaveRequestToCollection,
  useUpdateCollection,
} from "../../hooks/useCollections";
import { collectSubtreeIds, type CollectionTreeNode } from "../../lib/collectionsTree";
import { useRequestStore } from "../../store/useRequestStore";
import type { RequestExample } from "../../types";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { MenuDivider, MenuItem } from "../common/Popover";
import { EnvironmentManager } from "../environments/EnvironmentManager";
import { SavedRequestRow } from "./SavedRequestRow";
import { ShareCollectionModal } from "./ShareCollectionModal";
import { indentFor, RenameInput, TreeRow } from "./TreeRow";

interface CollectionNodeProps {
  node: CollectionTreeNode;
  depth: number;
  examplesByRequest: Map<string, RequestExample[]>;
  /** While the sidebar filter is active every folder is shown open, so matches are never hidden. */
  forceExpanded?: boolean;
}

const NO_EXAMPLES: RequestExample[] = [];

/** One folder in the Collections tree: its own row plus its subfolders and saved requests, recursively. */
export function CollectionNode({ node, depth, examplesByRequest, forceExpanded = false }: CollectionNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [addingSubfolder, setAddingSubfolder] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [managingEnvironment, setManagingEnvironment] = useState(false);
  // Per-folder environments are bound to a top-level folder's subtree, so
  // only root folders offer one.
  const isTopLevel = depth === 0;
  const isExpanded = expanded || forceExpanded;

  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const createCollection = useCreateCollection();
  const saveToCollection = useSaveRequestToCollection();
  const loadFromSavedRequest = useRequestStore((s) => s.loadFromSavedRequest);
  const openCollectionId = useRequestStore((s) => s.draft.collectionId);
  const reset = useRequestStore((s) => s.reset);

  function handleAddRequest() {
    setExpanded(true);
    saveToCollection.mutate(
      { collectionId: node.collection.id, input: { name: "New Request", method: "GET", url: "" } },
      { onSuccess: (created) => loadFromSavedRequest(created) },
    );
  }

  function handleAddSubfolder(name: string) {
    setAddingSubfolder(false);
    createCollection.mutate({ name, parentId: node.collection.id }, { onSuccess: () => setExpanded(true) });
  }

  function handleDelete() {
    // Deleting the folder that holds the open request would leave the builder autosaving into nothing.
    if (openCollectionId && collectSubtreeIds(node).includes(openCollectionId)) reset();
    deleteCollection.mutate(node.collection.id);
  }

  const FolderIcon = isExpanded ? FolderOpen : Folder;
  const isEmpty = node.children.length === 0 && node.requests.length === 0;

  return (
    <div>
      <TreeRow
        depth={depth}
        label={node.collection.name}
        labelClassName={isTopLevel ? "font-medium text-slate-800 dark:text-slate-100" : undefined}
        leading={<FolderIcon size={14} strokeWidth={1.75} className="text-slate-400 dark:text-slate-500" />}
        expanded={isExpanded}
        onToggle={() => setExpanded((e) => !e)}
        renaming={renaming}
        onRename={(name) => {
          setRenaming(false);
          updateCollection.mutate({ id: node.collection.id, input: { name } });
        }}
        onCancelRename={() => setRenaming(false)}
        menuLabel={`More options for ${node.collection.name}`}
        menu={(close) => (
          <>
            <MenuItem icon={<Plus size={13} />} onClick={() => { handleAddRequest(); close(); }}>
              Add request
            </MenuItem>
            <MenuItem icon={<FolderPlus size={13} />} onClick={() => { setAddingSubfolder(true); setExpanded(true); close(); }}>
              Add folder
            </MenuItem>
            <MenuDivider />
            {isTopLevel && (
              <MenuItem icon={<Layers size={13} />} onClick={() => { setManagingEnvironment(true); close(); }}>
                Environment
              </MenuItem>
            )}
            <MenuItem icon={<Share2 size={13} />} onClick={() => { setSharing(true); close(); }}>
              Share
            </MenuItem>
            <MenuItem icon={<Pencil size={13} />} onClick={() => { setRenaming(true); close(); }}>
              Rename
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<Trash2 size={13} />} danger onClick={() => { setConfirmingDelete(true); close(); }}>
              Delete
            </MenuItem>
          </>
        )}
      />

      {isExpanded && (
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 border-l border-slate-200/80 dark:border-white/[0.06]"
            style={{ left: indentFor(depth) + 8 }}
          />
          {addingSubfolder && (
            <div className="flex h-[30px] items-center gap-2 pr-2" style={{ paddingLeft: indentFor(depth + 1) + 20 }}>
              <Folder size={14} strokeWidth={1.75} className="shrink-0 text-slate-400" />
              <RenameInput
                initial=""
                placeholder="Folder name"
                onCommit={handleAddSubfolder}
                onCancel={() => setAddingSubfolder(false)}
              />
            </div>
          )}
          {node.children.map((child) => (
            <CollectionNode
              key={child.collection.id}
              node={child}
              depth={depth + 1}
              examplesByRequest={examplesByRequest}
              forceExpanded={forceExpanded}
            />
          ))}
          {node.requests.map((request) => (
            <SavedRequestRow
              key={request.id}
              request={request}
              examples={examplesByRequest.get(request.id) ?? NO_EXAMPLES}
              depth={depth + 1}
            />
          ))}
          {isEmpty && !addingSubfolder && (
            <p className="py-1.5 text-xs text-slate-400 dark:text-slate-500" style={{ paddingLeft: indentFor(depth + 1) + 20 }}>
              This folder is empty.{" "}
              <button onClick={handleAddRequest} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                Add a request
              </button>
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete folder?"
        message={`This deletes "${node.collection.name}" and everything inside it — subfolders, saved requests and their examples. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
      {sharing && <ShareCollectionModal node={node} onClose={() => setSharing(false)} />}
      {managingEnvironment && (
        <EnvironmentManager
          open
          onClose={() => setManagingEnvironment(false)}
          scope={{ collectionId: node.collection.id, collectionName: node.collection.name }}
        />
      )}
    </div>
  );
}
