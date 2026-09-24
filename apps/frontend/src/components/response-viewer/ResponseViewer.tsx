import clsx from "clsx";
import { useState } from "react";
import { ApiClientError } from "../../api/client";
import { formatBytes, formatDuration } from "../../lib/format";
import { canVisualize, getContentType } from "../../lib/responseContentType";
import type { ExecuteRequestResponse } from "../../types";
import { Badge, statusToneForCode } from "../common/Badge";
import { CopyButton } from "../common/CopyButton";
import { EmptyState } from "../common/EmptyState";
import { Tabs } from "../common/Tabs";
import { CookiesTab } from "./CookiesTab";
import { HeadersTable } from "./HeadersTable";
import { PreviewPane } from "./PreviewPane";
import { ResponseCodeView } from "./ResponseCodeView";
import { VisualizeTable } from "./VisualizeTable";

type ResponseTab = "body" | "headers" | "cookies";
type BodyView = "pretty" | "raw" | "preview" | "visualize";

const BODY_VIEWS: { id: BodyView; label: string }[] = [
  { id: "pretty", label: "Pretty" },
  { id: "raw", label: "Raw" },
  { id: "preview", label: "Preview" },
  { id: "visualize", label: "Visualize" },
];

interface ResponseViewerProps {
  result: ExecuteRequestResponse | undefined;
  isPending: boolean;
  error: unknown;
}

export function ResponseViewer({ result, isPending, error }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [bodyView, setBodyView] = useState<BodyView>("pretty");

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
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
        description="Configure a request above and hit Send (or ⌘/Ctrl+Enter) to see the response here."
      />
    );
  }

  const contentType = getContentType(result.headers);
  const prettyBody = result.bodyJson !== null ? JSON.stringify(result.bodyJson, null, 2) : result.body;

  const tabs = [
    { id: "body", label: "Body" },
    { id: "headers", label: "Headers", badge: Object.keys(result.headers).length },
    { id: "cookies", label: "Cookies" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <Badge tone={statusToneForCode(result.status)}>
          {result.status} {result.statusText}
        </Badge>
        <span className="text-xs text-slate-400">Time: {formatDuration(result.timeMs)}</span>
        <span className="text-xs text-slate-400">Size: {formatBytes(result.sizeBytes)}</span>
        <div className="ml-auto">
          <CopyButton value={result.body} label="Copy response" />
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
            <div className="flex gap-0.5 border-b border-slate-100 px-2 py-1.5 dark:border-slate-800" role="tablist" aria-label="Body view">
              {BODY_VIEWS.map((view) => (
                <button
                  key={view.id}
                  role="tab"
                  aria-selected={bodyView === view.id}
                  onClick={() => setBodyView(view.id)}
                  className={clsx(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    bodyView === view.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10",
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {bodyView === "pretty" && (
                <ResponseCodeView value={prettyBody} language={result.bodyJson !== null ? "json" : "text"} />
              )}
              {bodyView === "raw" && <ResponseCodeView value={result.body} language="text" />}
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
