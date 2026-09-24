import { describe, expect, it } from "vitest";
import { exampleInputFromResponse, exampleToResponse } from "../src/lib/examples";
import type { RequestExample } from "../src/types";

describe("examples", () => {
  it("names an example after the response's status line", () => {
    const input = exampleInputFromResponse({
      status: 404,
      statusText: "Not Found",
      headers: { a: "b" },
      body: "{}",
      bodyJson: {},
      timeMs: 5,
      sizeBytes: 2,
    });
    expect(input).toEqual({ name: "404 Not Found", status: 404, statusText: "Not Found", headers: { a: "b" }, body: "{}", timeMs: 5, sizeBytes: 2 });
  });

  it("re-derives parsed JSON when viewing an example, and tolerates a non-JSON body", () => {
    const base: RequestExample = {
      id: "e1",
      requestId: "r1",
      name: "x",
      status: 200,
      statusText: "OK",
      headers: {},
      body: '{"ok":true}',
      timeMs: null,
      sizeBytes: null,
      createdAt: "",
      updatedAt: "",
    };
    expect(exampleToResponse(base)).toMatchObject({ bodyJson: { ok: true }, timeMs: 0, sizeBytes: 11 });
    expect(exampleToResponse({ ...base, body: "<html>" }).bodyJson).toBeNull();
  });
});
