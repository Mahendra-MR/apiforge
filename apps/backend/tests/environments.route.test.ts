import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/environmentsService.js", () => ({
  listEnvironments: vi.fn(),
  createEnvironment: vi.fn(),
  getEnvironment: vi.fn(),
  renameEnvironment: vi.fn(),
  setActiveEnvironment: vi.fn(),
  deleteEnvironment: vi.fn(),
  createVariable: vi.fn(),
  updateVariable: vi.fn(),
  deleteVariable: vi.fn(),
}));

const service = await import("../src/services/environmentsService.js");
const { createApp } = await import("../src/app.js");

const app = createApp();
const validId = "123e4567-e89b-12d3-a456-426614174000";

describe("environments routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET / lists environments", async () => {
    vi.mocked(service.listEnvironments).mockResolvedValue([{ id: validId } as never]);
    const res = await request(app).get("/api/environments");
    expect(res.status).toBe(200);
    expect(res.body.environments).toHaveLength(1);
  });

  it("POST / rejects an empty name", async () => {
    const res = await request(app).post("/api/environments").send({ name: "" });
    expect(res.status).toBe(400);
    expect(service.createEnvironment).not.toHaveBeenCalled();
  });

  it("POST / creates an environment", async () => {
    vi.mocked(service.createEnvironment).mockResolvedValue({ id: validId, name: "Development" } as never);
    const res = await request(app).post("/api/environments").send({ name: "Development" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Development");
  });

  it("GET /:id returns 404 when not found", async () => {
    vi.mocked(service.getEnvironment).mockResolvedValue(null);
    const res = await request(app).get(`/api/environments/${validId}`);
    expect(res.status).toBe(404);
  });

  it("POST /:id/activate activates an environment", async () => {
    vi.mocked(service.setActiveEnvironment).mockResolvedValue({ id: validId, isActive: true } as never);
    const res = await request(app).post(`/api/environments/${validId}/activate`);
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(true);
  });

  it("POST /:id/activate returns 404 for an unknown environment", async () => {
    vi.mocked(service.setActiveEnvironment).mockResolvedValue(null);
    const res = await request(app).post(`/api/environments/${validId}/activate`);
    expect(res.status).toBe(404);
  });

  it("POST /:id/variables validates the body and creates a variable", async () => {
    vi.mocked(service.getEnvironment).mockResolvedValue({ id: validId } as never);
    vi.mocked(service.createVariable).mockResolvedValue({ id: "var-1", key: "baseUrl" } as never);

    const res = await request(app)
      .post(`/api/environments/${validId}/variables`)
      .send({ key: "baseUrl", value: "https://dev-api.example.com" });

    expect(res.status).toBe(201);
    expect(res.body.key).toBe("baseUrl");
  });

  it("POST /:id/variables 404s when the environment doesn't exist", async () => {
    vi.mocked(service.getEnvironment).mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/environments/${validId}/variables`)
      .send({ key: "baseUrl", value: "https://x" });
    expect(res.status).toBe(404);
    expect(service.createVariable).not.toHaveBeenCalled();
  });

  it("DELETE /:id/variables/:variableId returns 204 on success", async () => {
    vi.mocked(service.deleteVariable).mockResolvedValue(true);
    const res = await request(app).delete(`/api/environments/${validId}/variables/${validId}`);
    expect(res.status).toBe(204);
  });
});
