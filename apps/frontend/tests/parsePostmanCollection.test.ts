import { describe, expect, it } from "vitest";
import { parsePostmanCollection } from "../src/lib/parsePostmanCollection";

function collection(item: unknown[], name = "My Collection") {
  return JSON.stringify({ info: { name }, item });
}

describe("parsePostmanCollection", () => {
  it("rejects invalid JSON", () => {
    const result = parsePostmanCollection("{not json");
    expect(result.ok).toBe(false);
  });

  it("rejects a JSON file that isn't a Postman collection", () => {
    const result = parsePostmanCollection(JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
  });

  it("reads the collection name and builds a folder/request tree", () => {
    const result = parsePostmanCollection(
      collection(
        [
          {
            name: "Users",
            item: [{ name: "Get users", request: { method: "GET", url: "https://api.example.com/users" } }],
          },
        ],
        "Fineract API",
      ),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.collectionName).toBe("Fineract API");
    expect(result.nodes).toEqual([
      {
        type: "folder",
        name: "Users",
        children: [
          {
            type: "request",
            name: "Get users",
            method: "GET",
            url: "https://api.example.com/users",
            headers: undefined,
            authType: "none",
            authConfig: undefined,
            bodyType: "none",
            body: undefined,
          },
        ],
      },
    ]);
  });

  it("extracts the raw url from an object-shaped url", () => {
    const result = parsePostmanCollection(
      collection([{ name: "Req", request: { method: "GET", url: { raw: "https://api.example.com/x?y=1" } } }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ url: "https://api.example.com/x?y=1" });
  });

  it("falls back to GET for an unrecognized method", () => {
    const result = parsePostmanCollection(collection([{ name: "Req", request: { method: "WEIRD", url: "https://x" } }]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ method: "GET" });
  });

  it("drops disabled headers and keeps the rest", () => {
    const result = parsePostmanCollection(
      collection([
        {
          name: "Req",
          request: {
            method: "GET",
            url: "https://x",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "X-Old", value: "nope", disabled: true },
            ],
          },
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ headers: { Accept: "application/json" } });
  });

  it("decodes Basic auth into the app's auth config shape", () => {
    const result = parsePostmanCollection(
      collection([
        {
          name: "Req",
          request: {
            method: "GET",
            url: "https://x",
            auth: { type: "basic", basic: [{ key: "username", value: "mifos" }, { key: "password", value: "Drifters@123" }] },
          },
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ authType: "basic", authConfig: { username: "mifos", password: "Drifters@123" } });
  });

  it("decodes Bearer auth", () => {
    const result = parsePostmanCollection(
      collection([{ name: "Req", request: { method: "GET", url: "https://x", auth: { type: "bearer", bearer: [{ key: "token", value: "abc123" }] } } }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ authType: "bearer", authConfig: { token: "abc123" } });
  });

  it("skips auth types it doesn't model, like API key or inherited auth", () => {
    const result = parsePostmanCollection(
      collection([{ name: "Req", request: { method: "GET", url: "https://x", auth: { type: "apikey", apikey: [{ key: "key", value: "X-Api-Key" }] } } }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ authType: "none" });
  });

  it("parses a raw JSON body", () => {
    const result = parsePostmanCollection(
      collection([{ name: "Req", request: { method: "POST", url: "https://x", body: { mode: "raw", raw: '{"name":"John"}', options: { raw: { language: "json" } } } } }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ bodyType: "json", body: { name: "John" } });
  });

  it("falls back to a raw text body when raw content isn't valid JSON", () => {
    const result = parsePostmanCollection(
      collection([{ name: "Req", request: { method: "POST", url: "https://x", body: { mode: "raw", raw: "plain text", options: { raw: { language: "json" } } } } }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ bodyType: "raw", body: "plain text" });
  });

  it("parses a urlencoded body into form-data", () => {
    const result = parsePostmanCollection(
      collection([
        {
          name: "Req",
          request: {
            method: "POST",
            url: "https://x",
            body: { mode: "urlencoded", urlencoded: [{ key: "a", value: "1" }, { key: "b", value: "2", disabled: true }] },
          },
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ bodyType: "formData", body: { a: "1" } });
  });

  it("drops file fields in a formdata body since the file content isn't in the export", () => {
    const result = parsePostmanCollection(
      collection([
        {
          name: "Req",
          request: {
            method: "POST",
            url: "https://x",
            body: {
              mode: "formdata",
              formdata: [
                { key: "tag", value: "PD_DOCUMENT", type: "text" },
                { key: "file", value: "", type: "file" },
              ],
            },
          },
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).toMatchObject({ bodyType: "formData", body: { tag: "PD_DOCUMENT" } });
  });

  it("nests folders inside folders arbitrarily deep", () => {
    const result = parsePostmanCollection(
      collection([
        {
          name: "Outer",
          item: [
            {
              name: "Inner",
              item: [{ name: "Req", request: { method: "GET", url: "https://x" } }],
            },
          ],
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outer = result.nodes[0];
    expect(outer.type).toBe("folder");
    if (outer.type !== "folder") return;
    const inner = outer.children[0];
    expect(inner.type).toBe("folder");
  });
});
