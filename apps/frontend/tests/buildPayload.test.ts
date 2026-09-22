import { describe, expect, it } from "vitest";
import { buildExecutePayload, buildUrlWithParams } from "../src/lib/buildPayload";
import { createEmptyAuthConfig } from "../src/types";
import type { RequestDraft } from "../src/types";

function makeDraft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    id: "draft-1",
    savedRequestId: null,
    collectionId: null,
    name: "Untitled request",
    method: "GET",
    url: "https://api.example.com/users",
    params: [],
    headers: [],
    bodyMode: "none",
    jsonBody: "",
    rawBody: "",
    formData: [],
    authType: "none",
    auth: createEmptyAuthConfig(),
    ...overrides,
  };
}

function row(key: string, value: string, enabled = true) {
  return { id: crypto.randomUUID(), key, value, enabled };
}

describe("buildUrlWithParams", () => {
  it("returns the url unchanged when there are no enabled params", () => {
    const draft = makeDraft({ params: [row("", "", true)] });
    expect(buildUrlWithParams(draft)).toBe("https://api.example.com/users");
  });

  it("appends enabled params as a query string", () => {
    const draft = makeDraft({ params: [row("active", "true"), row("limit", "10")] });
    const url = new URL(buildUrlWithParams(draft));
    expect(url.searchParams.get("active")).toBe("true");
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("ignores disabled or empty-key rows", () => {
    const draft = makeDraft({ params: [row("skip", "x", false), row("", "y", true)] });
    expect(buildUrlWithParams(draft)).toBe("https://api.example.com/users");
  });

  it("preserves an existing query string on the base url", () => {
    const draft = makeDraft({ url: "https://api.example.com/users?existing=1", params: [row("new", "2")] });
    const url = new URL(buildUrlWithParams(draft));
    expect(url.searchParams.get("existing")).toBe("1");
    expect(url.searchParams.get("new")).toBe("2");
  });

  it("falls back to manual concatenation for an unresolved {{variable}} url", () => {
    const draft = makeDraft({ url: "{{baseUrl}}/users", params: [row("id", "5")] });
    expect(buildUrlWithParams(draft)).toBe("{{baseUrl}}/users?id=5");
  });
});

describe("buildExecutePayload", () => {
  it("builds a plain GET payload with no body", () => {
    const payload = buildExecutePayload(makeDraft());
    expect(payload).toMatchObject({ method: "GET", url: "https://api.example.com/users", body: null });
  });

  it("includes only enabled headers", () => {
    const draft = makeDraft({ headers: [row("X-On", "1"), row("X-Off", "2", false)] });
    const payload = buildExecutePayload(draft);
    expect(payload.headers).toEqual({ "X-On": "1" });
  });

  it("adds a JSON content-type header and passes the JSON body through", () => {
    const draft = makeDraft({ method: "POST", bodyMode: "json", jsonBody: '{"name":"John"}' });
    const payload = buildExecutePayload(draft);
    expect(payload.headers?.["Content-Type"]).toBe("application/json");
    expect(payload.body).toBe('{"name":"John"}');
  });

  it("does not override an explicit content-type header", () => {
    const draft = makeDraft({
      bodyMode: "json",
      jsonBody: "{}",
      headers: [row("Content-Type", "application/vnd.api+json")],
    });
    const payload = buildExecutePayload(draft);
    expect(payload.headers?.["Content-Type"]).toBe("application/vnd.api+json");
  });

  it("url-encodes enabled form-data rows", () => {
    const draft = makeDraft({
      bodyMode: "form-data",
      formData: [row("name", "John Doe"), row("skip", "x", false)],
    });
    const payload = buildExecutePayload(draft);
    expect(payload.body).toBe("name=John%20Doe");
    expect(payload.headers?.["Content-Type"]).toBe("application/x-www-form-urlencoded");
  });

  it("returns a null body for an empty raw body", () => {
    const draft = makeDraft({ bodyMode: "raw", rawBody: "   " });
    expect(buildExecutePayload(draft).body).toBeNull();
  });

  it("passes the saved request's id through as requestId", () => {
    const draft = makeDraft({ savedRequestId: "req-1" });
    expect(buildExecutePayload(draft).requestId).toBe("req-1");
  });

  it("resolves {{variables}} in the url, headers, and body", () => {
    const draft = makeDraft({
      url: "{{baseUrl}}/users",
      headers: [row("X-Env", "{{env}}")],
      bodyMode: "json",
      jsonBody: '{"host":"{{baseUrl}}"}',
    });
    const payload = buildExecutePayload(draft, { baseUrl: "https://api.example.com", env: "staging" });

    expect(payload.url).toBe("https://api.example.com/users");
    expect(payload.headers?.["X-Env"]).toBe("staging");
    expect(payload.body).toBe('{"host":"https://api.example.com"}');
  });

  it("applies bearer auth on top of the resolved headers", () => {
    const draft = makeDraft({
      authType: "bearer",
      auth: { ...createEmptyAuthConfig(), bearer: { token: "{{token}}" } },
    });
    const payload = buildExecutePayload(draft, { token: "abc123" });
    expect(payload.headers?.Authorization).toBe("Bearer abc123");
  });

  it("adds an apiKey auth value to the query string", () => {
    const draft = makeDraft({
      authType: "apiKey",
      auth: { ...createEmptyAuthConfig(), apiKey: { key: "api_key", value: "k-1", location: "query" } },
    });
    const payload = buildExecutePayload(draft);
    expect(new URL(payload.url).searchParams.get("api_key")).toBe("k-1");
  });
});
