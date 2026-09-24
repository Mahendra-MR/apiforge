import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useEffectiveEnvironmentVariables } from "../../hooks/useEnvironments";
import { useCreateExample } from "../../hooks/useExamples";
import { useExecuteRequest } from "../../hooks/useExecuteRequest";
import { buildExecutePayload } from "../../lib/buildPayload";
import { exampleInputFromResponse, exampleToResponse } from "../../lib/examples";
import { HORIZONTAL_RESIZE_HANDLE, VERTICAL_RESIZE_HANDLE } from "../../lib/resizeHandleStyles";
import { payloadToCurl } from "../../lib/toCurl";
import { useRequestStore } from "../../store/useRequestStore";
import { CodeSnippetPanel } from "../request-builder/CodeSnippetPanel";
import { RequestBuilder } from "../request-builder/RequestBuilder";
import { ResponseViewer } from "../response-viewer/ResponseViewer";

export function Workspace() {
  const draft = useRequestStore((s) => s.draft);
  const response = useRequestStore((s) => s.response);
  const viewingExample = useRequestStore((s) => s.viewingExample);
  const setResponse = useRequestStore((s) => s.setResponse);
  const closeExample = useRequestStore((s) => s.closeExample);
  const variables = useEffectiveEnvironmentVariables(draft.collectionId);
  const { mutate, isPending, error, reset: resetExecution } = useExecuteRequest();
  const createExample = useCreateExample();
  const [codeOpen, setCodeOpen] = useState(false);

  const payload = useMemo(() => buildExecutePayload(draft, variables), [draft, variables]);

  // A failed send belongs to the request that made it; opening another one starts clean.
  useEffect(() => {
    resetExecution();
  }, [draft.id, resetExecution]);

  function handleSend() {
    if (draft.url.trim() === "") return;
    const sentFromDraftId = draft.id;
    closeExample();
    mutate(payload, {
      // Ignore a response that lands after the user already opened a different request.
      onSuccess: (result) => {
        if (useRequestStore.getState().draft.id === sentFromDraftId) setResponse(result);
      },
    });
  }

  function handleSaveExample() {
    if (!response || !draft.savedRequestId) return;
    createExample.mutate(
      { requestId: draft.savedRequestId, input: exampleInputFromResponse(response) },
      { onSuccess: (example) => toast.success(`Saved as example "${example.name}"`) },
    );
  }

  const shownResult = viewingExample ? exampleToResponse(viewingExample) : (response ?? undefined);

  return (
    <PanelGroup direction="horizontal" className="min-h-0 flex-1">
      <Panel id="request-and-response" order={1} minSize={45}>
        <PanelGroup direction="vertical" className="min-h-0">
          <Panel defaultSize={50} minSize={20} className="min-h-0 border-b border-slate-200 dark:border-white/[0.06]">
            <RequestBuilder
              onSend={handleSend}
              isSending={isPending}
              codeOpen={codeOpen}
              onToggleCode={() => setCodeOpen((open) => !open)}
            />
          </Panel>
          <PanelResizeHandle className={HORIZONTAL_RESIZE_HANDLE} />
          <Panel defaultSize={50} minSize={15} className="min-h-0 bg-white dark:bg-surface-dark">
            <ResponseViewer
              result={shownResult}
              isPending={isPending}
              error={viewingExample ? null : error}
              example={viewingExample}
              onCloseExample={closeExample}
              onSaveExample={draft.savedRequestId && response && !viewingExample ? handleSaveExample : undefined}
              isSavingExample={createExample.isPending}
            />
          </Panel>
        </PanelGroup>
      </Panel>
      {codeOpen && (
        <>
          <PanelResizeHandle className={VERTICAL_RESIZE_HANDLE} />
          <Panel id="code-snippet" order={2} defaultSize={28} minSize={18} maxSize={50} className="border-l border-slate-200 dark:border-white/[0.06]">
            <CodeSnippetPanel code={payloadToCurl(payload)} onClose={() => setCodeOpen(false)} />
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
