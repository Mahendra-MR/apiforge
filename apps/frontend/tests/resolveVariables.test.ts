import { describe, expect, it } from "vitest";
import { resolveVariables } from "../src/lib/resolveVariables";

describe("resolveVariables", () => {
  it("replaces a known {{key}} with its value", () => {
    expect(resolveVariables("{{baseUrl}}/users", { baseUrl: "https://api.example.com" })).toBe(
      "https://api.example.com/users",
    );
  });

  it("replaces multiple occurrences of the same key", () => {
    expect(resolveVariables("{{host}}/a and {{host}}/b", { host: "example.com" })).toBe("example.com/a and example.com/b");
  });

  it("leaves an unknown key untouched so a typo stays visible", () => {
    expect(resolveVariables("{{missing}}/users", { baseUrl: "https://api.example.com" })).toBe("{{missing}}/users");
  });

  it("tolerates extra whitespace inside the braces", () => {
    expect(resolveVariables("{{ baseUrl }}/users", { baseUrl: "https://api.example.com" })).toBe(
      "https://api.example.com/users",
    );
  });

  it("returns the text unchanged when there are no variables to resolve", () => {
    expect(resolveVariables("https://api.example.com/users", {})).toBe("https://api.example.com/users");
  });
});
