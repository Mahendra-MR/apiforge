import { describe, expect, it } from "vitest";
import { exportCollectionToPostman } from "../src/lib/exportPostmanCollection";
import { parsePostmanCollection } from "../src/lib/parsePostmanCollection";
import { buildCollectionsTree } from "../src/lib/collectionsTree";
import type { Collection, SavedRequest } from "../src/types";

function folder(overrides: Partial<Collection> = {}): Collection {
  return {
    id: "c1",
    userId: "u1",
    name: "Loan Accounts",
    description: null,
    parentId: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function request(overrides: Partial<SavedRequest> = {}): SavedRequest {
  return {
    id: "r1",
    collectionId: "c1",
    name: "Get loan by id",
    method: "GET",
    url: "{{baseUrl}}/loans/{{loanId}}",
    queryParams: null,
    pathParams: null,
    headers: { Accept: "application/json" },
    authType: "basic",
    authConfig: { username: "admin", password: "secret" },
    bodyType: "none",
    body: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("exportCollectionToPostman", () => {
  it("names the exported collection after the folder, not the whole workspace", () => {
    const tree = buildCollectionsTree([folder()], []);
    const exported = exportCollectionToPostman(tree[0]) as { info: { name: string } };
    expect(exported.info.name).toBe("Loan Accounts");
  });

  it("only includes this folder's own subtree", () => {
    const collections = [folder({ id: "c1", name: "Loan Accounts" }), folder({ id: "c2", name: "Clients", parentId: null })];
    const tree = buildCollectionsTree(collections, [request({ collectionId: "c1" })]);
    const loanAccounts = tree.find((n) => n.collection.id === "c1")!;

    const exported = exportCollectionToPostman(loanAccounts) as { item: { name: string }[] };
    expect(exported.item).toHaveLength(1);
    expect(exported.item[0].name).toBe("Get loan by id");
  });

  it("maps basic auth into Postman's basic auth shape", () => {
    const tree = buildCollectionsTree([folder()], [request()]);
    const exported = exportCollectionToPostman(tree[0]) as { item: { request: { auth: { type: string; basic: { key: string; value: string }[] } } }[] };
    const auth = exported.item[0].request.auth;
    expect(auth.type).toBe("basic");
    expect(auth.basic).toEqual([{ key: "username", value: "admin" }, { key: "password", value: "secret" }]);
  });

  it("drops oauth2 auth rather than exporting an already-expired token", () => {
    const tree = buildCollectionsTree(
      [folder()],
      [request({ authType: "oauth2", authConfig: { accessToken: "abc" } })],
    );
    const exported = exportCollectionToPostman(tree[0]) as { item: { request: { auth?: unknown } }[] };
    expect(exported.item[0].request.auth).toBeUndefined();
  });

  it("maps a JSON body to a raw/json Postman body", () => {
    const tree = buildCollectionsTree([folder()], [request({ bodyType: "json", body: { amount: 100 } })]);
    const exported = exportCollectionToPostman(tree[0]) as { item: { request: { body: { mode: string; raw: string } } }[] };
    expect(exported.item[0].request.body.mode).toBe("raw");
    expect(JSON.parse(exported.item[0].request.body.raw)).toEqual({ amount: 100 });
  });

  it("round-trips through the app's own Postman importer", () => {
    const tree = buildCollectionsTree([folder()], [request()]);
    const exported = exportCollectionToPostman(tree[0]);

    const reimported = parsePostmanCollection(JSON.stringify(exported));

    expect(reimported.ok).toBe(true);
    if (!reimported.ok) return;
    expect(reimported.collectionName).toBe("Loan Accounts");
    expect(reimported.nodes).toEqual([
      {
        type: "request",
        name: "Get loan by id",
        method: "GET",
        url: "{{baseUrl}}/loans/{{loanId}}",
        headers: { Accept: "application/json" },
        authType: "basic",
        authConfig: { username: "admin", password: "secret" },
        bodyType: "none",
        body: undefined,
      },
    ]);
  });
});
