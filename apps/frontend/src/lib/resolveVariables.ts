const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/** Replaces every `{{key}}` occurrence in `text` with the matching value from `variables`. Unknown keys are left as-is (so a typo is visible rather than silently becoming empty). */
export function resolveVariables(text: string, variables: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, key: string) => (key in variables ? variables[key] : match));
}
