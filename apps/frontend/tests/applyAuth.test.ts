import { describe, expect, it } from "vitest";
import { applyAuth } from "../src/lib/applyAuth";
import { createEmptyAuthConfig } from "../src/types";

describe("applyAuth", () => {
  it("returns headers/url unchanged for 'none'", () => {
    const auth = createEmptyAuthConfig();
    const result = applyAuth("none", auth, { "X-Existing": "1" }, "https://api.example.com/users");
    expect(result).toEqual({ headers: { "X-Existing": "1" }, url: "https://api.example.com/users" });
  });

  it("adds a Bearer Authorization header", () => {
    const auth = { ...createEmptyAuthConfig(), bearer: { token: "abc123" } };
    const result = applyAuth("bearer", auth, {}, "https://api.example.com/users");
    expect(result.headers.Authorization).toBe("Bearer abc123");
  });

  it("does not add an Authorization header for an empty bearer token", () => {
    const auth = createEmptyAuthConfig();
    const result = applyAuth("bearer", auth, {}, "https://api.example.com/users");
    expect(result.headers.Authorization).toBeUndefined();
  });

  it("base64-encodes username:password for Basic auth", () => {
    const auth = { ...createEmptyAuthConfig(), basic: { username: "alice", password: "secret" } };
    const result = applyAuth("basic", auth, {}, "https://api.example.com/users");
    expect(result.headers.Authorization).toBe(`Basic ${btoa("alice:secret")}`);
  });

  it("adds an API key as a header when location is 'header'", () => {
    const auth = { ...createEmptyAuthConfig(), apiKey: { key: "X-API-Key", value: "k-1", location: "header" as const } };
    const result = applyAuth("apiKey", auth, {}, "https://api.example.com/users");
    expect(result.headers["X-API-Key"]).toBe("k-1");
    expect(result.url).toBe("https://api.example.com/users");
  });

  it("adds an API key as a query param when location is 'query'", () => {
    const auth = { ...createEmptyAuthConfig(), apiKey: { key: "api_key", value: "k-1", location: "query" as const } };
    const result = applyAuth("apiKey", auth, {}, "https://api.example.com/users");
    expect(new URL(result.url).searchParams.get("api_key")).toBe("k-1");
  });

  it("falls back to manual query concatenation for an unresolved {{baseUrl}} url", () => {
    const auth = { ...createEmptyAuthConfig(), apiKey: { key: "api_key", value: "k-1", location: "query" as const } };
    const result = applyAuth("apiKey", auth, {}, "{{baseUrl}}/users");
    expect(result.url).toBe("{{baseUrl}}/users?api_key=k-1");
  });

  it("adds an OAuth2 Authorization header once a token has been fetched", () => {
    const auth = {
      ...createEmptyAuthConfig(),
      oauth2: {
        tokenUrl: "https://auth.example.com/token",
        clientId: "id",
        clientSecret: "secret",
        scope: "",
        accessToken: "xyz",
        tokenType: "Bearer",
        obtainedAt: new Date().toISOString(),
      },
    };
    const result = applyAuth("oauth2", auth, {}, "https://api.example.com/users");
    expect(result.headers.Authorization).toBe("Bearer xyz");
  });

  it("leaves headers unchanged for OAuth2 when no token has been fetched yet", () => {
    const auth = createEmptyAuthConfig();
    const result = applyAuth("oauth2", auth, {}, "https://api.example.com/users");
    expect(result.headers.Authorization).toBeUndefined();
  });
});
