import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiRouter } from "./routes/index.js";

export interface CreateAppOptions {
  /**
   * Serves the built frontend from this directory and falls back to its
   * `index.html` for any other GET request (client-side routing), so the
   * whole app — API and frontend — runs from one Express server on one
   * port. Used only by the packaged Electron desktop app; in normal
   * dev/test use (including every existing test, which calls `createApp()`
   * with no arguments) Vite serves the frontend separately and this is
   * omitted, leaving behavior unchanged.
   */
  staticDir?: string;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(requestLogger);
  // Body size cap guards against someone pasting a huge payload into the
  // request body editor and locking up the process.
  app.use(express.json({ limit: "10mb" }));

  app.use("/api", apiRouter);

  if (options.staticDir) {
    const staticDir = options.staticDir;
    app.use(express.static(staticDir));
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
