import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/httpExecutor.js", () => ({
  executeHttpRequest: vi.fn(),
}));
vi.mock("../src/services/historyService.js", () => ({
  recordHistory: vi.fn(),
}));
vi.mock("../src/services/savedRequestsService.js", () => ({
  getSavedRequest: vi.fn(),
  updateSavedRequest: vi.fn(),
  deleteSavedRequest: vi.fn(),
}));

const { executeHttpRequest } = await import("../src/services/httpExecutor.js");
const { recordHistory } = await import("../src/services/historyService.js");
const savedRequestsService = await import("../src/services/savedRequestsService.js");
const { createApp } = await import("../src/app.js");

const app = createApp();
const validId = "123e4567-e89b-12d3-a456-426614174000";

describe("POST /api/requests/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes a valid request and records it to history by default", async () => {
    vi.mocked(executeHttpRequest).mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      body: '{"ok":true}',
      bodyJson: { ok: true },
      timeMs: 12,
      sizeBytes: 11,
    });
    vi.mocked(recordHistory).mockResolvedValue({ id: "hist-1" } as never);

    const res = await request(app)
      .post("/api/requests/execute")
      .send({ method: "GET", url: "https://api.example.com/ping" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(res.body.historyId).toBe("hist-1");
    expect(recordHistory).toHaveBeenCalledOnce();
  });

  it("skips history when saveToHistory is false", async () => {
    vi.mocked(executeHttpRequest).mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: {},
      body: "",
      bodyJson: null,
      timeMs: 5,
      sizeBytes: 0,
    });

    const res = await request(app)
      .post("/api/requests/execute")
      .send({ method: "GET", url: "https://api.example.com/ping", saveToHistory: false });

    expect(res.status).toBe(200);
    expect(res.body.historyId).toBeUndefined();
    expect(recordHistory).not.toHaveBeenCalled();
  });

  it("rejects an unsupported HTTP method with 400", async () => {
    const res = await request(app)
      .post("/api/requests/execute")
      .send({ method: "TRACE", url: "https://api.example.com/x" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(executeHttpRequest).not.toHaveBeenCalled();
  });

  it("rejects a missing url with 400", async () => {
    const res = await request(app).post("/api/requests/execute").send({ method: "GET" });
    expect(res.status).toBe(400);
  });

  it("maps upstream execution failures to a 502", async () => {
    const { RequestExecutionError } = await import("../src/types/index.js");
    vi.mocked(executeHttpRequest).mockRejectedValue(new RequestExecutionError("boom"));

    const res = await request(app)
      .post("/api/requests/execute")
      .send({ method: "GET", url: "https://api.example.com/down" });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("UPSTREAM_ERROR");
  });

  it("passes requestId through to history when the send came from a saved request", async () => {
    vi.mocked(executeHttpRequest).mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: {},
      body: "",
      bodyJson: null,
      timeMs: 1,
      sizeBytes: 0,
    });
    vi.mocked(recordHistory).mockResolvedValue({ id: "hist-1" } as never);

    await request(app)
      .post("/api/requests/execute")
      .send({ method: "GET", url: "https://api.example.com/ping", requestId: validId });

    expect(recordHistory).toHaveBeenCalledWith(expect.objectContaining({ requestId: validId }));
  });
});

describe("saved request CRUD (/api/requests/:id)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /:id returns a saved request", async () => {
    vi.mocked(savedRequestsService.getSavedRequest).mockResolvedValue({ id: validId, name: "Login" } as never);
    const res = await request(app).get(`/api/requests/${validId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Login");
  });

  it("GET /:id returns 404 when missing", async () => {
    vi.mocked(savedRequestsService.getSavedRequest).mockResolvedValue(null);
    const res = await request(app).get(`/api/requests/${validId}`);
    expect(res.status).toBe(404);
  });

  it("GET /:id returns 400 for a malformed id instead of querying the database", async () => {
    const res = await request(app).get("/api/requests/not-a-uuid");
    expect(res.status).toBe(400);
    expect(savedRequestsService.getSavedRequest).not.toHaveBeenCalled();
  });

  it("PATCH /:id updates a saved request", async () => {
    vi.mocked(savedRequestsService.updateSavedRequest).mockResolvedValue({ id: validId, name: "Renamed" } as never);
    const res = await request(app).patch(`/api/requests/${validId}`).send({ name: "Renamed" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed");
  });

  it("DELETE /:id returns 204 on success", async () => {
    vi.mocked(savedRequestsService.deleteSavedRequest).mockResolvedValue(true);
    const res = await request(app).delete(`/api/requests/${validId}`);
    expect(res.status).toBe(204);
  });

  it("DELETE /:id returns 404 when nothing was deleted", async () => {
    vi.mocked(savedRequestsService.deleteSavedRequest).mockResolvedValue(false);
    const res = await request(app).delete(`/api/requests/${validId}`);
    expect(res.status).toBe(404);
  });
});
