import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { CircularCollectionMoveError } from "../services/collectionsService.js";
import { OAuth2TokenError } from "../services/oauth2Service.js";
import { RequestExecutionError, RequestTimeoutError } from "../types/index.js";
import { InvalidRequestUrlError } from "../utils/validateUrl.js";
import { logger } from "../utils/logger.js";

/** Thrown by route handlers for expected, user-facing failures (400/404/etc). */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` });
}

/**
 * Central error handler. Maps known error types to sensible HTTP statuses
 * and always returns a consistent { error, message } shape. Unexpected
 * errors are logged with full detail server-side but never leak internals
 * (stack traces, DB errors) to the client.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: "REQUEST_ERROR", message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request failed validation",
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof InvalidRequestUrlError) {
    res.status(400).json({ error: "INVALID_URL", message: err.message });
    return;
  }

  if (err instanceof CircularCollectionMoveError) {
    res.status(400).json({ error: "CIRCULAR_MOVE", message: err.message });
    return;
  }

  if (err instanceof OAuth2TokenError) {
    res.status(502).json({ error: "OAUTH2_TOKEN_ERROR", message: err.message });
    return;
  }

  if (err instanceof RequestTimeoutError) {
    res.status(504).json({ error: "REQUEST_TIMEOUT", message: err.message });
    return;
  }

  if (err instanceof RequestExecutionError) {
    res.status(502).json({ error: "UPSTREAM_ERROR", message: err.message });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Something went wrong" });
}
