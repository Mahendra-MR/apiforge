import type { ApiErrorBody } from "../types";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message || `Request failed with status ${status}`);
    this.name = "ApiClientError";
  }
}

/**
 * Thin fetch wrapper for the APIForge backend. Requests go to the same
 * origin (`/api/...`); Vite's dev proxy forwards them to the backend so no
 * base URL or CORS configuration is needed in development.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiClientError(response.status, data as ApiErrorBody);
  }

  return data as T;
}
