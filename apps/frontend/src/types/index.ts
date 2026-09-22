export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type BodyMode = "none" | "json" | "raw" | "form-data";

export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface FormDataRow extends KeyValueRow {}

export type AuthType = "none" | "bearer" | "basic" | "apiKey" | "oauth2";

export interface BearerAuthConfig {
  token: string;
}
export interface BasicAuthConfig {
  username: string;
  password: string;
}
export interface ApiKeyAuthConfig {
  key: string;
  value: string;
  location: "header" | "query";
}
export interface OAuth2AuthConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  /** Populated after "Get New Access Token" succeeds; not re-fetched automatically on every send. */
  accessToken: string | null;
  tokenType: string | null;
  obtainedAt: string | null;
}

/**
 * Holds the fields for every auth type at once (not just the active one) so
 * switching the Auth tab's type dropdown doesn't discard what the user
 * already typed into the others — matches how Postman's auth tab behaves.
 */
export interface AuthConfig {
  bearer: BearerAuthConfig;
  basic: BasicAuthConfig;
  apiKey: ApiKeyAuthConfig;
  oauth2: OAuth2AuthConfig;
}

export function createEmptyAuthConfig(): AuthConfig {
  return {
    bearer: { token: "" },
    basic: { username: "", password: "" },
    apiKey: { key: "", value: "", location: "header" },
    oauth2: { tokenUrl: "", clientId: "", clientSecret: "", scope: "", accessToken: null, tokenType: null, obtainedAt: null },
  };
}

/** The in-progress request a user is editing in the builder. */
export interface RequestDraft {
  id: string;
  /** Set once this draft has been saved into a collection; used by the Save button to know whether to create vs. update. */
  savedRequestId: string | null;
  collectionId: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyMode: BodyMode;
  jsonBody: string;
  rawBody: string;
  formData: FormDataRow[];
  authType: AuthType;
  auth: AuthConfig;
}

export interface ExecuteRequestPayload {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
  saveToHistory?: boolean;
  requestId?: string;
}

export interface ExecuteRequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyJson: unknown | null;
  timeMs: number;
  sizeBytes: number;
  historyId?: string;
}

export interface HistoryEntry {
  id: string;
  userId: string | null;
  requestId: string | null;
  method: HttpMethod;
  url: string;
  requestHeaders: Record<string, string> | null;
  requestBody: unknown;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: unknown;
  responseTimeMs: number | null;
  responseSizeBytes: number | null;
  error: string | null;
  executedAt: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  variables: EnvironmentVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BodyType = "none" | "json" | "raw" | "formData";

export interface SavedRequest {
  id: string;
  collectionId: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  queryParams: unknown;
  pathParams: unknown;
  headers: Record<string, string> | null;
  authType: AuthType;
  authConfig: unknown;
  bodyType: BodyType;
  body: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SaveRequestInput {
  name: string;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  authType?: AuthType;
  authConfig?: unknown;
  bodyType?: BodyType;
  body?: unknown;
}

export interface OAuth2TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number | null;
  scope: string | null;
  obtainedAt: string;
}
