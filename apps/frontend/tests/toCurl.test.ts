import { describe, expect, it } from "vitest";
import { parseCurlCommand } from "../src/lib/parseCurl";
import { payloadToCurl } from "../src/lib/toCurl";

describe("payloadToCurl", () => {
  it("renders a GET without --request, one --header per line, like Postman's snippet", () => {
    const curl = payloadToCurl({
      method: "GET",
      url: "http://localhost:8443/fineract-provider/api/v1/client-calls/client/2403",
      headers: { "Fineract-Platform-TenantId": "default", Authorization: "Basic bWlmb3M6cGFzc3dvcmQ=" },
      body: null,
    });

    expect(curl).toBe(
      [
        "curl --location 'http://localhost:8443/fineract-provider/api/v1/client-calls/client/2403' \\",
        "--header 'Fineract-Platform-TenantId: default' \\",
        "--header 'Authorization: Basic bWlmb3M6cGFzc3dvcmQ='",
      ].join("\n"),
    );
  });

  it("adds --request and --data for a request with a body", () => {
    const curl = payloadToCurl({
      method: "POST",
      url: "https://api.example.com/users",
      headers: { "Content-Type": "application/json" },
      body: '{"name":"Ada"}',
    });

    expect(curl).toContain("curl --location --request POST 'https://api.example.com/users'");
    expect(curl).toContain(`--data '{"name":"Ada"}'`);
  });

  it("escapes single quotes so the command is still valid shell", () => {
    const curl = payloadToCurl({ method: "POST", url: "https://x.test", headers: {}, body: "it's" });
    expect(curl).toContain(`--data 'it'\\''s'`);
  });

  it("round-trips through the cURL paste parser", () => {
    const curl = payloadToCurl({
      method: "PUT",
      url: "https://api.example.com/items/7?expand=true",
      headers: { "X-Trace": "abc" },
      body: '{"ok":true}',
    });

    const parsed = parseCurlCommand(curl);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.result.method).toBe("PUT");
    expect(parsed.result.url).toBe("https://api.example.com/items/7");
    expect(parsed.result.queryParams).toEqual([["expand", "true"]]);
    expect(parsed.result.headers).toContainEqual(["X-Trace", "abc"]);
    expect(parsed.result.jsonBody).toContain('"ok"');
  });
});
