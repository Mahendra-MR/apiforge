import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResponseViewer } from "../src/components/response-viewer/ResponseViewer";
import { ApiClientError } from "../src/api/client";
import type { ExecuteRequestResponse, RequestExample } from "../src/types";

// CodeMirror needs real browser layout/selection APIs jsdom doesn't provide.
// A minimal textarea stub keeps these tests focused on ResponseViewer's own
// logic (status/time/size, tabs, states) rather than the editor internals.
vi.mock("@uiw/react-codemirror", () => ({
  default: ({ value }: { value: string }) => <pre data-testid="codemirror-stub">{value}</pre>,
  EditorView: { lineWrapping: [] },
}));
vi.mock("@codemirror/search", () => ({ search: () => [], openSearchPanel: vi.fn() }));
vi.mock("@codemirror/lang-json", () => ({ json: () => [] }));
vi.mock("@codemirror/lang-xml", () => ({ xml: () => [] }));
vi.mock("@codemirror/lang-html", () => ({ html: () => [] }));
vi.mock("@codemirror/lang-yaml", () => ({ yaml: () => [] }));
vi.mock("@codemirror/lang-javascript", () => ({ javascript: () => [] }));
vi.mock("@codemirror/lang-markdown", () => ({ markdown: () => [] }));

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

  it("defaults a JSON response to the pretty-printed JSON format", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    expect(screen.getByRole("button", { name: /body format: json/i })).toBeInTheDocument();
    expect(screen.getByTestId("codemirror-stub").textContent).toBe('{\n  "ok": true\n}');
  });

  it("switches the body format to Raw from the format menu", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /body format/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^raw$/i }));
    expect(screen.getByTestId("codemirror-stub").textContent).toBe('{"ok":true}');
    expect(screen.getByRole("button", { name: /body format: raw/i })).toBeInTheDocument();
  });

  it("offers every Postman format, and shows Hex and Base64 encodings of the body", () => {
    render(<ResponseViewer result={makeResult({ body: "hi", bodyJson: null, headers: {} })} isPending={false} error={undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /body format/i }));
    const names = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(names).toEqual(["JSON", "XML", "HTML", "YAML", "JavaScript", "Markdown", "Raw", "Hex", "Base64"]);

    fireEvent.click(screen.getByRole("menuitem", { name: /^hex$/i }));
    expect(screen.getByTestId("codemirror-stub")).toHaveTextContent("00000000 68 69");

    fireEvent.click(screen.getByRole("button", { name: /body format/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^base64$/i }));
    expect(screen.getByTestId("codemirror-stub").textContent).toBe("aGk=");
  });

  it("picks XML for an XML response by its Content-Type", () => {
    render(
      <ResponseViewer
        result={makeResult({ headers: { "Content-Type": "application/xml" }, body: "<a/>", bodyJson: null })}
        isPending={false}
        error={undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /body format: xml/i })).toBeInTheDocument();
  });

  it("lists the response tabs in Postman's order", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent?.replace(/\d+$/, ""));
    expect(tabs).toEqual(["Body", "Cookies", "Headers"]);
  });

  it("shows an HTML response in the Preview body view", () => {
    render(
      <ResponseViewer
        result={makeResult({
          headers: { "content-type": "text/html" },
          body: "<p>hello</p>",
          bodyJson: null,
        })}
        isPending={false}
        error={undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(screen.getByTitle("Response preview")).toBeInTheDocument();
  });

  it("says there's nothing to preview for a plain JSON response", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(screen.getByText(/no preview for this response/i)).toBeInTheDocument();
  });

  it("renders an array-of-objects body as a table in Visualize", () => {
    render(
      <ResponseViewer
        result={makeResult({ bodyJson: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] })}
        isPending={false}
        error={undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /visualize/i }));
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("says Visualize doesn't apply to a non-array JSON body", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /visualize/i }));
    expect(screen.getByText(/nothing to visualize/i)).toBeInTheDocument();
  });

  it("labels a saved example as not-sent and offers a way back", () => {
    const onCloseExample = vi.fn();
    render(
      <ResponseViewer
        result={makeResult()}
        isPending={false}
        error={null}
        example={{ id: "e1", name: "Happy path" } as RequestExample}
        onCloseExample={onCloseExample}
      />,
    );
    expect(screen.getByText(/saved response, not sent/i)).toBeInTheDocument();
    expect(screen.getByText("Happy path")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back to request/i }));
    expect(onCloseExample).toHaveBeenCalledOnce();
  });

  it("offers Save as example only when a handler is provided", () => {
    const onSaveExample = vi.fn();
    const { rerender } = render(<ResponseViewer result={makeResult()} isPending={false} error={null} />);
    expect(screen.queryByRole("button", { name: /save as example/i })).not.toBeInTheDocument();

    rerender(<ResponseViewer result={makeResult()} isPending={false} error={null} onSaveExample={onSaveExample} />);
    fireEvent.click(screen.getByRole("button", { name: /save as example/i }));
    expect(onSaveExample).toHaveBeenCalledOnce();
  });
});


describe("Preview / Visualize toggles", () => {
  it("clicking Preview again returns to the formatted body", () => {
    render(<ResponseViewer result={makeResult()} isPending={false} error={undefined} />);
    const preview = screen.getByRole("button", { name: /preview/i });
    fireEvent.click(preview);
    expect(preview).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(preview);
    expect(screen.getByTestId("codemirror-stub")).toBeInTheDocument();
  });
});
