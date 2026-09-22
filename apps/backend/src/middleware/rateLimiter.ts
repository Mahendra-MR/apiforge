import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Rate limiter for AI endpoints specifically (they're the expensive,
 * externally-billed ones). Request execution and CRUD routes are not
 * limited in the MVP.
 */
export const aiRateLimiter = rateLimit({
  windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  limit: env.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMITED", message: "Too many AI requests. Please slow down." },
});
