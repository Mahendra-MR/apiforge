import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestBuilder } from "../src/components/request-builder/RequestBuilder";
import { useRequestStore } from "../src/store/useRequestStore";
import { renderWithQueryClient } from "./testUtils";

// Cmd/Ctrl+S opens the Save flow, which mounts SaveRequestModal — it reads
// the collections tree to populate the folder picker, so it needs both a
// QueryClientProvider (renderWithQueryClient) and this mock.
const fetchCollectionsMock = vi.fn();
vi.mock("../src/api/collections", () => ({
  fetchCollections: (...args: unknown[]) => fetchCollectionsMock(...args),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  saveRequestToCollection: vi.fn(),
}));

describe("RequestBuilder", () => {
  beforeEach(() => {
    useRequestStore.getState().reset();
    fetchCollectionsMock.mockResolvedValue({ collections: [], requests: [] });
  });

  it("renders the URL input and method select", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);
    expect(screen.getByPlaceholderText(/api.example.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/http method/i)).toBeInTheDocument();
  });

  it("disables Send while the URL is empty, enables it once typed", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/api.example.com/i), {
      target: { value: "https://api.example.com/users" },
    });

    expect(sendButton).not.toBeDisabled();
  });

  it("calls onSend when the Send button is clicked", () => {
    const onSend = vi.fn();
    renderWithQueryClient(<RequestBuilder onSend={onSend} isSending={false} />);
    fireEvent.change(screen.getByPlaceholderText(/api.example.com/i), {
      target: { value: "https://api.example.com/users" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("shows 'Sending…' and disables Send while a request is in flight", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending />);
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
  });

  it("switches between Params, Headers, and Body tabs", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);

    expect(screen.getByPlaceholderText("Key")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /headers/i }));
    expect(screen.getByPlaceholderText("Key")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^body$/i }));
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText(/does not have a body/i)).toBeInTheDocument();
  });

  it("sends Cmd/Ctrl+Enter as a keyboard shortcut to send the request", () => {
    const onSend = vi.fn();
    renderWithQueryClient(<RequestBuilder onSend={onSend} isSending={false} />);
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("opens the Save flow with Cmd/Ctrl+S once a URL is entered", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(screen.queryByRole("heading", { name: /save request/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/api.example.com/i), {
      target: { value: "https://api.example.com/users" },
    });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    expect(screen.getByRole("heading", { name: /save request/i })).toBeInTheDocument();
  });

  it("labels the cURL import button distinctly from the Collections panel's whole-collection import", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);
    expect(screen.getByRole("button", { name: /import cURL/i })).toBeInTheDocument();
  });

  it("imports a curl command pasted directly into the URL bar", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);
    const urlInput = screen.getByPlaceholderText(/api.example.com/i);

    fireEvent.paste(urlInput, {
      clipboardData: {
        getData: () =>
          `curl --request POST 'https://api.example.com/users' --header 'Authorization: Bearer abc123' --data '{"name":"John"}'`,
      },
    });

    const draft = useRequestStore.getState().draft;
    expect(draft.method).toBe("POST");
    expect(draft.url).toBe("https://api.example.com/users");
    expect(draft.authType).toBe("bearer");
    expect(draft.auth.bearer.token).toBe("abc123");
  });

  it("leaves a plain URL paste alone instead of running it through the curl parser", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);
    const urlInput = screen.getByPlaceholderText(/api.example.com/i);

    fireEvent.paste(urlInput, {
      clipboardData: { getData: () => "https://api.example.com/users" },
    });

    expect(useRequestStore.getState().draft.url).toBe("");
  });
});
