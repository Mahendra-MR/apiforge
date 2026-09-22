import { Router } from "express";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../config/constants.js";
import { HttpError } from "../middleware/errorHandler.js";
import * as collectionsService from "../services/collectionsService.js";
import * as savedRequestsService from "../services/savedRequestsService.js";
import { saveRequestBodySchema } from "./requests.js";

export const collectionsRouter = Router();

// APIForge has no login system yet (see config/constants.ts) — every
// collection is scoped to the single local user for now.
const userId = DEFAULT_USER_ID;

const idParamSchema = z.object({ id: z.string().uuid() });

const createCollectionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

/**
 * GET /api/collections
 *
 * Returns every collection (folder) and every saved request for the user as
 * two flat lists. The frontend assembles the folder tree client-side from
 * `parentId`/`collectionId` — simpler than the backend building and
 * re-serializing a tree, and just as easy for the UI to render.
 */
collectionsRouter.get("/", async (_req, res, next) => {
  try {
    const collections = await collectionsService.listCollections(userId);
    const requests = await savedRequestsService.listRequestsForCollections(collections.map((c) => c.id));
    res.json({ collections, requests });
  } catch (error) {
    next(error);
  }
});

collectionsRouter.post("/", async (req, res, next) => {
  try {
    const input = createCollectionSchema.parse(req.body);
    res.status(201).json(await collectionsService.createCollection(userId, input));
  } catch (error) {
    next(error);
  }
});

collectionsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateCollectionSchema.parse(req.body);
    const collection = await collectionsService.updateCollection(id, userId, input);
    if (!collection) throw new HttpError(404, `Collection "${id}" not found`);
    res.json(collection);
  } catch (error) {
    next(error);
  }
});

collectionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await collectionsService.deleteCollection(id, userId);
    if (!deleted) throw new HttpError(404, `Collection "${id}" not found`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/** POST /api/collections/:id/requests — save a request into this collection. */
collectionsRouter.post("/:id/requests", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = saveRequestBodySchema.parse(req.body);
    const collection = await collectionsService.getCollection(id, userId);
    if (!collection) throw new HttpError(404, `Collection "${id}" not found`);
    res.status(201).json(await savedRequestsService.createSavedRequest(id, input));
  } catch (error) {
    next(error);
  }
});
