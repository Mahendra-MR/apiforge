/** Response headers are case-insensitive on the wire, but this app stores them exactly as the server sent them, so lookups have to ignore case explicitly. */
export function getContentType(headers: Record<string, string>): string {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === "content-type");
  return key ? headers[key] : "";
}

export function isHtmlContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes("text/html");
}

export function isImageContentType(contentType: string): boolean {
  return contentType.toLowerCase().startsWith("image/");
}

/** Visualize renders best as a table over an array of objects — a single object or a scalar doesn't have rows to show. */
export function canVisualize(bodyJson: unknown): bodyJson is Record<string, unknown>[] {
  return Array.isArray(bodyJson) && bodyJson.length > 0 && bodyJson.every((row) => row !== null && typeof row === "object" && !Array.isArray(row));
}
