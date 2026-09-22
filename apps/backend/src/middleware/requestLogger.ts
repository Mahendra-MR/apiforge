import type { IncomingMessage, ServerResponse } from "http";
import { pinoHttp } from "pino-http";
import { logger } from "../utils/logger.js";

/**
 * HTTP access logger. Uses the same redacting logger as the rest of the app
 * so Authorization headers never hit stdout/log files, even for
 * request-level logging middleware.
 */
export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
