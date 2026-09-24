/** How the response body is displayed — Postman's body-format dropdown. The first group are syntax-highlighted languages; the rest are encodings of the raw bytes. */
export type ResponseFormat = "json" | "xml" | "html" | "yaml" | "javascript" | "markdown" | "raw" | "hex" | "base64";

export const LANGUAGE_FORMATS: ResponseFormat[] = ["json", "xml", "html", "yaml", "javascript", "markdown"];
export const ENCODING_FORMATS: ResponseFormat[] = ["raw", "hex", "base64"];

export const FORMAT_LABEL: Record<ResponseFormat, string> = {
  json: "JSON",
  xml: "XML",
  html: "HTML",
  yaml: "YAML",
  javascript: "JavaScript",
  markdown: "Markdown",
  raw: "Raw",
  hex: "Hex",
  base64: "Base64",
};

/** Picks the format a response most likely wants from its Content-Type, falling back to JSON when the body parsed as JSON anyway. */
export function defaultFormatFor(contentType: string, bodyJson: unknown): ResponseFormat {
  const type = contentType.toLowerCase();
  if (type.includes("json") || (bodyJson !== null && bodyJson !== undefined)) return "json";
  if (type.includes("html")) return "html";
  if (type.includes("xml")) return "xml";
  if (type.includes("yaml") || type.includes("yml")) return "yaml";
  if (type.includes("javascript") || type.includes("ecmascript")) return "javascript";
  if (type.includes("markdown")) return "markdown";
  return "raw";
}

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Classic hex dump: 8-digit offset, 16 bytes per line in two groups of 8, then the printable-ASCII column. */
export function toHexDump(text: string): string {
  const bytes = utf8Bytes(text);
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const chunk = Array.from(bytes.slice(offset, offset + 16));
    const hex = chunk.map((b) => b.toString(16).padStart(2, "0"));
    const left = hex.slice(0, 8).join(" ").padEnd(23, " ");
    const right = hex.slice(8).join(" ").padEnd(23, " ");
    const ascii = chunk.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
    lines.push(`${offset.toString(16).padStart(8, "0")}  ${left}  ${right}  |${ascii}|`);
  }
  return lines.join("\n");
}

/** Base64 of the body's UTF-8 bytes (btoa alone only handles Latin-1). */
export function toBase64(text: string): string {
  let binary = "";
  for (const byte of utf8Bytes(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** The text to show for `format`: JSON is pretty-printed when it parses; encodings transform the raw body; other languages show the body as sent. */
export function formatBody(format: ResponseFormat, body: string, bodyJson: unknown): string {
  switch (format) {
    case "json":
      return bodyJson !== null && bodyJson !== undefined ? JSON.stringify(bodyJson, null, 2) : body;
    case "hex":
      return toHexDump(body);
    case "base64":
      return toBase64(body);
    default:
      return body;
  }
}
