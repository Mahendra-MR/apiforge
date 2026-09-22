/**
 * Manual entry point for creating/upgrading the SQLite database file without
 * starting the full server — schema application is otherwise just a side
 * effect of importing `./pool.js` (idempotent `CREATE TABLE IF NOT EXISTS`),
 * so this is mainly useful for scripting and for the desktop packaging step.
 */
import { env } from "../config/env.js";
import "./pool.js";

// eslint-disable-next-line no-console
console.log(`Database ready at ${env.DB_PATH}`);
