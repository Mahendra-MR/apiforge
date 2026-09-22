import type { BodyMode, BodyType } from "../types";

/** Maps the frontend's hyphenated BodyMode to the backend's camelCase BodyType enum, and back. */
export function bodyModeToBodyType(mode: BodyMode): BodyType {
  return mode === "form-data" ? "formData" : mode;
}

export function bodyTypeToBodyMode(type: BodyType): BodyMode {
  return type === "formData" ? "form-data" : type;
}
