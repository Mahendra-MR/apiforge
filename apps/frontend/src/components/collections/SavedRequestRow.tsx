import { useState } from "react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { BookmarkPlus, Copy, Pencil, Trash2 } from "lucide-react";
import { useSaveRequestToCollection } from "../../hooks/useCollections";
import { useCreateExample } from "../../hooks/useExamples";
import { useDeleteSavedRequest, useUpdateSavedRequest } from "../../hooks/useSavedRequests";
import { savedRequestToInput } from "../../lib/buildSaveRequestInput";
import { exampleInputFromResponse } from "../../lib/examples";
import { METHOD_TEXT_COLOR } from "../../lib/methodColors";
import { useRequestStore } from "../../store/useRequestStore";
import type { RequestExample, SavedRequest } from "../../types";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { MenuDivider, MenuItem } from "../common/Popover";
import { ExampleRow } from "./ExampleRow";
import { TreeRow } from "./TreeRow";

interface SavedRequestRowProps {
  request: SavedRequest;
  examples: RequestExample[];
  depth: number;
}

/** Short labels so long methods don't push the request name around, matching Postman's tree. */
const METHOD_LABEL: Record<string, string> = { DELETE: "DEL", OPTIONS: "OPT", PATCH: "PATCH" };

export function SavedRequestRow({ request, examples, depth }: SavedRequestRowProps) {
  const isOpen = useRequestStore((s) => s.draft.savedRequestId === request.id);
  const isActive = useRequestStore((s) => s.draft.savedRequestId === request.id && s.viewingExample === null);
  const liveResponse = useRequestStore((s) => (s.draft.savedRequestId === request.id ? s.response : null));
  const loadFromSavedRequest = useRequestStore((s) => s.loadFromSavedRequest);
  const setName = useRequestStore((s) => s.setName);
  const reset = useRequestStore((s) => s.reset);

  const updateSavedRequest = useUpdateSavedRequest();
  const deleteSavedRequest = useDeleteSavedRequest();
  const saveToCollection = useSaveRequestToCollection();
  const createExample = useCreateExample();

  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleRename(name: string) {
    setRenaming(false);
    updateSavedRequest.mutate({ id: request.id, input: { name } });
    // Keep the open builder in step, or its next autosave would write the old name back.
    if (isOpen) setName(name);
  }

  function handleDuplicate() {
    if (!request.collectionId) return;
    saveToCollection.mutate(
      { collectionId: request.collectionId, input: savedRequestToInput(request, `${request.name} Copy`) },
      { onSuccess: (copy) => { loadFromSavedRequest(copy); toast.success("Request duplicated"); } },
    );
  }

  function handleAddExample() {
    if (!liveResponse) return;
    createExample.mutate(
      { requestId: request.id, input: exampleInputFromResponse(liveResponse) },
      { onSuccess: () => { setExpanded(true); toast.success("Response saved as an example"); } },
    );
  }

  function handleDelete() {
    deleteSavedRequest.mutate(request.id);
    if (isOpen) reset();
  }

  return (
    <>
      <TreeRow
        depth={depth}
        label={request.name}
        leading={
          <span
            className={clsx(
              "w-[34px] text-right font-mono text-[10px] font-bold tracking-tight",
              METHOD_TEXT_COLOR[request.method] ?? "text-slate-500",
            )}
          >
            {METHOD_LABEL[request.method] ?? request.method}
          </span>
        }
        expanded={examples.length > 0 ? expanded : undefined}
        onToggle={examples.length > 0 ? () => setExpanded((e) => !e) : undefined}
        onOpen={() => loadFromSavedRequest(request)}
        active={isActive}
        renaming={renaming}
        onRename={handleRename}
        onCancelRename={() => setRenaming(false)}
        menuLabel={`More actions for request ${request.name}`}
        menu={(close) => (
          <>
            <MenuItem
              icon={<BookmarkPlus size={13} />}
              disabled={!liveResponse}
              hint={liveResponse ? undefined : "Send it first"}
              onClick={() => { handleAddExample(); close(); }}
            >
              Add example
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<Pencil size={13} />} onClick={() => { setRenaming(true); close(); }}>
              Rename
            </MenuItem>
            <MenuItem icon={<Copy size={13} />} onClick={() => { handleDuplicate(); close(); }}>
              Duplicate
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<Trash2 size={13} />} danger onClick={() => { setConfirmingDelete(true); close(); }}>
              Delete
            </MenuItem>
          </>
        )}
      />
      {expanded && examples.map((example) => (
        <ExampleRow key={example.id} example={example} request={request} depth={depth + 1} />
      ))}
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete request?"
        message={`"${request.name}" and its saved examples will be removed from this folder. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
