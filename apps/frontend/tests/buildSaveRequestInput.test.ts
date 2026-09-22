import { describe, expect, it } from "vitest";
import { buildSaveRequestInput } from "../src/lib/buildSaveRequestInput";
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
});
