/**
 * APIForge doesn't have a login system yet (see the seeding in
 * `src/db/pool.ts`, run idempotently on every startup). Every
 * collection/environment is attributed to this single local user until real
 * multi-user auth exists.
 */
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
