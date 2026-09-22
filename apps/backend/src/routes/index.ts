import { Router } from "express";
import { authRouter } from "./auth.js";
import { collectionsRouter } from "./collections.js";
import { environmentsRouter } from "./environments.js";
import { historyRouter } from "./history.js";
import { requestsRouter } from "./requests.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

apiRouter.use("/requests", requestsRouter);
apiRouter.use("/history", historyRouter);
apiRouter.use("/environments", environmentsRouter);
apiRouter.use("/collections", collectionsRouter);
apiRouter.use("/auth", authRouter);

// AI routes are added in Phase 3 (see project docs for the phased roadmap).
