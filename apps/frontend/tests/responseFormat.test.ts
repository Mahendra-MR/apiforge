import { describe, expect, it } from "vitest";
import { defaultFormatFor, formatBody, toBase64, toHexDump } from "../src/lib/responseFormat";

describe("responseFormat", () => {
  it("chooses a default format from the Content-Type", () => {
    expect(defaultFormatFor("application/json; charset=utf-8", null)).toBe("json");
    expect(defaultFormatFor("text/html", null)).toBe("html");
    expect(defaultFormatFor("application/xml", null)).toBe("xml");
    expect(defaultFormatFor("application/x-yaml", null)).toBe("yaml");
    expect(defaultFormatFor("application/javascript", null)).toBe("javascript");
    expect(defaultFormatFor("text/markdown", null)).toBe("markdown");
    expect(defaultFormatFor("text/plain", null)).toBe("raw");
    // No Content-Type, but the body parsed as JSON.
    expect(defaultFormatFor("", { a: 1 })).toBe("json");
  });

  it("renders a classic hex dump, 16 bytes per line with an ASCII column", () => {
    const dump = toHexDump("Hello, APIForge!!");
    expect(dump.split("\n")).toEqual([
      "00000000  48 65 6c 6c 6f 2c 20 41  50 49 46 6f 72 67 65 21  |Hello, APIForge!|",
      "00000010  21                                                |!|",
    ]);
  });

  it("base64-encodes UTF-8, not just Latin-1", () => {
    expect(toBase64("héllo")).toBe("aMOpbGxv");
  });

  it("pretty-prints JSON only when it parsed, and passes other languages through untouched", () => {
    expect(formatBody("json", '{"a":1}', { a: 1 })).toBe('{\n  "a": 1\n}');
    expect(formatBody("json", "not json", null)).toBe("not json");
    expect(formatBody("xml", "<a/>", null)).toBe("<a/>");
  });
});
