import { describe, expect, it } from "vitest";
import { InvalidRequestUrlError, validateRequestUrl } from "../src/utils/validateUrl.js";

describe("validateRequestUrl", () => {
  it("accepts a well-formed https URL", () => {
    const url = validateRequestUrl("https://api.example.com/users?active=true");
    expect(url.hostname).toBe("api.example.com");
  });

  it("accepts http and localhost, since testing local APIs is a core use case", () => {
    expect(() => validateRequestUrl("http://localhost:3000/health")).not.toThrow();
  });

  it("rejects a malformed URL", () => {
    expect(() => validateRequestUrl("not a url")).toThrow(InvalidRequestUrlError);
  });

  it("rejects non-http(s) protocols", () => {
    expect(() => validateRequestUrl("ftp://example.com/file")).toThrow(InvalidRequestUrlError);
  });

  it("rejects an empty string", () => {
    expect(() => validateRequestUrl("")).toThrow(InvalidRequestUrlError);
  });
});
