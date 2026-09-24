import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/errorHandler.js";
import * as examplesService from "../services/examplesService.js";

export const examplesRouter = Router();

const idParamSchema = z.object({ id: z.string().uuid() });

export const createExampleSchema = z.object({
  name: z.string().trim().min(1).max(200),
  status: z.number().int().min(0).max(999),
  statusText: z.string().max(200).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  timeMs: z.number().nonnegative().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
});

const renameExampleSchema = z.object({ name: z.string().trim().min(1).max(200) });

/** PATCH /api/examples/:id — rename a saved example. */
examplesRouter.patch("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { name } = renameExampleSchema.parse(req.body);
    const example = await examplesService.renameExample(id, name);
    if (!example) throw new HttpError(404, `Example "${id}" not found`);
    res.json(example);
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/examples/:id — remove a saved example. */
examplesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await examplesService.deleteExample(id);
    if (!deleted) throw new HttpError(404, `Example "${id}" not found`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
