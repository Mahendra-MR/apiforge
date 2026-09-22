import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/historyService.js", () => ({
  listHistory: vi.fn(),
  deleteHistoryEntry: vi.fn(),
  clearHistory: vi.fn(),
}));

const { listHistory, deleteHistoryEntry, clearHistory } = await import(
  "../src/services/historyService.js"
);
const { createApp } = await import("../src/app.js");

const app = createApp();

describe("GET /api/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns entries from the history service", async () => {
    vi.mocked(listHistory).mockResolvedValue([{ id: "h1", method: "GET", url: "https://x" }] as never);

    const res = await request(app).get("/api/history");

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
    expect(listHistory).toHaveBeenCalledWith({ search: undefined, limit: undefined });
  });

  it("passes search and limit query params through", async () => {
    vi.mocked(listHistory).mockResolvedValue([]);

    await request(app).get("/api/history").query({ search: "users", limit: "5" });

    expect(listHistory).toHaveBeenCalledWith({ search: "users", limit: 5 });
  });
});

describe("DELETE /api/history/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validId = "123e4567-e89b-12d3-a456-426614174000";

  it("returns 204 when the entry is deleted", async () => {
    vi.mocked(deleteHistoryEntry).mockResolvedValue(true);
    const res = await request(app).delete(`/api/history/${validId}`);
    expect(res.status).toBe(204);
  });

  it("returns 404 when the entry does not exist", async () => {
    vi.mocked(deleteHistoryEntry).mockResolvedValue(false);
    const res = await request(app).delete(`/api/history/${validId}`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed id instead of hitting the database", async () => {
    const res = await request(app).delete("/api/history/not-a-uuid");
    expect(res.status).toBe(400);
    expect(deleteHistoryEntry).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/history", () => {
  it("clears all history and reports the deleted count", async () => {
    vi.mocked(clearHistory).mockResolvedValue(7);
    const res = await request(app).delete("/api/history");
    expect(res.status).toBe(200);
    expect(res.body.deletedCount).toBe(7);
  });
});
