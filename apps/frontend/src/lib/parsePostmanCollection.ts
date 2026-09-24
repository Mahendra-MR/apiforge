import { HTTP_METHODS } from "../types";
import type { AuthType, BodyType, HttpMethod } from "../types";

export type ImportNode =
  | { type: "folder"; name: string; children: ImportNode[] }
  | {
      type: "request";
      name: string;
      method: HttpMethod;
      url: string;
      headers?: Record<string, string>;
      authType: AuthType;
      authConfig?: unknown;
      bodyType: BodyType;
      body?: unknown;
    };

export type ParsePostmanResult =
  | { ok: true; collectionName: string; nodes: ImportNode[] }
  | { ok: false; error: string };

function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value);
}

/** A Postman request's `url` is either a plain string or an object whose `raw` field is that same string — this app's own {{variable}} templating already matches Postman's, so the raw string carries over unchanged either way. */
function extractUrl(url: unknown): string {
  if (typeof url === "string") return url;
  if (url && typeof url === "object" && typeof (url as { raw?: unknown }).raw === "string") {
    return (url as { raw: string }).raw;
  }
  return "";
}

function extractHeaders(headerList: unknown): Record<string, string> | undefined {
  if (!Array.isArray(headerList)) return undefined;
  const entries = headerList
    .filter((h): h is { key: string; value: string; disabled?: boolean } => !!h && typeof h.key === "string" && !h.disabled)
    .map((h) => [h.key, String(h.value ?? "")] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Only Basic and Bearer are mapped to this app's Auth tab; anything else (API key, OAuth2, digest, "inherit from parent", …) is skipped rather than guessed at, so an import never silently invents credentials. */
function extractAuth(auth: unknown): { authType: AuthType; authConfig?: unknown } {
  if (!auth || typeof auth !== "object") return { authType: "none" };
  const type = (auth as { type?: unknown }).type;
  const fieldsFor = (key: string): { key: string; value: string }[] => {
    const list = (auth as Record<string, unknown>)[key];
    return Array.isArray(list) ? (list as { key: string; value: string }[]) : [];
  };
  const fieldValue = (fields: { key: string; value: string }[], key: string) =>
    fields.find((f) => f.key === key)?.value ?? "";

  if (type === "basic") {
    const fields = fieldsFor("basic");
    return { authType: "basic", authConfig: { username: fieldValue(fields, "username"), password: fieldValue(fields, "password") } };
  }
  if (type === "bearer") {
    const fields = fieldsFor("bearer");
    return { authType: "bearer", authConfig: { token: fieldValue(fields, "token") } };
  }
  return { authType: "none" };
}

/** Postman's `formdata` mode can include `type: "file"` entries — the export only stores a file's local path, not its bytes, so a file field can't be recreated here and is dropped rather than saved as a bogus text value. */
function extractBody(body: unknown): { bodyType: BodyType; body?: unknown } {
  if (!body || typeof body !== "object") return { bodyType: "none" };
  const mode = (body as { mode?: unknown }).mode;

  if (mode === "raw") {
    const raw = String((body as { raw?: unknown }).raw ?? "");
    const language = (body as { options?: { raw?: { language?: string } } }).options?.raw?.language;
    if (language === "json" || language === undefined) {
      try {
        return { bodyType: "json", body: JSON.parse(raw) };
      } catch {
        // fall through to raw text below
      }
    }
    return { bodyType: "raw", body: raw };
  }

  if (mode === "urlencoded" || mode === "formdata") {
    const list = (body as Record<string, unknown>)[mode];
    if (!Array.isArray(list)) return { bodyType: "none" };
    const entries = list
      .filter((f): f is { key: string; value?: string; disabled?: boolean; type?: string } => !!f && typeof f.key === "string" && !f.disabled && f.type !== "file")
      .map((f) => [f.key, String(f.value ?? "")] as const);
    return entries.length > 0 ? { bodyType: "formData", body: Object.fromEntries(entries) } : { bodyType: "none" };
  }

  return { bodyType: "none" };
}

function walkItems(items: unknown[]): ImportNode[] {
  const nodes: ImportNode[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const name = typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name : "Untitled";
    const children = (item as { item?: unknown }).item;

    if (Array.isArray(children)) {
      nodes.push({ type: "folder", name, children: walkItems(children) });
      continue;
    }

    const request = (item as { request?: unknown }).request;
    if (!request || typeof request !== "object") continue;

    const methodRaw = String((request as { method?: unknown }).method ?? "GET").toUpperCase();
    const { authType, authConfig } = extractAuth((request as { auth?: unknown }).auth);
    const { bodyType, body } = extractBody((request as { body?: unknown }).body);

    nodes.push({
      type: "request",
      name,
      method: isHttpMethod(methodRaw) ? methodRaw : "GET",
      url: extractUrl((request as { url?: unknown }).url),
      headers: extractHeaders((request as { header?: unknown }).header),
      authType,
      authConfig,
      bodyType,
      body,
    });
  }
  return nodes;
}

/**
 * Parses a Postman Collection v2.x export (the standard way to move a
 * folder of requests between API tools) into this app's own folder/request
 * shape. Pure and synchronous — no network or store access — so it can be
 * unit tested and previewed before anything is actually created.
 */
export function parsePostmanCollection(jsonText: string): ParsePostmanResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (!data || typeof data !== "object" || !("info" in data) || !("item" in data)) {
    return { ok: false, error: "That doesn't look like a Postman collection export (expected \"info\" and \"item\")." };
  }

  const info = (data as { info?: unknown }).info;
  const items = (data as { item?: unknown }).item;
  if (!Array.isArray(items)) {
    return { ok: false, error: "That doesn't look like a Postman collection export (\"item\" isn't a list)." };
  }

  const collectionName =
    info && typeof info === "object" && typeof (info as { name?: unknown }).name === "string"
      ? (info as { name: string }).name
      : "Imported collection";

  return { ok: true, collectionName, nodes: walkItems(items) };
}
