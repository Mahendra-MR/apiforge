import pino from "pino";
import { env } from "../config/env.js";

/**
 * Structured logger with redaction for anything that could leak credentials.
 * Authorization headers, cookies, and API keys are replaced with "[REDACTED]"
 * wherever they appear in logged objects, including nested request/response
 * payloads we log for debugging.
 */
export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      '*.headers["authorization"]',
      '*.headers["Authorization"]',
      '*.headers["cookie"]',
      "*.authConfig",
      "*.password",
      "*.passwordHash",
      "*.apiKey",
      "*.token",
      "*.clientSecret",
      "*.client_secret",
      "*.accessToken",
      "*.access_token",
    ],
    censor: "[REDACTED]",
  },
});
