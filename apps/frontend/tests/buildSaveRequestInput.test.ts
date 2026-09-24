import { describe, expect, it } from "vitest";
import { buildSaveRequestInput, savedRequestToInput } from "../src/lib/buildSaveRequestInput";
import { createEmptyAuthConfig } from "../src/types";
import type { RequestDraft } from "../src/types";

function row(key: string, value: string, enabled = true) {
  return { id: crypto.randomUUID(), key, value, enabled };
}

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

describe("buildSaveRequestInput", () => {
  it("builds a minimal input for a bare GET request", () => {
    const result = buildSaveRequestInput(makeDraft(), "Get users");
    expect(result).toEqual({
      ok: true,
      input: {
        name: "Get users",
        method: "GET",
        url: "https://api.example.com/users",
        headers: undefined,
        authType: "none",
        authConfig: undefined,
        bodyType: "none",
        body: undefined,
      },
    });
  });

  it("includes only enabled headers", () => {
    const draft = makeDraft({ headers: [row("X-On", "1"), row("X-Off", "2", false)] });
    const result = buildSaveRequestInput(draft, "Req");
    expect(result.ok && result.input.headers).toEqual({ "X-On": "1" });
  });

  it("parses a valid JSON body into an object", () => {
    const draft = makeDraft({ bodyMode: "json", jsonBody: '{"name":"John"}' });
    const result = buildSaveRequestInput(draft, "Req");
    expect(result).toEqual({ ok: true, input: expect.objectContaining({ bodyType: "json", body: { name: "John" } }) });
  });

  it("fails cleanly on an invalid JSON body", () => {
    const draft = makeDraft({ bodyMode: "json", jsonBody: "{not valid" });
    const result = buildSaveRequestInput(draft, "Req");
    expect(result.ok).toBe(false);
  });

  it("keeps a raw body as a plain string", () => {
    const draft = makeDraft({ bodyMode: "raw", rawBody: "plain text" });
    const result = buildSaveRequestInput(draft, "Req");
    expect(result.ok && result.input.body).toBe("plain text");
    expect(result.ok && result.input.bodyType).toBe("raw");
  });

  it("maps form-data rows to a record and 'form-data' to 'formData'", () => {
    const draft = makeDraft({ bodyMode: "form-data", formData: [row("name", "John")] });
    const result = buildSaveRequestInput(draft, "Req");
    expect(result.ok && result.input.bodyType).toBe("formData");
    expect(result.ok && result.input.body).toEqual({ name: "John" });
  });

  it("persists only the active auth type's config", () => {
    const draft = makeDraft({
      authType: "bearer",
      auth: { ...createEmptyAuthConfig(), bearer: { token: "abc" }, basic: { username: "u", password: "p" } },
    });
    const result = buildSaveRequestInput(draft, "Req");
    expect(result.ok && result.input.authConfig).toEqual({ token: "abc" });
  });

  it("persists query-param rows, keeping disabled ones and dropping blank rows", () => {
    const draft = makeDraft({ params: [row("page", "2"), row("debug", "1", false), row("", "")] });
    const result = buildSaveRequestInput(draft, "Req");
    expect(result.ok && result.input.queryParams).toEqual([
      { key: "page", value: "2", enabled: true },
      { key: "debug", value: "1", enabled: false },
    ]);
  });
});

describe("savedRequestToInput", () => {
  it("copies every stored field under the new name", () => {
    const input = savedRequestToInput(
      {
        id: "r1",
        collectionId: "c1",
        name: "Login",
        method: "POST",
        url: "{{baseUrl}}/login",
        queryParams: [{ key: "v", value: "2", enabled: true }],
        pathParams: null,
        headers: { "X-A": "1" },
        authType: "bearer",
        authConfig: { token: "t" },
        bodyType: "json",
        body: { a: 1 },
        createdAt: "",
        updatedAt: "",
      },
      "Login Copy",
    );
    expect(input).toEqual({
      name: "Login Copy",
      method: "POST",
      url: "{{baseUrl}}/login",
      queryParams: [{ key: "v", value: "2", enabled: true }],
      headers: { "X-A": "1" },
      authType: "bearer",
      authConfig: { token: "t" },
      bodyType: "json",
      body: { a: 1 },
    });
  });
});

