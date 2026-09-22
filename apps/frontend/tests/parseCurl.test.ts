import { describe, expect, it } from "vitest";
import { parseCurlCommand } from "../src/lib/parseCurl";

const FINERACT_EXAMPLE = `curl --location --request POST 'http://default.localhost:8443/fineract-provider/api/v1/leads/:leadId/clients/:clientId/qc-checks/initiate-all?leadId=&clientId=' \\
--header 'Accept: application/json, text/plain, */*' \\
--header 'Accept-Language: en-US,en;q=0.9' \\
--header 'Authorization: Basic bWlmb3M6RHJpZnRlcnNAMTIz' \\
--header 'Connection: keep-alive' \\
--header 'Fineract-Platform-TenantId: default' \\
--header 'Origin: http://localhost:4200' \\
--header 'Referer: http://localhost:4200/' \\
--header 'Sec-Fetch-Dest: empty' \\
--header 'Sec-Fetch-Mode: cors' \\
--header 'Sec-Fetch-Site: same-site' \\
--header 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36' \\
--header 'sec-ch-ua: "Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"' \\
--header 'sec-ch-ua-mobile: ?0' \\
--header 'sec-ch-ua-platform: "macOS"'`;

function headerValue(headers: [string, string][], key: string): string | undefined {
  return headers.find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
}

describe("parseCurlCommand — the pasted Fineract example", () => {
  it("extracts the method, base url, and query params from the URL", () => {
    const result = parseCurlCommand(FINERACT_EXAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.method).toBe("POST");
    expect(result.result.url).toBe(
      "http://default.localhost:8443/fineract-provider/api/v1/leads/:leadId/clients/:clientId/qc-checks/initiate-all",
    );
    expect(result.result.queryParams).toEqual([
      ["leadId", ""],
      ["clientId", ""],
    ]);
  });

  it("carries every non-Authorization header through, unescaped", () => {
    const result = parseCurlCommand(FINERACT_EXAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(headerValue(result.result.headers, "Accept")).toBe("application/json, text/plain, */*");
    expect(headerValue(result.result.headers, "Fineract-Platform-TenantId")).toBe("default");
    expect(headerValue(result.result.headers, "sec-ch-ua")).toBe('"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"');
    expect(headerValue(result.result.headers, "Authorization")).toBeUndefined();
  });

  it("decodes the Basic auth header into the Auth tab instead of leaving it as a header", () => {
    const result = parseCurlCommand(FINERACT_EXAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.authType).toBe("basic");
    expect(result.result.authConfig).toEqual({ username: "mifos", password: "Drifters@123" });
  });

  it("has no body", () => {
    const result = parseCurlCommand(FINERACT_EXAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bodyMode).toBe("none");
  });
});

describe("parseCurlCommand — method inference", () => {
  it("defaults to GET when there's no --request and no body", () => {
    const result = parseCurlCommand(`curl 'https://api.example.com/users'`);
    expect(result.ok && result.result.method).toBe("GET");
  });

  it("implies POST when --data is present but --request isn't", () => {
    const result = parseCurlCommand(`curl 'https://api.example.com/users' --data '{"name":"John"}'`);
    expect(result.ok && result.result.method).toBe("POST");
  });

  it("respects an explicit --request even without a body", () => {
    const result = parseCurlCommand(`curl --request DELETE 'https://api.example.com/users/1'`);
    expect(result.ok && result.result.method).toBe("DELETE");
  });
});

describe("parseCurlCommand — body detection", () => {
  it("detects a JSON body from its Content-Type header and pretty-prints it", () => {
    const result = parseCurlCommand(
      `curl --request POST 'https://api.example.com/users' --header 'Content-Type: application/json' --data '{"name":"John","age":30}'`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bodyMode).toBe("json");
    expect(JSON.parse(result.result.jsonBody)).toEqual({ name: "John", age: 30 });
  });

  it("detects a JSON body from its shape even without a Content-Type header", () => {
    const result = parseCurlCommand(`curl --request POST 'https://api.example.com/users' --data '{"name":"John"}'`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bodyMode).toBe("json");
  });

  it("detects a form-urlencoded body and splits it into rows", () => {
    const result = parseCurlCommand(
      `curl --request POST 'https://api.example.com/login' --data 'username=alice&password=secret'`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bodyMode).toBe("form-data");
    expect(result.result.formData).toEqual([
      ["username", "alice"],
      ["password", "secret"],
    ]);
  });

  it("falls back to a raw body for plain text", () => {
    const result = parseCurlCommand(`curl --request POST 'https://api.example.com/echo' --data 'hello world'`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bodyMode).toBe("raw");
    expect(result.result.rawBody).toBe("hello world");
  });
});

describe("parseCurlCommand — auth", () => {
  it("decodes a Bearer Authorization header", () => {
    const result = parseCurlCommand(`curl 'https://api.example.com' --header 'Authorization: Bearer abc123'`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.authType).toBe("bearer");
    expect(result.result.authConfig).toEqual({ token: "abc123" });
  });

  it("decodes -u/--user into Basic auth when there's no Authorization header", () => {
    const result = parseCurlCommand(`curl 'https://api.example.com' -u 'alice:secret'`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.authType).toBe("basic");
    expect(result.result.authConfig).toEqual({ username: "alice", password: "secret" });
  });

  it("leaves an unrecognized Authorization scheme as a plain header", () => {
    const result = parseCurlCommand(`curl 'https://api.example.com' --header 'Authorization: ApiKey xyz'`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.authType).toBe("none");
    expect(headerValue(result.result.headers, "Authorization")).toBe("ApiKey xyz");
  });
});

describe("parseCurlCommand — misc", () => {
  it("fails cleanly on empty input", () => {
    const result = parseCurlCommand("   ");
    expect(result.ok).toBe(false);
  });

  it("fails cleanly when no URL can be found", () => {
    const result = parseCurlCommand("curl --header 'Accept: application/json'");
    expect(result.ok).toBe(false);
  });

  it("accepts the URL via --url instead of positionally", () => {
    const result = parseCurlCommand(`curl --url 'https://api.example.com/ping'`);
    expect(result.ok && result.result.url).toBe("https://api.example.com/ping");
  });

  it("ignores boolean flags it doesn't model", () => {
    const result = parseCurlCommand(`curl --location --compressed --insecure -s -v 'https://api.example.com'`);
    // A bare-domain URL is normalized by the URL API to include the root path.
    expect(result.ok && result.result.url).toBe("https://api.example.com/");
  });

  it("skips an unrecognized flag that takes a value without mistaking the value for the URL", () => {
    const result = parseCurlCommand(`curl --connect-timeout 5 'https://api.example.com'`);
    expect(result.ok && result.result.url).toBe("https://api.example.com/");
  });
});
