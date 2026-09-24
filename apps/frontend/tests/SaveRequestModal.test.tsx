import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaveRequestModal } from "../src/components/collections/SaveRequestModal";
import { useRequestStore } from "../src/store/useRequestStore";
import type { Collection, SavedRequest } from "../src/types";
import { renderWithQueryClient } from "./testUtils";

const fetchCollectionsMock = vi.fn();
const createCollectionMock = vi.fn();
const saveRequestToCollectionMock = vi.fn();

vi.mock("../src/api/collections", () => ({
  fetchCollections: (...args: unknown[]) => fetchCollectionsMock(...args),
  createCollection: (...args: unknown[]) => createCollectionMock(...args),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  saveRequestToCollection: (...args: unknown[]) => saveRequestToCollectionMock(...args),
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

describe("SaveRequestModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRequestStore.getState().reset();
  });

  it("saves a new draft into the selected folder", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [folder()], requests: [] });
    saveRequestToCollectionMock.mockResolvedValue(savedRequest());

    useRequestStore.getState().setUrl("https://api.example.com/users");

    const user = userEvent.setup();
    renderWithQueryClient(<SaveRequestModal onClose={() => {}} />);

    await screen.findByDisplayValue("My Folder");
    const nameInput = screen.getByDisplayValue("Untitled request");
    await user.clear(nameInput);
    await user.type(nameInput, "Get users");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(saveRequestToCollectionMock).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ name: "Get users", url: "https://api.example.com/users" }),
      ),
    );
    await waitFor(() => expect(useRequestStore.getState().draft.savedRequestId).toBe("r1"));
  });

  it("creates a new folder inline when 'Create new folder' is chosen", async () => {
    fetchCollectionsMock.mockResolvedValue({ collections: [], requests: [] });
    createCollectionMock.mockResolvedValue(folder({ id: "new-folder", name: "New Folder" }));
    saveRequestToCollectionMock.mockResolvedValue(savedRequest({ collectionId: "new-folder" }));

    useRequestStore.getState().setUrl("https://api.example.com/users");
    useRequestStore.getState().setName("Get users");

    const user = userEvent.setup();
    renderWithQueryClient(<SaveRequestModal onClose={() => {}} />);

    await screen.findByDisplayValue("Get users");
    await user.type(screen.getByPlaceholderText(/new folder name/i), "New Folder");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createCollectionMock).toHaveBeenCalledWith({ name: "New Folder" }));
    await waitFor(() => expect(saveRequestToCollectionMock).toHaveBeenCalledWith("new-folder", expect.anything()));
  });
});
