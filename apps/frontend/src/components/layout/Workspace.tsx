import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useEffectiveEnvironmentVariables } from "../../hooks/useEnvironments";
import { useExecuteRequest } from "../../hooks/useExecuteRequest";
import { buildExecutePayload } from "../../lib/buildPayload";
import { HORIZONTAL_RESIZE_HANDLE } from "../../lib/resizeHandleStyles";
import { useRequestStore } from "../../store/useRequestStore";
import { RequestBuilder } from "../request-builder/RequestBuilder";
import { ResponseViewer } from "../response-viewer/ResponseViewer";

export function Workspace() {
  const draft = useRequestStore((s) => s.draft);
  const variables = useEffectiveEnvironmentVariables(draft.collectionId);
  const { mutate, data, isPending, error } = useExecuteRequest();

  function handleSend() {
    mutate(buildExecutePayload(draft, variables));
  }

  return (
    <PanelGroup direction="vertical" className="min-h-0 flex-1">
      <Panel defaultSize={50} minSize={20} className="min-h-0 border-b border-slate-200 dark:border-slate-800">
        <RequestBuilder onSend={handleSend} isSending={isPending} />
      </Panel>
      <PanelResizeHandle className={HORIZONTAL_RESIZE_HANDLE} />
      <Panel defaultSize={50} minSize={20} className="min-h-0">
        <ResponseViewer result={data} isPending={isPending} error={error} />
      </Panel>
    </PanelGroup>
  );
}
