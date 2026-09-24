import type { CollectionTreeNode } from "./collectionsTree";
import type { ApiKeyAuthConfig, BasicAuthConfig, BearerAuthConfig, SavedRequest } from "../types";

/** Inverse of parsePostmanCollection.ts: turns one of our own folders (with its subfolders and saved requests) into a Postman Collection v2.1 export, so it can be sent to someone else or re-imported here or in actual Postman. Only the auth/body shapes this app understands are round-tripped faithfully — see the caveat surfaced in ShareCollectionModal. */

function exportAuth(request: SavedRequest): Record<string, unknown> | undefined {
  if (request.authType === "basic") {
    const { username, password } = (request.authConfig as BasicAuthConfig | null) ?? { username: "", password: "" };
    return { type: "basic", basic: [{ key: "username", value: username }, { key: "password", value: password }] };
  }
  if (request.authType === "bearer") {
    const { token } = (request.authConfig as BearerAuthConfig | null) ?? { token: "" };
    return { type: "bearer", bearer: [{ key: "token", value: token }] };
  }
  if (request.authType === "apiKey") {
    const { key, value, location } = (request.authConfig as ApiKeyAuthConfig | null) ?? { key: "", value: "", location: "header" };
    return { type: "apikey", apikey: [{ key: "key", value: key }, { key: "value", value }, { key: "in", value: location === "query" ? "query" : "header" }] };
  }
  // OAuth2 tokens are short-lived and this app doesn't store the flow config needed to refresh
  // them, so there's nothing meaningful to export — the request comes across as "no auth" rather
  // than carrying a token that will already be expired by the time it's imported elsewhere.
  return undefined;
}

function exportBody(request: SavedRequest): Record<string, unknown> | undefined {
  if (request.bodyType === "json" && request.body !== null && request.body !== undefined) {
    return { mode: "raw", raw: JSON.stringify(request.body, null, 2), options: { raw: { language: "json" } } };
  }
  if (request.bodyType === "raw" && typeof request.body === "string") {
    return { mode: "raw", raw: request.body };
  }
  if (request.bodyType === "formData" && request.body && typeof request.body === "object") {
    const formdata = Object.entries(request.body as Record<string, string>).map(([key, value]) => ({ key, value, type: "text" }));
    return { mode: "formdata", formdata };
  }
  return undefined;
}

function exportRequest(request: SavedRequest) {
  const header = request.headers ? Object.entries(request.headers).map(([key, value]) => ({ key, value })) : [];
  const auth = exportAuth(request);
  const body = exportBody(request);

  return {
    name: request.name,
    request: {
      method: request.method,
      header,
      url: { raw: request.url },
      ...(auth ? { auth } : {}),
      ...(body ? { body } : {}),
    },
  };
}

function exportNode(node: CollectionTreeNode): Record<string, unknown> {
  return {
    name: node.collection.name,
    item: [...node.children.map(exportNode), ...node.requests.map(exportRequest)],
  };
}

/** Wraps one folder's subtree in a standalone Postman Collection v2.1 document — the folder itself becomes the collection root, so sharing "Loan Accounts" produces a collection named "Loan Accounts", not the whole workspace. */
export function exportCollectionToPostman(node: CollectionTreeNode): object {
  return {
    info: {
      name: node.collection.name,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [...node.children.map(exportNode), ...node.requests.map(exportRequest)],
  };
}
