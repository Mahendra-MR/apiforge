import { z } from "zod";

/**
 * Central place for reading and validating process.env.
 * Fails fast on startup if required config is missing/invalid, instead of
 * surfacing confusing errors deep inside a request handler.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  /**
   * Path to the SQLite database file. Defaults to a local `data/` folder for
   * normal dev/server use; the Electron desktop shell overrides this to
   * `app.getPath('userData')/apiforge.db` so user data survives app updates.
   * `:memory:` is supported for tests/scratch runs.
   */
  DB_PATH: z.string().min(1).default("./data/apiforge.db"),

  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-sonnet-4-5"),

  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MAX_RESPONSE_BODY_BYTES: z.coerce.number().int().positive().default(5_000_000),

  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
