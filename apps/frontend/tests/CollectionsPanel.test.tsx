import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionsPanel } from "../src/components/collections/CollectionsPanel";
import { useRequestStore } from "../src/store/useRequestStore";
import type { Collection, ExecuteRequestResponse, RequestExample, SavedRequest } from "../src/types";
import { renderWithQueryClient } from "./testUtils";

const fetchCollectionsMock = vi.fn();
const createCollectionMock = vi.fn();
const updateCollectionMock = vi.fn();
const deleteCollectionMock = vi.fn();
const saveRequestToCollectionMock = vi.fn();

vi.mock("../src/api/collections", () => ({
  fetchCollections: (...args: unknown[]) => fetchCollectionsMock(...args),
  createCollection: (...args: unknown[]) => createCollectionMock(...args),
  updateCollection: (...args: unknown[]) => updateCollectionMock(...args),
  deleteCollection: (...args: unknown[]) => deleteCollectionMock(...args),
  saveRequestToCollection: (...args: unknown[]) => saveRequestToCollectionMock(...args),
}));

const deleteSavedRequestMock = vi.fn();
const updateSavedRequestMock = vi.fn();

vi.mock("../src/api/requests", () => ({
  deleteSavedRequest: (...args: unknown[]) => deleteSavedRequestMock(...args),
  updateSavedRequest: (...args: unknown[]) => updateSavedRequestMock(...args),
}));

const createExampleMock = vi.fn();
const renameExampleMock = vi.fn();
const deleteExampleMock = vi.fn();
vi.mock("../src/api/examples", () => ({
  createExample: (...args: unknown[]) => createExampleMock(...args),
  renameExample: (...args: unknown[]) => renameExampleMock(...args),
  deleteExample: (...args: unknown[]) => deleteExampleMock(...args),
}));

// Opening a folder's "Environment" menu entry mounts the (scoped)
// EnvironmentManager, which reads the environments list.
const fetchEnvironmentsMock = vi.fn();
vi.mock("../src/api/environments", () => ({
  fetchEnvironments: (...args: unknown[]) => fetchEnvironmentsMock(...args),
  createEnvironment: vi.fn(),
  renameEnvironment: vi.fn(),
  activateEnvironment: vi.fn(),
  deleteEnvironment: vi.fn(),
  createVariable: vi.fn(),
  updateVariable: vi.fn(),
  deleteVariable: vi.fn(),
}));

