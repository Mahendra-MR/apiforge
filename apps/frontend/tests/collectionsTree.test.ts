import { describe, expect, it } from "vitest";
import { buildCollectionsTree, findTopLevelAncestorId, flattenCollectionsForSelect } from "../src/lib/collectionsTree";
import type { Collection, SavedRequest } from "../src/types";

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: "c1",
    userId: "u1",
    name: "Folder",
    description: null,
    parentId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function request(overrides: Partial<SavedRequest> = {}): SavedRequest {
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

describe("buildCollectionsTree", () => {
  it("nests a subfolder under its parent", () => {
    const root = collection({ id: "root", name: "Root", parentId: null });
    const child = collection({ id: "child", name: "Child", parentId: "root" });

    const tree = buildCollectionsTree([root, child], []);

    expect(tree).toHaveLength(1);
    expect(tree[0].collection.id).toBe("root");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].collection.id).toBe("child");
  });

  it("attaches saved requests to their owning collection", () => {
    const root = collection({ id: "root", parentId: null });
    const req = request({ id: "r1", collectionId: "root" });

    const tree = buildCollectionsTree([root], [req]);

    expect(tree[0].requests).toEqual([req]);
  });

  it("ignores requests with no collection", () => {
    const root = collection({ id: "root", parentId: null });
    const req = request({ id: "r1", collectionId: null });

    const tree = buildCollectionsTree([root], [req]);

    expect(tree[0].requests).toEqual([]);
  });

  it("returns an empty tree for no collections", () => {
    expect(buildCollectionsTree([], [])).toEqual([]);
  });
});

describe("flattenCollectionsForSelect", () => {
  it("indents nested folders by depth", () => {
    const root = collection({ id: "root", name: "Root", parentId: null });
    const child = collection({ id: "child", name: "Child", parentId: "root" });
    const grandchild = collection({ id: "grandchild", name: "Grandchild", parentId: "child" });

    const tree = buildCollectionsTree([root, child, grandchild], []);
    const options = flattenCollectionsForSelect(tree);

    expect(options).toEqual([
      { id: "root", label: "Root" },
      { id: "child", label: "— Child" },
      { id: "grandchild", label: "— — Grandchild" },
    ]);
  });
});

describe("findTopLevelAncestorId", () => {
  it("returns null for a request with no folder", () => {
    expect(findTopLevelAncestorId([], null)).toBeNull();
  });

  it("returns the folder itself when it's already top-level", () => {
    const root = collection({ id: "root", parentId: null });
    expect(findTopLevelAncestorId([root], "root")).toBe("root");
  });

  it("walks up nested subfolders to their top-level ancestor", () => {
    const root = collection({ id: "root", parentId: null });
    const child = collection({ id: "child", parentId: "root" });
    const grandchild = collection({ id: "grandchild", parentId: "child" });

    expect(findTopLevelAncestorId([root, child, grandchild], "grandchild")).toBe("root");
  });

  it("returns null for a collection id that isn't in the list", () => {
    expect(findTopLevelAncestorId([], "missing")).toBeNull();
  });
});
