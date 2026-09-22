import { beforeEach, describe, expect, it, vi } from "vitest";

const poolMock = { query: vi.fn() };
vi.mock("../src/db/pool.js", () => ({ pool: poolMock }));

const collectionsService = await import("../src/services/collectionsService.js");

function collectionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "col-1",
    user_id: "user-1",
    name: "Authentication",
    description: null,
    parent_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("collectionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createCollection inserts with the given parentId", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [collectionRow({ parent_id: "col-root" })] });

    await collectionsService.createCollection("user-1", { name: "Authentication", parentId: "col-root" });

    expect(poolMock.query.mock.calls[0][1]).toEqual([
      expect.any(String), // id
      "user-1",
      "Authentication",
      null,
      "col-root",
      expect.any(String), // created_at
      expect.any(String), // updated_at
    ]);
  });

  it("updateCollection renames without touching parentId when parentId isn't provided", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [collectionRow({ name: "Renamed" })] });

    await collectionsService.updateCollection("col-1", "user-1", { name: "Renamed" });

    const [, params] = poolMock.query.mock.calls[0];
    expect(params[0]).toBe("Renamed");
    expect(params[3]).toBe(0); // "parentId" in input === false, converted to 0/1 for SQLite
  });

  it("updateCollection rejects moving a collection into itself", async () => {
    await expect(
      collectionsService.updateCollection("col-1", "user-1", { parentId: "col-1" }),
    ).rejects.toThrow(collectionsService.CircularCollectionMoveError);
    expect(poolMock.query).not.toHaveBeenCalled();
  });

  it("updateCollection rejects moving a collection under its own descendant", async () => {
    // col-1's proposed new parent is col-2, whose parent is col-1 (a cycle).
    poolMock.query.mockResolvedValueOnce({ rows: [{ parent_id: "col-1" }] }); // lookup for col-2

    await expect(
      collectionsService.updateCollection("col-1", "user-1", { parentId: "col-2" }),
    ).rejects.toThrow(collectionsService.CircularCollectionMoveError);
  });

  it("updateCollection allows moving to an unrelated collection", async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [{ parent_id: null }] }) // ancestor walk finds no cycle
      .mockResolvedValueOnce({ rows: [collectionRow({ parent_id: "col-other" })] }); // the update itself

    const result = await collectionsService.updateCollection("col-1", "user-1", { parentId: "col-other" });
    expect(result?.parentId).toBe("col-other");
  });

  it("deleteCollection returns false when nothing matched", async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 0 });
    expect(await collectionsService.deleteCollection("col-x", "user-1")).toBe(false);
  });
});
