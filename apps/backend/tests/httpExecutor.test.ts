import { afterEach, describe, expect, it, vi } from "vitest";
import { executeHttpRequest } from "../src/services/httpExecutor.js";
import { RequestExecutionError, RequestTimeoutError } from "../src/types/index.js";

function fakeResponse(init: { status?: number; statusText?: string; body?: string; headers?: Record<string, string> }) {
  return new Response(init.body ?? "", {
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    headers: init.headers ?? { "content-type": "application/json" },
  });
}

describe("executeHttpRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns a normalized result for a successful JSON response", async () => {
    const body = JSON.stringify({ users: [] });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fakeResponse({ status: 200, body })),
    );

    const result = await executeHttpRequest({ method: "GET", url: "https://api.example.com/users" });

    expect(result.status).toBe(200);
    expect(result.bodyJson).toEqual({ users: [] });
    expect(result.sizeBytes).toBe(Buffer.byteLength(body, "utf8"));
    expect(result.timeMs).toBeGreaterThanOrEqual(0);
  });

  it("leaves bodyJson null for non-JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fakeResponse({ status: 200, body: "plain text", headers: { "content-type": "text/plain" } })),
    );

    const result = await executeHttpRequest({ method: "GET", url: "https://api.example.com/ping" });

    expect(result.bodyJson).toBeNull();
    expect(result.body).toBe("plain text");
  });

  it("does not send a body for GET requests even if one is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await executeHttpRequest({ method: "GET", url: "https://api.example.com/x", body: '{"a":1}' });

    expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
  });

  it("wraps an aborted request in RequestTimeoutError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.reject(new DOMException("aborted", "AbortError"))),
    );

    await expect(
      executeHttpRequest({ method: "GET", url: "https://api.example.com/slow" }),
    ).rejects.toBeInstanceOf(RequestTimeoutError);
  });

  it("wraps other network failures in RequestExecutionError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    await expect(
      executeHttpRequest({ method: "GET", url: "https://api.example.com/down" }),
    ).rejects.toBeInstanceOf(RequestExecutionError);
  });

  it("rejects an invalid URL before attempting a network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(executeHttpRequest({ method: "GET", url: "not-a-url" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
