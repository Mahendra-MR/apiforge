# APIForge AI

A lightweight, AI-assisted API testing and development platform — a leaner alternative to Postman with an integrated AI assistant. This repo is being built incrementally; see [Build Phases](#build-phases) for what's done and what's next.

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS, TanStack Query for server state, Zustand for the request-draft/theme UI state, CodeMirror 6 for JSON editing and response viewing, react-resizable-panels, react-router-dom, react-hot-toast.
- **Backend**: Node.js + Express + TypeScript, acting as a secure server-side proxy for executing API requests (so the browser never has to fight CORS) and as the persistence/API layer for history, collections, environments, and (later) AI features.
- **Database**: embedded SQLite via `better-sqlite3` — a single file (`DB_PATH`, default `./data/apiforge.db`), schema applied automatically on startup (`CREATE TABLE IF NOT EXISTS`, see `src/db/schema.ts`). No separate database service to install or run.
- **Desktop**: `apps/desktop` wraps the same Express backend and React frontend in Electron, packaged for macOS with `electron-builder` — see Phase 3 below.
- **AI**: Anthropic Claude API, called only from the backend behind an `AIService` abstraction (not yet implemented — see Phase 4 below).

### Database history: Postgres → SQLite

Phase 1 and 2 used PostgreSQL (via `pg` + hand-written `node-pg-migrate` migrations — chosen over Prisma originally because Prisma's CLI downloads a native query-engine binary from a host blocked by this build environment's network policy). Phase 3 replaced this entirely with embedded SQLite (`better-sqlite3`), so the desktop app has nothing extra to install or run. This was a full cutover, not a dual backend: ids and timestamps are now generated in application code (`src/db/ids.ts`) rather than via Postgres defaults/triggers, `ANY($1)` array queries became `IN (?, ?, ...)`, and `ILIKE` became SQLite's (already case-insensitive) `LIKE`. See the project's build-notes doc for the full list of conversions if you're auditing the diff.

## Getting started

```bash
# 1. Install dependencies (root workspace covers all three apps)
npm install

# 2. Configure the backend (optional — sensible defaults work out of the box)
cp .env.example apps/backend/.env
# edit apps/backend/.env to change DB_PATH, or add ANTHROPIC_API_KEY once the
# AI features land (Phase 4)

# 3. Run both apps in dev mode (two terminals)
npm run dev:backend    # http://localhost:4000 — creates ./apps/backend/data/apiforge.db on first run
npm run dev:frontend   # http://localhost:5173 (proxies /api to the backend)
```

Open http://localhost:5173 — the frontend's Vite dev server proxies `/api/*` to the backend, so no CORS configuration is needed locally. There's no database service to start first: the SQLite file and its schema are created automatically.

### Tests

```bash
npm test              # backend + frontend
npm run test:backend  # vitest + supertest (unit + integration, plus one real-SQLite integration test)
npm run test:frontend # vitest + React Testing Library
npm run typecheck     # strict TypeScript across both apps
```

### Desktop app (macOS)

```bash
npm run dev:desktop    # builds backend+frontend, then launches the Electron shell against them
npm run dist:mac       # builds backend+frontend, then packages a .dmg/.zip via electron-builder
```

The packaged app is **unsigned** (no Apple Developer account yet — see Phase 3 below), so macOS Gatekeeper will block it on first launch. Right-click the app → Open (and confirm), or go to System Settings → Privacy & Security → "Open Anyway" after the first blocked attempt. This is a one-time step per machine.

## Project layout

```
apiforge-ai/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/       # env validation (zod)
│   │   │   ├── db/           # better-sqlite3 pool shim, schema.ts, id/timestamp helpers
│   │   │   ├── middleware/   # error handling, request logging, rate limiting
│   │   │   ├── routes/       # /api/requests, /api/history, ...
│   │   │   ├── services/     # httpExecutor (the proxy), historyService
│   │   │   ├── types/
│   │   │   └── utils/        # header redaction, URL validation
│   │   └── tests/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── api/          # typed fetch wrappers (requests, history, environments, collections, auth)
│   │   │   ├── components/   # layout, request-builder (incl. Auth tab), response-viewer, history, collections, environments, common
│   │   │   ├── hooks/        # TanStack Query hooks
│   │   │   ├── lib/          # pure helpers (payload building, variable resolution, auth application, collections tree, curl parsing, formatting, cookie parsing)
│   │   │   ├── store/        # Zustand: request draft (incl. auth config), theme
│   │   │   └── types/
│   │   └── tests/
│   └── desktop/
│       ├── main.js           # Electron main process — embeds the backend + serves the built frontend on one port
│       ├── build/icon.png    # app icon source (electron-builder generates .icns from this)
│       ├── backend/          # generated by `copy-embed` (gitignored) — copy of apps/backend/dist
│       ├── frontend/         # generated by `copy-embed` (gitignored) — copy of apps/frontend/dist
│       └── package.json      # electron-builder config lives in the "build" field
```

## Security notes (current phase)

- Authorization/Cookie header values are redacted from all backend logs (`src/utils/logger.ts`, `src/utils/sanitize.ts`) — verified end-to-end during testing (a request sent with a Bearer token never appears in the log file).
- Request/response bodies are capped (`MAX_RESPONSE_BODY_BYTES`) and requests time out (`REQUEST_TIMEOUT_MS`) so a slow or huge upstream response can't hang or balloon the backend.
- `validateRequestUrl` intentionally allows `localhost`/private-network hosts — testing your own local API is a core use case for this tool. If this backend is ever deployed as a shared multi-tenant service rather than run locally by each developer, add an SSRF allowlist/denylist there first.
- No secrets are hardcoded; `.env` is git-ignored; `.env.example` documents every variable.
- AI endpoints are rate-limited (`aiRateLimiter` middleware, ready for Phase 3) and no AI provider key is ever sent to the frontend.
- OAuth2 client secrets and access/bearer tokens are redacted from backend logs the same way Authorization headers are (`*.clientSecret`, `*.client_secret`, `*.accessToken`, `*.access_token` in `src/utils/logger.ts`'s redact paths) — the client-credentials token exchange happens server-side (`POST /api/auth/oauth2/token`) specifically so the secret never has to be logged or sent anywhere from the browser.
- Environment variables marked "secret" are masked (password-style) in the Environment Manager UI by default, with an explicit reveal toggle per variable; this is a display convenience, not encryption — the values are still stored in plain text in the SQLite database file, matching the "single local user, no auth system yet" scope of this phase.
- The SQLite database file itself has no encryption or OS-level access control beyond normal file permissions — appropriate for a local, single-user desktop tool, but worth knowing if the machine is shared.

## Build phases

**Phase 1 — done.** API request builder (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS, query params, headers, JSON/raw/form-data body), a secure backend proxy that executes requests server-side, a response viewer (status/time/size, Response/Headers/Cookies/Raw tabs, pretty/raw JSON with fold/collapse and search, copy button), request history backed by Postgres (list/search/delete/clear), dark/light mode, resizable panels, toasts, loading/empty/error states. The full product data model (users, collections, requests, environments, environment_variables, ai_conversations) is already migrated so later phases are additive.

**Phase 2 — done.** Collections (nested folders in the sidebar; create/rename/delete/move; save the current request into a folder or update a previously saved one), Environments (multiple named environments, each with its own `{{key}}`-style variables, one active at a time via the TopBar switcher; secret-value masking in the Environment Manager), and auth on the request builder's new Auth tab — No Auth / Bearer / Basic / API Key (header or query) / OAuth 2.0 (client-credentials grant only, per an explicit scope decision — no browser-redirect authorization-code flow). `{{variables}}` from the active environment are resolved throughout the URL, params, headers, and body — and inside whichever auth type is active — immediately before a request is sent, so a saved request keeps its unresolved `{{token}}`-style templates rather than baking in one environment's values.

**Phase 2 addition — cURL import, done.** An "Import" button next to the URL bar opens a dialog to paste a curl command (from a terminal, or a browser's "Copy as cURL") and load it straight into the request builder, matching Postman's raw-text import. A small self-contained parser (`src/lib/parseCurl.ts` — no third-party dependency) tokenizes the command shell-style (handling single/double quotes, backslash escapes, and `\`-newline line continuations) and reads `--request`/`-X`, `--header`/`-H`, `--data*`/`-d`, `--form`/`-F`, `--user`/`-u`, `--url`, `--user-agent`, `--referer`, `--cookie`; unrecognized flags are skipped (with their value, if any) rather than failing the import. The pasted URL's query string is split into the Params tab, same as pasting a URL directly. The request body is auto-detected as JSON, form-urlencoded, or raw (Content-Type header first, then a JSON-parse/shape heuristic). An `Authorization: Basic <base64>` or `Authorization: Bearer <token>` header — or a `-u user:pass` flag — is decoded into the Auth tab's Basic/Bearer fields instead of being left as a raw header, matching how the rest of the app treats auth; any other Authorization scheme is left as a plain header.

**Phase 3 — done (desktop packaging), Homebrew tap scaffolded.** Postgres was fully replaced with embedded SQLite (`better-sqlite3`) — see "Database history" above. A new `apps/desktop` Electron shell embeds the existing Express backend in-process (no code changes to the API layer beyond an optional `staticDir` parameter on `createApp()`, used only by the desktop build) and serves the built frontend from the same port, so the frontend's existing same-origin `/api/...` calls work unmodified. Before Electron starts (in both `npm run dev` and `npm run dist:mac`), a `copy-embed` script copies the backend and frontend production builds into `apps/desktop/backend` and `apps/desktop/frontend`, right next to `main.js` — so path resolution is identical in dev and in a packaged build, and electron-builder's `files` config can reference them as plain local globs (no cross-directory copying at package time, which turned out to conflict with `asarUnpack` — see the note below). The SQLite file lives in Electron's per-user app-data folder so it survives app updates. Packaged for macOS via `electron-builder` (`npm run dist:mac`), unsigned per the user's confirmed decision (no Apple Developer account) — expect a one-time Gatekeeper prompt on first launch (see "Desktop app" above). A placeholder Homebrew tap (`homebrew-apiforge/`) is scaffolded at the repo root with instructions for publishing it for real. Re-sequenced ahead of the AI Assistant at the user's request (2026-09-22); the AI Assistant work moved to Phase 4.

*What was and wasn't verified where this was built*: the backend's SQLite rewrite was verified thoroughly (full test suite including a real non-mocked SQLite integration test, a real `npm run dev` run against a file-backed database with actual HTTP calls — including the real `/api/requests/execute` → history-write path, not just direct history endpoints — and data persisting correctly across a full server restart). The Electron packaging logic was verified by running the exact backend-embedding + combined static/API serving code path outside of Electron's GUI layer (this build sandbox is a headless Linux container where Chromium's renderer process cannot start even with `--no-sandbox`, which is a sandbox limitation, not an app bug), and by running `electron-builder`'s full packaging pipeline end-to-end for a Linux target to confirm the file layout, icon, and native-module (`better-sqlite3`) unpacking are all structurally correct — including confirming `better-sqlite3` ships N-API prebuilt binaries for both `darwin-x64` and `darwin-arm64`, which should work in the packaged Electron app without a separate native rebuild step. This Linux dry-run packaging pass also caught and fixed two real config bugs before they could reach a Mac: an invalid `mac.arch` key (arch belongs per-target, e.g. `{ target: "dmg", arch: [...] }`, not as a sibling of `target`) and the `asarUnpack`/cross-directory-`files` conflict mentioned above. **What still needs a real Mac**: actually launching the packaged `.app`, clicking through the Gatekeeper prompt, and confirming data persists across a real app restart — `npm run rebuild-native -w apps/desktop` is there as a fallback if `better-sqlite3` ever does need a rebuild for Electron's exact ABI on that machine.

**Phase 4 — next.** The AI Assistant: generate a request from a natural-language description, explain a response, debug an error, generate test cases, generate documentation — all behind a backend `AIService` abstraction calling the Anthropic API, with a clear warning before any request/response data is sent to it.
