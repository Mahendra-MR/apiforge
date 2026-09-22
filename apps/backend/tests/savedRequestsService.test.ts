import { beforeEach, describe, expect, it, vi } from "vitest";

const poolMock = { query: vi.fn() };
vi.mock("../src/db/pool.js", () => ({ pool: poolMock }));

const savedRequestsService = await import("../src/services/savedRequestsService.js");

function requestRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "req-1",
    collection_id: "col-1",
    name: "Login",
    method: "POST",
    url: "{{baseUrl}}/auth/login",
    query_params: null,
    path_params: null,
    headers: JSON.stringify({ "Content-Type": "application/json" }),
    auth_type: "none",
    auth_config: null,
    body_type: "json",
    body: JSON.stringify({ email: "", password: "" }),
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("savedRequestsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSavedRequest defaults authType/bodyType when omitted", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [requestRow({ auth_type: "none", body_type: "none" })] });

    await savedRequestsService.createSavedRequest("col-1", {
      name: "Login",
      method: "POST",
      url: "{{baseUrl}}/auth/login",
    });

    const params = poolMock.query.mock.calls[0][1];
    expect(params[8]).toBe("none"); // auth_type
    expect(params[10]).toBe("none"); // body_type
  });

  it("getSavedRequest returns null when not found", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });
    expect(await savedRequestsService.getSavedRequest("missing")).toBeNull();
  });

  it("updateSavedRequest can move a request to a different collection", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [requestRow({ collection_id: "col-2" })] });

    const result = await savedRequestsService.updateSavedRequest("req-1", { collectionId: "col-2" });

    expect(result?.collectionId).toBe("col-2");
    const params = poolMock.query.mock.calls[0][1];
    expect(params[15]).toBe(1); // "collectionId" in input, converted to 0/1 for SQLite
    expect(params[16]).toBe("col-2");
  });

  it("updateSavedRequest leaves collectionId untouched when not provided", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [requestRow()] });
    await savedRequestsService.updateSavedRequest("req-1", { name: "Renamed" });
    const params = poolMock.query.mock.calls[0][1];
    expect(params[15]).toBe(0);
  });

  it("listRequestsForCollections short-circuits on an empty list", async () => {
    const result = await savedRequestsService.listRequestsForCollections([]);
    expect(result).toEqual([]);
    expect(poolMock.query).not.toHaveBeenCalled();
  });

  it("deleteSavedRequest returns true when a row was removed", async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 1 });
    expect(await savedRequestsService.deleteSavedRequest("req-1")).toBe(true);
  });
});
