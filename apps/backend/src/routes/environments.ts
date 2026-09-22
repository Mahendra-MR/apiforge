import { Router } from "express";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../config/constants.js";
import { HttpError } from "../middleware/errorHandler.js";
import * as environmentsService from "../services/environmentsService.js";

export const environmentsRouter = Router();

// APIForge has no login system yet (see config/constants.ts) — every
// environment is scoped to the single local user for now.
const userId = DEFAULT_USER_ID;

const idParamSchema = z.object({ id: z.string().uuid() });
const environmentIdVariableIdParamSchema = z.object({
  id: z.string().uuid(),
  variableId: z.string().uuid(),
});
const createEnvironmentSchema = z.object({ name: z.string().trim().min(1).max(100) });
const renameEnvironmentSchema = z.object({ name: z.string().trim().min(1).max(100) });
const createVariableSchema = z.object({
  key: z.string().trim().min(1).max(200),
  value: z.string().max(10_000),
  isSecret: z.boolean().optional(),
});
const updateVariableSchema = z.object({
  key: z.string().trim().min(1).max(200).optional(),
  value: z.string().max(10_000).optional(),
  isSecret: z.boolean().optional(),
});

environmentsRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ environments: await environmentsService.listEnvironments(userId) });
  } catch (error) {
    next(error);
  }
});

environmentsRouter.post("/", async (req, res, next) => {
  try {
    const { name } = createEnvironmentSchema.parse(req.body);
    res.status(201).json(await environmentsService.createEnvironment(userId, name));
  } catch (error) {
    next(error);
  }
});

environmentsRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const environment = await environmentsService.getEnvironment(id, userId);
    if (!environment) throw new HttpError(404, `Environment "${id}" not found`);
    res.json(environment);
  } catch (error) {
    next(error);
  }
});

environmentsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { name } = renameEnvironmentSchema.parse(req.body);
    const environment = await environmentsService.renameEnvironment(id, userId, name);
    if (!environment) throw new HttpError(404, `Environment "${id}" not found`);
    res.json(environment);
  } catch (error) {
    next(error);
  }
});

environmentsRouter.post("/:id/activate", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const environment = await environmentsService.setActiveEnvironment(id, userId);
    if (!environment) throw new HttpError(404, `Environment "${id}" not found`);
    res.json(environment);
  } catch (error) {
    next(error);
  }
});

environmentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await environmentsService.deleteEnvironment(id, userId);
    if (!deleted) throw new HttpError(404, `Environment "${id}" not found`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

environmentsRouter.post("/:id/variables", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = createVariableSchema.parse(req.body);
    const environment = await environmentsService.getEnvironment(id, userId);
    if (!environment) throw new HttpError(404, `Environment "${id}" not found`);
    res.status(201).json(await environmentsService.createVariable(id, input));
  } catch (error) {
    next(error);
  }
});

environmentsRouter.patch("/:id/variables/:variableId", async (req, res, next) => {
  try {
    const { id, variableId } = environmentIdVariableIdParamSchema.parse(req.params);
    const input = updateVariableSchema.parse(req.body);
    const variable = await environmentsService.updateVariable(variableId, id, input);
    if (!variable) throw new HttpError(404, `Variable "${variableId}" not found`);
    res.json(variable);
  } catch (error) {
    next(error);
  }
});

environmentsRouter.delete("/:id/variables/:variableId", async (req, res, next) => {
  try {
    const { id, variableId } = environmentIdVariableIdParamSchema.parse(req.params);
    const deleted = await environmentsService.deleteVariable(variableId, id);
    if (!deleted) throw new HttpError(404, `Variable "${variableId}" not found`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
