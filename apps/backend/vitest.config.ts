import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      // Every *Service test mocks src/db/pool.js entirely, so this is only ever
      // actually opened by tests/sqliteIntegration.test.ts, which deliberately
      // doesn't mock it — an in-memory DB keeps that test isolated and fast.
      DB_PATH: ":memory:",
      REQUEST_TIMEOUT_MS: "5000",
    },
  },
});
