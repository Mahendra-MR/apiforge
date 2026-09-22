import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResponseViewer } from "../src/components/response-viewer/ResponseViewer";
import { ApiClientError } from "../src/api/client";
import type { ExecuteRequestResponse } from "../src/types";

// CodeMirror needs real browser layout/selection APIs jsdom doesn't provide.
// A minimal textarea stub keeps these tests focused on ResponseViewer's own
// logic (status/time/size, tabs, states) rather than the editor internals.
vi.mock("@uiw/react-codemirror", () => ({
  default: ({ value }: { value: string }) => <pre data-testid="codemirror-stub">{value}</pre>,
}));
vi.mock("@codemirror/search", () => ({ search: () => [], openSearchPanel: vi.fn() }));
vi.mock("@codemirror/lang-json", () => ({ json: () => [] }));

function makeResult(overrides: Partial<ExecuteRequestResponse> = {}): ExecuteRequestResponse {
  return {
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: '{"ok":true}',
    bodyJson: { ok: true },
    timeMs: 42,
    sizeBytes: 11,
    ...overrides,
  };
}

describe("ResponseViewer", () => {
  it("shows an empty state before any request has been sent", () => {
    render(<ResponseViewer result={undefined} isPending={false} error={undefined} />);
    expect(screen.getByText(/no response yet/i)).toBeInTheDocument();
  });

  it("shows a loading indicator while a request is pending", () => {
    render(<ResponseViewer result={undefined} isPending error={undefined} />);
    expect(screen.getByText(/sending request/i)).toBeInTheDocument();
  });

  it("shows the ApiClientError message when the request fails", () => {
    const error = new ApiClientError(502, { error: "UPSTREAM_ERROR", message: "Upstream host unreachable" });
    render(<ResponseViewer result={undefined} isPending={false} error={error} />);
    expect(screen.getByText(/upstream host unreachable/i)).toBeInTheDocument();
  });

  it("renders status, time, and size for a successful response", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    expect(screen.getByText(/200 OK/)).toBeInTheDocument();
    expect(screen.getByText(/42 ms/)).toBeInTheDocument();
    expect(screen.getByText(/11 B/)).toBeInTheDocument();
  });

  it("renders the response body via the code view", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    expect(screen.getByTestId("codemirror-stub")).toHaveTextContent('"ok": true');
  });

  it("switches to the Headers tab and lists response headers", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    fireEvent.click(screen.getByRole("tab", { name: /headers/i }));
    expect(screen.getByText("content-type")).toBeInTheDocument();
    expect(screen.getByText("application/json")).toBeInTheDocument();
  });

  it("shows an empty state on the Cookies tab when no cookies were set", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    fireEvent.click(screen.getByRole("tab", { name: /cookies/i }));
    expect(screen.getByText(/no cookies/i)).toBeInTheDocument();
  });
});
