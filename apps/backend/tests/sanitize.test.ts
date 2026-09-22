import { describe, expect, it } from "vitest";
import { maskSensitiveHeaders, truncate } from "../src/utils/sanitize.js";

describe("maskSensitiveHeaders", () => {
  it("masks Authorization regardless of casing", () => {
    const masked = maskSensitiveHeaders({ Authorization: "Bearer secret-token", "X-Request-Id": "abc" });
    expect(masked.Authorization).toBe("[REDACTED]");
    expect(masked["X-Request-Id"]).toBe("abc");
  });

  it("masks cookie headers", () => {
    const masked = maskSensitiveHeaders({ cookie: "session=abc123" });
    expect(masked.cookie).toBe("[REDACTED]");
  });

  it("returns an empty object for undefined input", () => {
    expect(maskSensitiveHeaders(undefined)).toEqual({});
  });

  it("leaves non-sensitive headers untouched", () => {
    const masked = maskSensitiveHeaders({ "Content-Type": "application/json" });
    expect(masked["Content-Type"]).toBe("application/json");
  });
});

describe("truncate", () => {
  it("returns the original string when under the limit", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("truncates and annotates strings over the limit", () => {
    const result = truncate("0123456789", 5);
    expect(result.startsWith("01234")).toBe(true);
    expect(result).toContain("truncated");
  });
});
