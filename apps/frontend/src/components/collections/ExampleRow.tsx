import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useDeleteExample, useRenameExample } from "../../hooks/useExamples";
import { useRequestStore } from "../../store/useRequestStore";
import type { RequestExample, SavedRequest } from "../../types";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { MenuDivider, MenuItem } from "../common/Popover";
import { TreeRow } from "./TreeRow";

interface ExampleRowProps {
  example: RequestExample;
  request: SavedRequest;
  depth: number;
}

/** A saved response under its request — opening it shows the stored response without re-sending. */
export function ExampleRow({ example, request, depth }: ExampleRowProps) {
  const isActive = useRequestStore((s) => s.viewingExample?.id === example.id);
  const openExample = useRequestStore((s) => s.openExample);
  const closeExample = useRequestStore((s) => s.closeExample);
  const renameExample = useRenameExample();
  const deleteExample = useDeleteExample();
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleDelete() {
    if (isActive) closeExample();
    deleteExample.mutate(example.id);
  }

  return (
    <>
      <TreeRow
        depth={depth}
        label={example.name}
        leading={
          <span className="rounded border border-slate-300 px-1 text-[9.5px] font-semibold leading-[14px] text-slate-500 dark:border-slate-600 dark:text-slate-400">
            e.g.
          </span>
        }
        active={isActive}
        onOpen={() => openExample(request, example)}
        renaming={renaming}
        onRename={(name) => {
          renameExample.mutate({ id: example.id, name });
          setRenaming(false);
        }}
        onCancelRename={() => setRenaming(false)}
        menuLabel={`More actions for example ${example.name}`}
        menu={(close) => (
          <>
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
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete example?"
        message={`The saved response "${example.name}" will be removed. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