function folder(overrides: Partial<Collection> = {}): Collection {
  return {
    id: "c1",
    userId: "u1",
    name: "My Folder",
    description: null,
    parentId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function savedRequest(overrides: Partial<SavedRequest> = {}): SavedRequest {
  return {
    id: "r1",
    collectionId: "c1",
    name: "Get users",
    method: "GET",
    url: "https://api.example.com/users",
    queryParams: null,
    pathParams: null,
    headers: { Accept: "application/json" },
    authType: "none",
    authConfig: null,
    bodyType: "none",
    body: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function example(overrides: Partial<RequestExample> = {}): RequestExample {
  return {
    id: "e1",
    requestId: "r1",
    name: "200 OK",
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: '{"users":[]}',
    timeMs: 12,
    sizeBytes: 12,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const liveResponse: ExecuteRequestResponse = {
  status: 201,
  statusText: "Created",
  headers: { "content-type": "application/json" },
  body: '{"id":1}',
  bodyJson: { id: 1 },
  timeMs: 30,
  sizeBytes: 8,
};

async function openMenu(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(await screen.findByLabelText(label));
}

describe("CollectionsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRequestStore.getState().reset();
    fetchEnvironmentsMock.mockResolvedValue([]);
  });

  it("shows an empty state with no collections", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [], requests: [] });
    renderWithQueryClient(<CollectionsPanel />);
    expect(await screen.findByText(/no collections yet/i)).toBeInTheDocument();
  });

  it("lists a folder and its saved request as plain rows, not editable inputs", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });
    renderWithQueryClient(<CollectionsPanel />);

    expect(await screen.findByText("My Folder")).toBeInTheDocument();
    expect(screen.getByText("Get users")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("My Folder")).not.toBeInTheDocument();
  });

  it("creates a new top-level collection", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [], requests: [] });
    createCollectionMock.mockResolvedValue(folder({ id: "new" }));

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);
    await screen.findByText(/no collections yet/i);

    await user.click(screen.getByTitle(/^new collection$/i));
    await user.type(screen.getByPlaceholderText(/^collection name$/i), "APIs{Enter}");

    await waitFor(() => expect(createCollectionMock).toHaveBeenCalledWith({ name: "APIs" }));
  });

  it("loads a saved request into the draft when clicked", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await user.click(await screen.findByText("Get users"));

    expect(useRequestStore.getState().draft.url).toBe("https://api.example.com/users");
    expect(useRequestStore.getState().draft.savedRequestId).toBe("r1");
    expect(useRequestStore.getState().draft.collectionId).toBe("c1");
  });

  it("adds a blank request to a folder from its menu and opens it", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [] });
    saveRequestToCollectionMock.mockResolvedValue(savedRequest({ id: "new-req", name: "New Request", url: "" }));

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await openMenu(user, /more options for my folder/i);
    await user.click(await screen.findByRole("menuitem", { name: /add request/i }));

    await waitFor(() =>
      expect(saveRequestToCollectionMock).toHaveBeenCalledWith("c1", { name: "New Request", method: "GET", url: "" }),
    );
    await waitFor(() => expect(useRequestStore.getState().draft.savedRequestId).toBe("new-req"));
  });

  it("offers an inline 'Add a request' link in an empty folder", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [] });
    saveRequestToCollectionMock.mockResolvedValue(savedRequest({ id: "new-req" }));

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await user.click(await screen.findByRole("button", { name: /add a request/i }));
    await waitFor(() => expect(saveRequestToCollectionMock).toHaveBeenCalledWith("c1", expect.objectContaining({ url: "" })));
  });

  it("renames a folder from its menu", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [] });
    updateCollectionMock.mockResolvedValue(folder({ name: "Payments" }));

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await openMenu(user, /more options for my folder/i);
    await user.click(await screen.findByRole("menuitem", { name: /rename/i }));
    const input = screen.getByDisplayValue("My Folder");
    await user.clear(input);
    await user.type(input, "Payments{Enter}");

    await waitFor(() => expect(updateCollectionMock).toHaveBeenCalledWith("c1", { name: "Payments" }));
  });

  it("renames a request from its menu and keeps the open builder in step", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });
    updateSavedRequestMock.mockResolvedValue(savedRequest({ name: "List users" }));

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);
    await user.click(await screen.findByText("Get users"));

    await openMenu(user, /more actions for request get users/i);
    await user.click(await screen.findByRole("menuitem", { name: /rename/i }));
    const input = screen.getByDisplayValue("Get users");
    await user.clear(input);
    await user.type(input, "List users{Enter}");

    await waitFor(() => expect(updateSavedRequestMock).toHaveBeenCalledWith("r1", { name: "List users" }));
    expect(useRequestStore.getState().draft.name).toBe("List users");
  });

  it("duplicates a request into the same folder and opens the copy", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });
    saveRequestToCollectionMock.mockResolvedValue(savedRequest({ id: "copy", name: "Get users Copy" }));

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await openMenu(user, /more actions for request get users/i);
    await user.click(await screen.findByRole("menuitem", { name: /duplicate/i }));

    await waitFor(() =>
      expect(saveRequestToCollectionMock).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ name: "Get users Copy", url: "https://api.example.com/users", headers: { Accept: "application/json" } }),
      ),
    );
    await waitFor(() => expect(useRequestStore.getState().draft.savedRequestId).toBe("copy"));
  });

  it("deletes a saved request after confirming, and clears it from the builder if it was open", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });
    deleteSavedRequestMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);
    await user.click(await screen.findByText("Get users"));

    await openMenu(user, /more actions for request get users/i);
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }));
    expect(deleteSavedRequestMock).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(deleteSavedRequestMock).toHaveBeenCalledWith("r1"));
    expect(useRequestStore.getState().draft.savedRequestId).toBeNull();
  });

  it("only offers 'Add example' once the open request has a response, then saves it", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });
    createExampleMock.mockResolvedValue(example({ name: "201 Created" }));

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);
    await user.click(await screen.findByText("Get users"));

    await openMenu(user, /more actions for request get users/i);
    expect(await screen.findByRole("menuitem", { name: /add example/i })).toBeDisabled();
    await user.keyboard("{Escape}");

    act(() => useRequestStore.getState().setResponse(liveResponse));
    await openMenu(user, /more actions for request get users/i);
    await user.click(await screen.findByRole("menuitem", { name: /add example/i }));

    await waitFor(() =>
      expect(createExampleMock).toHaveBeenCalledWith("r1", {
        name: "201 Created",
        status: 201,
        statusText: "Created",
        headers: { "content-type": "application/json" },
        body: '{"id":1}',
        timeMs: 30,
        sizeBytes: 8,
      }),
    );
  });

  it("lists a request's examples under it and opens one without re-sending", async () => {
    fetchCollectionsMock.mockResolvedValue({
      collections: [folder()],
      requests: [savedRequest()],
      examples: [example()],
    });

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await user.click(await screen.findByLabelText(/expand get users/i));
    await user.click(await screen.findByText("200 OK"));

    const state = useRequestStore.getState();
    expect(state.draft.savedRequestId).toBe("r1");
    expect(state.viewingExample?.id).toBe("e1");
  });

  it("filters the tree by request name or URL", async () => {
    fetchCollectionsMock.mockResolvedValue({
      collections: [folder(), folder({ id: "c2", name: "Other" })],
      requests: [savedRequest(), savedRequest({ id: "r2", collectionId: "c2", name: "Ping", url: "https://status.test/health" })],
    });

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);
    await screen.findByText("Get users");

    await user.type(screen.getByLabelText(/filter collections/i), "health");

    expect(screen.getByText("Ping")).toBeInTheDocument();
    expect(screen.queryByText("Get users")).not.toBeInTheDocument();
    expect(screen.queryByText("My Folder")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/filter collections/i), "zzz");
    expect(screen.getByText(/no requests match/i)).toBeInTheDocument();
  });

  it("opens the import collection modal", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [], requests: [] });

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);
    await screen.findByText(/no collections yet/i);

    await user.click(screen.getByTitle(/import a collection/i));
    expect(await screen.findByText(/import collection/i)).toBeInTheDocument();
  });

  it("deletes a folder after confirming from its menu", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [] });
    deleteCollectionMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await openMenu(user, /more options for my folder/i);
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }));
    expect(deleteCollectionMock).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(deleteCollectionMock).toHaveBeenCalledWith("c1"));
  });

  it("shares a folder as a Postman collection export", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await openMenu(user, /more options for my folder/i);
    await user.click(await screen.findByRole("menuitem", { name: /share/i }));

    expect(await screen.findByText(/share "my folder"/i)).toBeInTheDocument();
    expect(screen.getByText(/exports just this folder/i)).toBeInTheDocument();
  });

  it("opens a scoped environment manager for a top-level folder from its menu", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [] });

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await openMenu(user, /more options for my folder/i);
    await user.click(await screen.findByRole("menuitem", { name: /environment/i }));

    expect(await screen.findByRole("heading", { name: /environment — my folder/i })).toBeInTheDocument();
  });

  it("does not offer a per-folder environment on a nested subfolder", async () => {
    const root = folder({ id: "root", name: "Root" });
    const child = folder({ id: "child", name: "Child", parentId: "root" });
    fetchCollectionsMock.mockResolvedValue({ collections: [root, child], requests: [] });

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await openMenu(user, /more options for child/i);

    expect(await screen.findByRole("menuitem", { name: /add request/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /environment/i })).not.toBeInTheDocument();
  });
});
