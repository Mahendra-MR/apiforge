export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface ExecuteRequestInput {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  /** Pre-serialized body. Undefined/null for methods that carry no body. */
  body?: string | null;
}

export interface ExecuteRequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  /** Best-effort parse of `body` as JSON, when the response looks like JSON. */
  bodyJson: unknown | null;
  timeMs: number;
  sizeBytes: number;
}

export class RequestExecutionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RequestExecutionError";
  }
}

export class RequestTimeoutError extends RequestExecutionError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
  }
}
