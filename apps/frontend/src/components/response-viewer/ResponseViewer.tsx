import { useState } from "react";
import { ApiClientError } from "../../api/client";
import { formatBytes, formatDuration } from "../../lib/format";
import type { ExecuteRequestResponse } from "../../types";
import { Badge, statusToneForCode } from "../common/Badge";
import { CopyButton } from "../common/CopyButton";
import { EmptyState } from "../common/EmptyState";
import { Tabs } from "../common/Tabs";
import { CookiesTab } from "./CookiesTab";
import { HeadersTable } from "./HeadersTable";
import { ResponseCodeView } from "./ResponseCodeView";

type ResponseTab = "body" | "headers" | "cookies" | "raw";
type BodyView = "pretty" | "raw";

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

  const prettyBody = result.bodyJson !== null ? JSON.stringify(result.bodyJson, null, 2) : result.body;
  const bodyText = bodyView === "pretty" ? prettyBody : result.body;

  const tabs = [
    { id: "body", label: "Response" },
    { id: "headers", label: "Headers", badge: Object.keys(result.headers).length },
    { id: "cookies", label: "Cookies" },
    { id: "raw", label: "Raw" },
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
            {result.bodyJson !== null && (
              <div className="flex justify-end gap-1 px-2 pt-1">
                <button
                  onClick={() => setBodyView("pretty")}
                  className={`rounded px-2 py-0.5 text-xs ${bodyView === "pretty" ? "bg-slate-200 dark:bg-slate-700" : "text-slate-400"}`}
                >
                  Pretty
                </button>
                <button
                  onClick={() => setBodyView("raw")}
                  className={`rounded px-2 py-0.5 text-xs ${bodyView === "raw" ? "bg-slate-200 dark:bg-slate-700" : "text-slate-400"}`}
                >
                  Raw
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ResponseCodeView value={bodyText} language={result.bodyJson !== null ? "json" : "text"} />
            </div>
          </div>
        )}
        {activeTab === "headers" && <HeadersTable headers={result.headers} />}
        {activeTab === "cookies" && <CookiesTab headers={result.headers} />}
        {activeTab === "raw" && <ResponseCodeView value={result.body} language="text" />}
      </div>
    </div>
  );
}
