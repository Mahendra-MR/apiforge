/**
 * APIForge AI desktop shell.
 *
 * Runs the existing Express backend (unchanged app logic — see
 * apps/backend/src/app.ts) in-process, bound to a random free port on
 * localhost, with its SQLite database pointed at Electron's per-user
 * app-data folder so data survives app updates and reinstalls. The backend
 * also serves the built frontend as static files (via `createApp`'s
 * `staticDir` option) from that SAME port, so the frontend's existing
 * same-origin `fetch("/api/...")` calls work unmodified — no separate static
 * server, no CORS configuration, no hardcoded port to keep in sync.
 *
 * Path note: the `copy-embed` npm script (run before both `npm run dev` and
 * `npm run dist:mac` — see package.json) copies the backend and frontend
 * builds into ./backend and ./frontend, right next to this file, before
 * Electron ever starts. That means `__dirname`-relative resolution below is
 * identical in dev and packaged builds: in dev they're plain directories on
 * disk; when packaged, electron-builder's "files" config packs them as
 * siblings of node_modules inside the same app.asar.
 */
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { checkForUpdate } = require("./updateChecker");

function resolveAppPaths() {
  return {
    backendDist: path.join(__dirname, "backend"),
    frontendDist: path.join(__dirname, "frontend"),
  };
}

let backendServer;
let mainWindow;

async function startBackend() {
  const { backendDist, frontendDist } = resolveAppPaths();

  // The backend reads these from process.env at import time
  // (src/config/env.ts's module-level loadEnv() call), so they must be set
  // before the dynamic import below.
  process.env.NODE_ENV = process.env.NODE_ENV ?? "production";
  process.env.DB_PATH = path.join(app.getPath("userData"), "apiforge.db");

  // The backend is an ES module (package.json "type": "module"); a CJS
  // main process loads it with a dynamic import() rather than require().
  const { createApp } = await import(path.join(backendDist, "app.js"));
  const expressApp = createApp({ staticDir: frontendDist });

  return new Promise((resolve, reject) => {
    const server = expressApp.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "APIForge AI",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(async () => {
  try {
    backendServer = await startBackend();
    createWindow(backendServer.address().port);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start the APIForge backend:", error);
    app.quit();
    return;
  }

  // Give the window a couple seconds to render before checking for an
  // update, rather than racing a network call against startup.
  setTimeout(() => {
    checkForUpdate(app.getVersion(), mainWindow).catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Update check failed:", error);
    });
  }, 3000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && backendServer) {
      createWindow(backendServer.address().port);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  backendServer?.close();
});
