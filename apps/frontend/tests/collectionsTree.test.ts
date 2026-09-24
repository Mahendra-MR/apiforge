import { describe, expect, it } from "vitest";
import {
  buildCollectionsTree,
  collectSubtreeIds,
  filterCollectionsTree,
  findTopLevelAncestorId,
  flattenCollectionsForSelect,
  groupExamplesByRequest,
} from "../src/lib/collectionsTree";
import type { Collection, RequestExample, SavedRequest } from "../src/types";

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

describe("filterCollectionsTree", () => {
  const api = collection({ id: "api", name: "Payments API" });
  const auth = collection({ id: "auth", name: "Auth", parentId: "api" });
  const misc = collection({ id: "misc", name: "Misc" });
  const tree = buildCollectionsTree(
    [api, auth, misc],
    [
      request({ id: "login", name: "Login", collectionId: "auth", url: "{{baseUrl}}/login" }),
      request({ id: "refund", name: "Refund", collectionId: "api", url: "{{baseUrl}}/refunds" }),
      request({ id: "ping", name: "Ping", collectionId: "misc", url: "https://status.example.com/health" }),
    ],
  );

  it("returns the tree unchanged for a blank query", () => {
    expect(filterCollectionsTree(tree, "  ")).toBe(tree);
  });

  it("keeps only matching requests plus the folders leading to them", () => {
    const result = filterCollectionsTree(tree, "LOGIN");
    expect(result).toHaveLength(1);
    expect(result[0].collection.id).toBe("api");
    expect(result[0].requests).toHaveLength(0);
    expect(result[0].children[0].requests.map((r) => r.id)).toEqual(["login"]);
  });

  it("matches requests by URL as well as name", () => {
    const result = filterCollectionsTree(tree, "health");
    expect(result.map((n) => n.collection.id)).toEqual(["misc"]);
  });

  it("keeps a matching folder's whole subtree", () => {
    const result = filterCollectionsTree(tree, "payments");
    expect(result[0].requests.map((r) => r.id)).toEqual(["refund"]);
    expect(result[0].children[0].requests.map((r) => r.id)).toEqual(["login"]);
  });
});

describe("collectSubtreeIds / groupExamplesByRequest", () => {
  it("lists a folder and every nested subfolder id", () => {
    const tree = buildCollectionsTree(
      [collection({ id: "a" }), collection({ id: "b", parentId: "a" }), collection({ id: "c", parentId: "b" })],
      [],
    );
    expect(collectSubtreeIds(tree[0])).toEqual(["a", "b", "c"]);
  });

  it("groups examples under their request id", () => {
    const example = (id: string, requestId: string) => ({ id, requestId }) as RequestExample;
    const grouped = groupExamplesByRequest([example("e1", "r1"), example("e2", "r2"), example("e3", "r1")]);
    expect(grouped.get("r1")?.map((e) => e.id)).toEqual(["e1", "e3"]);
    expect(grouped.get("r2")?.map((e) => e.id)).toEqual(["e2"]);
  });
});
