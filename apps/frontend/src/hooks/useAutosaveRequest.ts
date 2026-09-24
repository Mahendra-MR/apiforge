import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiClientError } from "../api/client";
import type { CollectionsResponse } from "../api/collections";
import { updateSavedRequest } from "../api/requests";
import { buildSaveRequestInput } from "../lib/buildSaveRequestInput";
import { useRequestStore } from "../store/useRequestStore";
import type { SaveRequestInput } from "../types";
import { collectionsQueryKey } from "./useCollections";

export type AutosaveStatus = "unsaved" | "saved" | "saving" | "invalid" | "error";

export const AUTOSAVE_DELAY_MS = 600;

interface PendingSave {
  identity: string;
  savedRequestId: string;
  input: SaveRequestInput;
  snapshot: string;
}

/**
 * Keeps the open saved request in sync with the builder — there's no Save
 * button for requests that already live in a folder. Edits are debounced and
 * PATCHed in the background; the collections cache is patched in place
 * (instead of refetched) so typing doesn't make the sidebar reload.
 *
 * A request is compared against the snapshot it was opened with, so merely
 * opening one never writes to it, and an edit still waiting on the debounce
 * is flushed immediately if another request is opened. If the saved copy
 * disappears (deleted from the tree), the draft quietly becomes an unsaved
 * one instead of erroring on every keystroke.
 */
export function useAutosaveRequest(): AutosaveStatus {
  const draft = useRequestStore((s) => s.draft);
  const detachFromSavedRequest = useRequestStore((s) => s.detachFromSavedRequest);
  const queryClient = useQueryClient();
  const baseline = useRef<{ identity: string; snapshot: string } | null>(null);
  const pending = useRef<PendingSave | null>(null);
  const [status, setStatus] = useState<AutosaveStatus>(draft.savedRequestId ? "saved" : "unsaved");

  const savedRequestId = draft.savedRequestId;
  const identity = `${draft.id}:${savedRequestId ?? ""}`;
  const built = buildSaveRequestInput(draft, draft.name.trim() || "Untitled request");
  const snapshot = built.ok ? JSON.stringify(built.input) : null;

  const save = useCallback(
    async (job: PendingSave) => {
      if (pending.current === job) pending.current = null;
      const isCurrent = () => baseline.current?.identity === job.identity;
      try {
        const saved = await updateSavedRequest(job.savedRequestId, job.input);
        if (isCurrent() && baseline.current) baseline.current.snapshot = job.snapshot;
        queryClient.setQueryData<CollectionsResponse>(collectionsQueryKey(), (old) =>
          old ? { ...old, requests: old.requests.map((r) => (r.id === saved.id ? saved : r)) } : old,
        );
        if (isCurrent()) setStatus("saved");
      } catch (error) {
        if (!isCurrent()) return;
        if (error instanceof ApiClientError && error.status === 404) {
          detachFromSavedRequest();
          return;
        }
        setStatus("error");
      }
    },
    [queryClient, detachFromSavedRequest],
  );

  useEffect(() => {
    // Opening a different request while an edit is still debouncing: save it now rather than drop it.
    if (pending.current && pending.current.identity !== identity) void save(pending.current);

    if (!savedRequestId) {
      baseline.current = null;
      setStatus("unsaved");
      return;
    }
    if (baseline.current?.identity !== identity) {
      baseline.current = { identity, snapshot: snapshot ?? "" };
      setStatus("saved");
      return;
    }
    if (!built.ok || snapshot === null) {
      pending.current = null;
      setStatus("invalid");
      return;
    }
    if (snapshot === baseline.current.snapshot) {
      pending.current = null;
      setStatus("saved");
      return;
    }

    const job: PendingSave = { identity, savedRequestId, input: built.input, snapshot };
    pending.current = job;
    setStatus("saving");
    const timer = setTimeout(() => void save(job), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // `built` is derived from `snapshot`, so depending on the string keeps this from re-running every render.
  }, [identity, snapshot, savedRequestId, save]);

  // Flush on unmount too (e.g. the window closing mid-debounce in dev hot reloads).
  useEffect(() => () => {
    if (pending.current) void save(pending.current);
  }, [save]);

  return status;
}
