import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/errorHandler.js";
import { clearHistory, deleteHistoryEntry, listHistory } from "../services/historyService.js";

export const historyRouter = Router();

const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

/** GET /api/history?search=&limit= — list recent requests, newest first. */
historyRouter.get("/", async (req, res, next) => {
  try {
    const { search, limit } = listQuerySchema.parse(req.query);
    const entries = await listHistory({ search, limit });
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/history — clear all history. Declared before "/:id" so it isn't shadowed. */
historyRouter.delete("/", async (_req, res, next) => {
  try {
    const count = await clearHistory();
    res.json({ deletedCount: count });
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/history/:id — delete a single entry. */
historyRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await deleteHistoryEntry(id);
    if (!deleted) {
      throw new HttpError(404, `History entry "${id}" not found`);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
