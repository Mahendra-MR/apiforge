import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/errorHandler.js";
import * as examplesService from "../services/examplesService.js";
import { executeHttpRequest } from "../services/httpExecutor.js";
import { recordHistory } from "../services/historyService.js";
import * as savedRequestsService from "../services/savedRequestsService.js";
import { HTTP_METHODS } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { maskSensitiveHeaders } from "../utils/sanitize.js";
import { createExampleSchema } from "./examples.js";

export const requestsRouter = Router();

const executeRequestSchema = z.object({
  method: z.enum(HTTP_METHODS),
  url: z.string().min(1, "url is required"),
  headers: z.record(z.string()).optional(),
  body: z.string().nullable().optional(),
  /** Set to false to test a request without polluting history. Defaults to true. */
  saveToHistory: z.boolean().optional().default(true),
  /** The saved request (Collections) this send came from, if any — recorded on the history entry for traceability. */
  requestId: z.string().uuid().optional(),
});

/**
 * POST /api/requests/execute
 *
 * The core "send" action: validates the request, executes it server-side
 * (so the browser never deals with CORS), and returns a normalized result.
 * On success (including HTTP error statuses like 404/500 from the upstream
 * API — those are still successful *proxy* calls) it also records the
 * exchange to request history unless the caller opts out.
 */
requestsRouter.post("/execute", async (req, res, next) => {
  try {
    const input = executeRequestSchema.parse(req.body);

    logger.info(
      { method: input.method, url: input.url, headers: maskSensitiveHeaders(input.headers) },
      "Executing request",
    );

    const result = await executeHttpRequest(input);

    let historyId: string | undefined;
    if (input.saveToHistory) {
      const history = await recordHistory({
        requestId: input.requestId,
        method: input.method,
        url: input.url,
        requestHeaders: input.headers,
        requestBody: input.body ?? undefined,
        responseStatus: result.status,
        responseHeaders: result.headers,
        responseBody: result.bodyJson ?? result.body,
        responseTimeMs: result.timeMs,
        responseSizeBytes: result.sizeBytes,
      });
      historyId = history.id;
    }

    res.json({ ...result, historyId });
  } catch (error) {
    next(error);
  }
});

const idParamSchema = z.object({ id: z.string().uuid() });

const saveRequestBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  method: z.enum(HTTP_METHODS),
  // May be empty: "Add request" in the Collections tree creates a blank
  // request up front and the user fills in the URL afterwards (autosaved).
  url: z.string(),
  queryParams: z.unknown().optional(),
  pathParams: z.unknown().optional(),
  headers: z.record(z.string()).optional(),
  authType: z.enum(["none", "bearer", "basic", "apiKey", "oauth2"]).optional(),
  authConfig: z.unknown().optional(),
  bodyType: z.enum(["none", "json", "raw", "formData"]).optional(),
  body: z.unknown().optional(),
});

const updateSavedRequestSchema = saveRequestBodySchema.partial().extend({
  collectionId: z.string().uuid().nullable().optional(),
});

/** GET /api/requests/:id — a saved request from a collection. */
requestsRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const savedRequest = await savedRequestsService.getSavedRequest(id);
    if (!savedRequest) throw new HttpError(404, `Request "${id}" not found`);
    res.json(savedRequest);
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/requests/:id — update a saved request (rename, edit, or move to a different collection). */
requestsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateSavedRequestSchema.parse(req.body);
    const savedRequest = await savedRequestsService.updateSavedRequest(id, input);
    if (!savedRequest) throw new HttpError(404, `Request "${id}" not found`);
    res.json(savedRequest);
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/requests/:id — remove a saved request. */
requestsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await savedRequestsService.deleteSavedRequest(id);
    if (!deleted) throw new HttpError(404, `Request "${id}" not found`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/** POST /api/requests/:id/examples — save a response as an example on this saved request. */
requestsRouter.post("/:id/examples", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = createExampleSchema.parse(req.body);
    const savedRequest = await savedRequestsService.getSavedRequest(id);
    if (!savedRequest) throw new HttpError(404, `Request "${id}" not found`);
    res.status(201).json(await examplesService.createExample(id, input));
  } catch (error) {
    next(error);
  }
});

export { saveRequestBodySchema };
