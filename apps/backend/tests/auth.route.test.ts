import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/oauth2Service.js", async () => {
  const actual = await vi.importActual<typeof import("../src/services/oauth2Service.js")>(
    "../src/services/oauth2Service.js",
  );
  return { ...actual, fetchClientCredentialsToken: vi.fn() };
});

const oauth2Service = await import("../src/services/oauth2Service.js");
const { createApp } = await import("../src/app.js");

const app = createApp();

describe("POST /api/auth/oauth2/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns a token for a valid request", async () => {
    vi.mocked(oauth2Service.fetchClientCredentialsToken).mockResolvedValue({
      accessToken: "abc123",
      tokenType: "Bearer",
      expiresIn: 3600,
      scope: null,
      obtainedAt: "2026-01-01T00:00:00.000Z",
    });

    const res = await request(app).post("/api/auth/oauth2/token").send({
      tokenUrl: "https://idp.example.com/oauth/token",
      clientId: "id",
      clientSecret: "secret",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("abc123");
  });

  it("rejects a missing clientSecret with 400", async () => {
    const res = await request(app)
      .post("/api/auth/oauth2/token")
      .send({ tokenUrl: "https://idp.example.com/oauth/token", clientId: "id" });

    expect(res.status).toBe(400);
    expect(oauth2Service.fetchClientCredentialsToken).not.toHaveBeenCalled();
  });

  it("maps an OAuth2TokenError to a 502", async () => {
    vi.mocked(oauth2Service.fetchClientCredentialsToken).mockRejectedValue(
      new oauth2Service.OAuth2TokenError("Token request failed (400): invalid_client"),
    );

    const res = await request(app).post("/api/auth/oauth2/token").send({
      tokenUrl: "https://idp.example.com/oauth/token",
      clientId: "id",
      clientSecret: "wrong",
    });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("OAUTH2_TOKEN_ERROR");
  });

  it("never echoes the client secret back in the response", async () => {
    vi.mocked(oauth2Service.fetchClientCredentialsToken).mockResolvedValue({
      accessToken: "abc123",
      tokenType: "Bearer",
      expiresIn: null,
      scope: null,
      obtainedAt: "2026-01-01T00:00:00.000Z",
    });

    const res = await request(app).post("/api/auth/oauth2/token").send({
      tokenUrl: "https://idp.example.com/oauth/token",
      clientId: "id",
      clientSecret: "super-secret-value",
    });

    expect(JSON.stringify(res.body)).not.toContain("super-secret-value");
  });
});
