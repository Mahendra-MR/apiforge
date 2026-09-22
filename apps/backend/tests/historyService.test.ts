import { beforeEach, describe, expect, it, vi } from "vitest";

const poolMock = { query: vi.fn() };

vi.mock("../src/db/pool.js", () => ({ pool: poolMock }));

const { recordHistory, listHistory, deleteHistoryEntry, clearHistory } = await import(
  "../src/services/historyService.js"
);

function historyRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "h1",
    user_id: null,
    request_id: null,
    method: "GET",
    url: "https://api.example.com/users",
    request_headers: null,
    request_body: null,
    response_status: 200,
    response_headers: null,
    response_body: null,
    response_time_ms: 42,
    response_size_bytes: 10,
    error: null,
    executed_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("historyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recordHistory inserts a row and returns the mapped entry", async () => {
    poolMock.query.mockResolvedValue({ rows: [historyRow()] });

    const result = await recordHistory({
      method: "GET",
      url: "https://api.example.com/users",
      responseStatus: 200,
    });

    expect(result.id).toBe("h1");
    expect(result.executedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(poolMock.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO request_history"),
      expect.arrayContaining(["GET", "https://api.example.com/users"]),
    );
  });

  it("listHistory applies a case-insensitive LIKE filter on method/url when searching", async () => {
    poolMock.query.mockResolvedValue({ rows: [] });

    await listHistory({ search: "users", limit: 10 });

    const [sql, params] = poolMock.query.mock.calls[0];
    expect(sql).toContain("LIKE");
    expect(params).toEqual(["%users%", "%users%", 10]);
  });

  it("listHistory escapes LIKE wildcard characters in the search term", async () => {
    poolMock.query.mockResolvedValue({ rows: [] });

    await listHistory({ search: "100%_off" });

    const [, params] = poolMock.query.mock.calls[0];
    expect(params[0]).toBe("%100\\%\\_off%");
  });

  it("listHistory queries without a WHERE filter when no search term is given", async () => {
    poolMock.query.mockResolvedValue({ rows: [] });

    await listHistory();

    const [sql] = poolMock.query.mock.calls[0];
    expect(sql).not.toContain("WHERE");
  });

  it("deleteHistoryEntry returns true when a row was deleted", async () => {
    poolMock.query.mockResolvedValue({ rowCount: 1 });
    expect(await deleteHistoryEntry("h1")).toBe(true);
  });

  it("deleteHistoryEntry returns false when no row matched", async () => {
    poolMock.query.mockResolvedValue({ rowCount: 0 });
    expect(await deleteHistoryEntry("missing")).toBe(false);
  });

  it("clearHistory returns the number of deleted rows", async () => {
    poolMock.query.mockResolvedValue({ rowCount: 5 });
    expect(await clearHistory()).toBe(5);
  });
});
