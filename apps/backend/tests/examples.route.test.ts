import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/examplesService.js", () => ({
  renameExample: vi.fn(),
  deleteExample: vi.fn(),
}));

const examplesService = await import("../src/services/examplesService.js");
const { createApp } = await import("../src/app.js");

const app = createApp();
const validId = "123e4567-e89b-12d3-a456-426614174000";

describe("examples routes (/api/examples/:id)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH renames an example", async () => {
    vi.mocked(examplesService.renameExample).mockResolvedValue({ id: validId, name: "Not found case" } as never);
    const res = await request(app).patch(`/api/examples/${validId}`).send({ name: "Not found case" });
    expect(res.status).toBe(200);
    expect(examplesService.renameExample).toHaveBeenCalledWith(validId, "Not found case");
  });

  it("PATCH rejects an empty name", async () => {
    const res = await request(app).patch(`/api/examples/${validId}`).send({ name: "  " });
    expect(res.status).toBe(400);
    expect(examplesService.renameExample).not.toHaveBeenCalled();
  });

  it("PATCH returns 404 for an unknown example", async () => {
    vi.mocked(examplesService.renameExample).mockResolvedValue(null);
    const res = await request(app).patch(`/api/examples/${validId}`).send({ name: "x" });
    expect(res.status).toBe(404);
  });

  it("DELETE returns 204 on success and 404 when missing", async () => {
    vi.mocked(examplesService.deleteExample).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await request(app).delete(`/api/examples/${validId}`)).status).toBe(204);
    expect((await request(app).delete(`/api/examples/${validId}`)).status).toBe(404);
  });
});
