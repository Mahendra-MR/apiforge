const SENSITIVE_HEADER_NAMES = new Set(["authorization", "cookie", "set-cookie", "x-api-key"]);

/**
 * Returns a copy of a headers map with sensitive values masked, safe to log
 * or echo back into places we don't fully trust (e.g. AI prompts).
 */
export function maskSensitiveHeaders(
  headers: Record<string, string> | undefined | null,
): Record<string, string> {
  if (!headers) return {};
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    masked[key] = SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return masked;
}

/**
 * Truncates a string to a maximum length, appending a marker so callers
 * (logs, AI prompts, history rows) know the value was cut short.
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}… [truncated, ${value.length} chars total]`;
}
