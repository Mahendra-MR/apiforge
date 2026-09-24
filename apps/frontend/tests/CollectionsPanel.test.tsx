import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionsPanel } from "../src/components/collections/CollectionsPanel";
import { useRequestStore } from "../src/store/useRequestStore";
import type { Collection, SavedRequest } from "../src/types";
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

describe("CollectionsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRequestStore.getState().reset();
  });

  it("shows an empty state with no collections", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [], requests: [] });
    renderWithQueryClient(<CollectionsPanel />);
    expect(await screen.findByText(/no collections yet/i)).toBeInTheDocument();
  });

  it("lists a folder and its saved request", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });
    renderWithQueryClient(<CollectionsPanel />);

    expect(await screen.findByDisplayValue("My Folder")).toBeInTheDocument();
    expect(screen.getByText("Get users")).toBeInTheDocument();
  });

  it("creates a new root folder", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [], requests: [] });
    createCollectionMock.mockResolvedValue(folder({ id: "new" }));

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);
    await screen.findByText(/no collections yet/i);

    await user.click(screen.getByTitle(/^new folder$/i));
    await user.type(screen.getByPlaceholderText(/^folder name$/i), "APIs{Enter}");

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

  it("deletes a saved request", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [savedRequest()] });
    deleteSavedRequestMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await screen.findByText("Get users");
    await user.click(screen.getByLabelText(/delete request get users/i));

    await waitFor(() => expect(deleteSavedRequestMock).toHaveBeenCalledWith("r1"));
  });

  it("opens the import collection modal", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [], requests: [] });

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);
    await screen.findByText(/no collections yet/i);

    await user.click(screen.getByTitle(/import a collection/i));
    expect(await screen.findByText(/import collection/i)).toBeInTheDocument();
  });

  it("deletes a folder", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [] });
    deleteCollectionMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithQueryClient(<CollectionsPanel />);

    await screen.findByDisplayValue("My Folder");
    await user.click(screen.getByLabelText(/delete folder my folder/i));

    await waitFor(() => expect(deleteCollectionMock).toHaveBeenCalledWith("c1"));
  });
});
