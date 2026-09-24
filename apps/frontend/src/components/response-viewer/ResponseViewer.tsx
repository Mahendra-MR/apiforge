import clsx from "clsx";
import { useState } from "react";
import { ArrowLeft, BookmarkPlus, ChartColumn, Eye } from "lucide-react";
import { ApiClientError } from "../../api/client";
import { formatBytes, formatDuration } from "../../lib/format";
import { canVisualize, getContentType } from "../../lib/responseContentType";
import { defaultFormatFor, formatBody, type ResponseFormat } from "../../lib/responseFormat";
import type { ExecuteRequestResponse, RequestExample } from "../../types";
import { Badge, statusToneForCode } from "../common/Badge";
import { Button } from "../common/Button";
import { CopyButton } from "../common/CopyButton";
import { EmptyState } from "../common/EmptyState";
import { Tabs } from "../common/Tabs";
import { BodyFormatMenu } from "./BodyFormatMenu";
import { CookiesTab } from "./CookiesTab";
import { HeadersTable } from "./HeadersTable";
import { PreviewPane } from "./PreviewPane";
import { ResponseCodeView } from "./ResponseCodeView";
import { VisualizeTable } from "./VisualizeTable";

type ResponseTab = "body" | "headers" | "cookies";
/** "code" shows the body in the chosen format; Preview and Visualize are toggles on top of it, like Postman. */
type BodyView = "code" | "preview" | "visualize";

const VIEW_TOGGLE_CLASSES = {
  on: "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white",
  off: "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200",
};

interface ResponseViewerProps {
  result: ExecuteRequestResponse | undefined;
  isPending: boolean;
  error: unknown;
  /** Set when `result` is a saved example rather than a live response. */
  example?: RequestExample | null;
  onCloseExample?: () => void;
  /** Offered only for a live response to a request saved in a collection. */
  onSaveExample?: () => void;
  isSavingExample?: boolean;
}

export function ResponseViewer({
  result,
  isPending,
  error,
  example,
  onCloseExample,
  onSaveExample,
  isSavingExample,
}: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [bodyView, setBodyView] = useState<BodyView>("code");
  // A picked format applies to the response it was picked for; a new response starts from its own Content-Type.
  const [formatChoice, setFormatChoice] = useState<{ for: ExecuteRequestResponse; format: ResponseFormat } | null>(null);

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
          Sending request…
        </div>
      </div>
    );
  }

  if (error) {
    const message = error instanceof ApiClientError ? error.message : "Something went wrong sending this request.";
    return (
      <EmptyState
        title="Request failed"
        description={message}
      />
    );
  }

  if (!result) {
    return (
      <EmptyState
        title="No response yet"
        description="Enter a URL (or paste a cURL command) and hit Send — or ⌘/Ctrl+Enter — to see the response here."
      />
    );
  }

  const contentType = getContentType(result.headers);
  const format = formatChoice?.for === result ? formatChoice.format : defaultFormatFor(contentType, result.bodyJson);

  const tabs = [
    { id: "body", label: "Body" },
    { id: "cookies", label: "Cookies" },
    { id: "headers", label: "Headers", badge: Object.keys(result.headers).length },
  ];

  function toggleView(view: Exclude<BodyView, "code">) {
    setBodyView((current) => (current === view ? "code" : view));
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-surface-dark">
      {example && (
        <div className="flex items-center gap-2 border-b border-brand-100 bg-brand-50/60 px-4 py-1.5 text-xs text-brand-800 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200">
          <span className="rounded border border-brand-300 px-1 text-[9.5px] font-semibold dark:border-brand-400/50">e.g.</span>
          <span className="min-w-0 truncate">
            Example <span className="font-semibold">{example.name}</span> — saved response, not sent
          </span>
          {onCloseExample && (
            <button
              onClick={onCloseExample}
              className="ml-auto flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium hover:bg-brand-100 dark:hover:bg-brand-500/20"
            >
              <ArrowLeft size={12} />
              Back to request
            </button>
          )}
        </div>
      )}
      <div className="flex h-10 items-center gap-3 border-b border-slate-100 px-4 dark:border-white/[0.04]">
        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Response</span>
        <Badge tone={statusToneForCode(result.status)}>
          {result.status} {result.statusText}
        </Badge>
        <span className="text-xs text-slate-400">{formatDuration(result.timeMs)}</span>
        <span className="text-xs text-slate-400">{formatBytes(result.sizeBytes)}</span>
        <div className="ml-auto flex items-center gap-1">
          {onSaveExample && (
            <Button variant="ghost" size="sm" onClick={onSaveExample} disabled={isSavingExample}>
              <BookmarkPlus size={13} />
              Save as example
            </Button>
          )}
          <CopyButton value={result.body} label="Copy" />
        </div>
      </div>

      <Tabs
        tabs={tabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as ResponseTab)}
        aria-label="Response sections"
      />

      <div className="min-h-0 flex-1">
        {activeTab === "body" && (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-1 px-3 py-1.5" aria-label="Body view">
              <BodyFormatMenu
                value={format}
                active={bodyView === "code"}
                onChange={(next) => {
                  setFormatChoice({ for: result, format: next });
                  setBodyView("code");
                }}
              />
              <button
                aria-pressed={bodyView === "preview"}
                onClick={() => toggleView("preview")}
                className={clsx("flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors", VIEW_TOGGLE_CLASSES[bodyView === "preview" ? "on" : "off"])}
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                aria-pressed={bodyView === "visualize"}
                onClick={() => toggleView("visualize")}
                className={clsx("flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors", VIEW_TOGGLE_CLASSES[bodyView === "visualize" ? "on" : "off"])}
              >
                <ChartColumn size={14} />
                Visualize
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {bodyView === "code" && <ResponseCodeView value={formatBody(format, result.body, result.bodyJson)} format={format} />}
              {bodyView === "preview" && <PreviewPane body={result.body} contentType={contentType} />}
              {bodyView === "visualize" && (
                canVisualize(result.bodyJson) ? (
                  <VisualizeTable rows={result.bodyJson} />
                ) : (
                  <EmptyState
                    title="Nothing to visualize"
                    description="Visualize works best with a JSON response that's an array of objects."
                  />
                )
              )}
            </div>
          </div>
        )}
        {activeTab === "headers" && <HeadersTable headers={result.headers} />}
        {activeTab === "cookies" && <CookiesTab headers={result.headers} />}
      </div>
    </div>
  );
}
