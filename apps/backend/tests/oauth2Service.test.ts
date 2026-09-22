import { afterEach, describe, expect, it, vi } from "vitest";
import { OAuth2TokenError, fetchClientCredentialsToken } from "../src/services/oauth2Service.js";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("fetchClientCredentialsToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a normalized access token on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { access_token: "abc123", token_type: "Bearer", expires_in: 3600 })),
    );

    const token = await fetchClientCredentialsToken({
      tokenUrl: "https://idp.example.com/oauth/token",
      clientId: "id",
      clientSecret: "secret",
    });

    expect(token.accessToken).toBe("abc123");
    expect(token.tokenType).toBe("Bearer");
    expect(token.expiresIn).toBe(3600);
  });

  it("sends grant_type=client_credentials and the client credentials as form fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { access_token: "x" }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchClientCredentialsToken({
      tokenUrl: "https://idp.example.com/oauth/token",
      clientId: "my-id",
      clientSecret: "my-secret",
      scope: "read:things",
    });

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = new URLSearchParams(init.body as string);
    expect(sentBody.get("grant_type")).toBe("client_credentials");
    expect(sentBody.get("client_id")).toBe("my-id");
    expect(sentBody.get("client_secret")).toBe("my-secret");
    expect(sentBody.get("scope")).toBe("read:things");
  });

  it("throws OAuth2TokenError with the provider's error_description on a 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { error: "invalid_client", error_description: "Unknown client" })),
    );

    await expect(
      fetchClientCredentialsToken({ tokenUrl: "https://idp.example.com/oauth/token", clientId: "x", clientSecret: "y" }),
    ).rejects.toThrow(/Unknown client/);
  });

  it("throws OAuth2TokenError when the response has no access_token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })));

    await expect(
      fetchClientCredentialsToken({ tokenUrl: "https://idp.example.com/oauth/token", clientId: "x", clientSecret: "y" }),
    ).rejects.toBeInstanceOf(OAuth2TokenError);
  });
});
