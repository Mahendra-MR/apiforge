import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestBuilder } from "../src/components/request-builder/RequestBuilder";
import { useRequestStore } from "../src/store/useRequestStore";
import type { SavedRequest } from "../src/types";
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

// Requests that live in a collection autosave through this.
const updateSavedRequestMock = vi.fn();
vi.mock("../src/api/requests", () => ({
  updateSavedRequest: (...args: unknown[]) => updateSavedRequestMock(...args),
}));

function savedRequest(overrides: Partial<SavedRequest> = {}): SavedRequest {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    collectionId: "c1",
    name: "Get users",
    method: "GET",
    url: "https://api.example.com/users",
    queryParams: null,
    pathParams: null,
    headers: null,
    authType: "none",
    authConfig: null,
    bodyType: "none",
    body: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("RequestBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("opens the save-to-collection dialog with Cmd/Ctrl+S for an unsaved draft", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(screen.getByRole("heading", { name: /save request/i })).toBeInTheDocument();
  });

  it("has no Save or Import cURL buttons — saved requests autosave and a pasted curl imports itself", () => {
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /import curl/i })).not.toBeInTheDocument();
  });

  it("autosaves edits to a request that lives in a collection, without a Save step", async () => {
    updateSavedRequestMock.mockImplementation(async (id: string, input: object) => ({ ...savedRequest(), ...input, id }));
    useRequestStore.getState().loadFromSavedRequest(savedRequest());
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(updateSavedRequestMock).not.toHaveBeenCalled(); // merely opening it never writes

    fireEvent.change(screen.getByLabelText(/request url/i), { target: { value: "https://api.example.com/users/42" } });
    expect(screen.getByText(/saving/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(updateSavedRequestMock).toHaveBeenCalledWith(
        "123e4567-e89b-12d3-a456-426614174000",
        expect.objectContaining({ name: "Get users", url: "https://api.example.com/users/42" }),
      ),
    );
    expect(await screen.findByText("Saved")).toBeInTheDocument();

    // Cmd/Ctrl+S has nothing left to do for a saved request.
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(screen.queryByRole("heading", { name: /save request/i })).not.toBeInTheDocument();
  });

  it("doesn't autosave while the JSON body is invalid, and says why", async () => {
    useRequestStore.getState().loadFromSavedRequest(savedRequest());
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);

    useRequestStore.getState().setBodyMode("json");
    useRequestStore.getState().setJsonBody("{ not json");

    expect(await screen.findByText(/fix the json body to save/i)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(updateSavedRequestMock).not.toHaveBeenCalled();
  });

  it("shows the folder path and request name as a breadcrumb", async () => {
    fetchCollectionsMock.mockResolvedValue({
      collections: [
        { id: "root", userId: "u", name: "Payments", description: null, parentId: null, createdAt: "", updatedAt: "" },
        { id: "c1", userId: "u", name: "Refunds", description: null, parentId: "root", createdAt: "", updatedAt: "" },
      ],
      requests: [],
    });
    useRequestStore.getState().loadFromSavedRequest(savedRequest({ name: "Create refund" }));
    renderWithQueryClient(<RequestBuilder onSend={() => {}} isSending={false} />);

    const breadcrumb = screen.getByRole("navigation", { name: /request location/i });
    expect(await screen.findByText("Payments")).toBeInTheDocument();
    expect(breadcrumb).toHaveTextContent("PaymentsRefundsCreate refund");
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
