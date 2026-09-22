import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/collectionsService.js", () => ({
  listCollections: vi.fn(),
  getCollection: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  CircularCollectionMoveError: class CircularCollectionMoveError extends Error {},
}));
vi.mock("../src/services/savedRequestsService.js", () => ({
  listRequestsForCollections: vi.fn(),
  createSavedRequest: vi.fn(),
  getSavedRequest: vi.fn(),
  updateSavedRequest: vi.fn(),
  deleteSavedRequest: vi.fn(),
}));

const collectionsService = await import("../src/services/collectionsService.js");
const savedRequestsService = await import("../src/services/savedRequestsService.js");
const { createApp } = await import("../src/app.js");

const app = createApp();
const validId = "123e4567-e89b-12d3-a456-426614174000";

describe("collections routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET / returns collections and their requests together", async () => {
    vi.mocked(collectionsService.listCollections).mockResolvedValue([{ id: validId } as never]);
    vi.mocked(savedRequestsService.listRequestsForCollections).mockResolvedValue([{ id: "req-1" } as never]);

    const res = await request(app).get("/api/collections");

    expect(res.status).toBe(200);
    expect(res.body.collections).toHaveLength(1);
    expect(res.body.requests).toHaveLength(1);
  });

  it("POST / rejects a missing name", async () => {
    const res = await request(app).post("/api/collections").send({});
    expect(res.status).toBe(400);
    expect(collectionsService.createCollection).not.toHaveBeenCalled();
  });

  it("POST / creates a collection", async () => {
    vi.mocked(collectionsService.createCollection).mockResolvedValue({ id: validId, name: "My APIs" } as never);
    const res = await request(app).post("/api/collections").send({ name: "My APIs" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("My APIs");
  });

  it("PATCH /:id returns 400 when the service reports a circular move", async () => {
    const { CircularCollectionMoveError } = collectionsService;
    vi.mocked(collectionsService.updateCollection).mockRejectedValue(new CircularCollectionMoveError("cycle"));

    const res = await request(app).patch(`/api/collections/${validId}`).send({ parentId: validId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("CIRCULAR_MOVE");
  });

  it("PATCH /:id returns 404 for an unknown collection", async () => {
    vi.mocked(collectionsService.updateCollection).mockResolvedValue(null);
    const res = await request(app).patch(`/api/collections/${validId}`).send({ name: "Renamed" });
    expect(res.status).toBe(404);
  });

  it("POST /:id/requests 404s when the collection doesn't exist", async () => {
    vi.mocked(collectionsService.getCollection).mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/collections/${validId}/requests`)
      .send({ name: "Login", method: "POST", url: "{{baseUrl}}/login" });
    expect(res.status).toBe(404);
    expect(savedRequestsService.createSavedRequest).not.toHaveBeenCalled();
  });

  it("POST /:id/requests saves a request into an existing collection", async () => {
    vi.mocked(collectionsService.getCollection).mockResolvedValue({ id: validId } as never);
    vi.mocked(savedRequestsService.createSavedRequest).mockResolvedValue({ id: "req-1", name: "Login" } as never);

    const res = await request(app)
      .post(`/api/collections/${validId}/requests`)
      .send({ name: "Login", method: "POST", url: "{{baseUrl}}/login" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Login");
  });

  it("DELETE /:id returns 204 on success", async () => {
    vi.mocked(collectionsService.deleteCollection).mockResolvedValue(true);
    const res = await request(app).delete(`/api/collections/${validId}`);
    expect(res.status).toBe(204);
  });
});
