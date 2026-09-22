import { useState } from "react";
import toast from "react-hot-toast";
import { useCreateCollection, useCollectionsTree, useSaveRequestToCollection } from "../../hooks/useCollections";
import { useUpdateSavedRequest } from "../../hooks/useSavedRequests";
import { buildSaveRequestInput } from "../../lib/buildSaveRequestInput";
import { buildCollectionsTree, flattenCollectionsForSelect } from "../../lib/collectionsTree";
import { useRequestStore } from "../../store/useRequestStore";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

const CREATE_NEW_FOLDER = "__new__";

interface SaveRequestModalProps {
  onClose: () => void;
}

/**
 * "Save" flow for the request builder. Creates a new saved request in a
 * chosen (or newly created) folder, or — when the draft already came from a
 * saved request — updates that request in place instead.
 */
export function SaveRequestModal({ onClose }: SaveRequestModalProps) {
  const draft = useRequestStore((s) => s.draft);
  const markSaved = useRequestStore((s) => s.markSaved);
  const { data } = useCollectionsTree();
  const options = flattenCollectionsForSelect(buildCollectionsTree(data?.collections ?? [], data?.requests ?? []));

  const [name, setName] = useState(draft.name);
  // Not `options[0]?.id` here: the collections list is still loading on
  // first render, so that would be undefined and lock in "Create new
  // folder" as the default even when folders already exist. Falling back to
  // the first option at render time instead keeps the default in sync once
  // the query resolves.
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(draft.collectionId);
  const collectionId = selectedCollectionId ?? options[0]?.id ?? CREATE_NEW_FOLDER;
  const [newFolderName, setNewFolderName] = useState("");

  const createCollection = useCreateCollection();
  const saveToCollection = useSaveRequestToCollection();
  const updateSavedRequest = useUpdateSavedRequest();

  const isUpdating = draft.savedRequestId !== null;
  const isPending = createCollection.isPending || saveToCollection.isPending || updateSavedRequest.isPending;

  async function handleSave() {
    if (name.trim() === "") return;

    const result = buildSaveRequestInput(draft, name.trim());
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (isUpdating && draft.savedRequestId) {
      updateSavedRequest.mutate(
        { id: draft.savedRequestId, input: result.input },
        {
          onSuccess: (saved) => {
            markSaved(saved.id, saved.collectionId);
            toast.success("Request updated");
            onClose();
          },
        },
      );
      return;
    }

    let targetCollectionId = collectionId;
    if (targetCollectionId === CREATE_NEW_FOLDER) {
      if (newFolderName.trim() === "") {
        toast.error("Enter a folder name");
        return;
      }
      try {
        const created = await createCollection.mutateAsync({ name: newFolderName.trim() });
        targetCollectionId = created.id;
      } catch {
        return; // useCreateCollection already toasts the failure
      }
    }

    saveToCollection.mutate(
      { collectionId: targetCollectionId, input: result.input },
      {
        onSuccess: (saved) => {
          markSaved(saved.id, saved.collectionId);
          toast.success("Request saved");
          onClose();
        },
      },
    );
  }

  return (
    <Modal
      open
      title={isUpdating ? "Update Request" : "Save Request"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isPending || name.trim() === ""}>
            {isUpdating ? "Update" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600 dark:text-slate-300">Request name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        {!isUpdating && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">Folder</span>
            <select
              value={collectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
              <option value={CREATE_NEW_FOLDER}>+ Create new folder…</option>
            </select>
          </label>
        )}

        {!isUpdating && collectionId === CREATE_NEW_FOLDER && (
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        )}

        {isUpdating && (
          <p className="text-xs text-slate-400">
            This updates the saved request in place. Use the Collections tree to move it to a different folder.
          </p>
        )}
      </div>
    </Modal>
  );
}
