import { Router } from "express";
import { z } from "zod";
import { fetchClientCredentialsToken } from "../services/oauth2Service.js";
import { logger } from "../utils/logger.js";

export const authRouter = Router();

const clientCredentialsSchema = z.object({
  tokenUrl: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scope: z.string().optional(),
});

/**
 * POST /api/auth/oauth2/token
 *
 * Fetches an access token via the OAuth2 client-credentials grant on behalf
 * of the request builder's Auth tab. The client secret passes through this
 * endpoint but is never logged (see the redact paths in utils/logger.ts)
 * and is not persisted anywhere by this route.
 */
authRouter.post("/oauth2/token", async (req, res, next) => {
  try {
    const input = clientCredentialsSchema.parse(req.body);
    logger.info({ tokenUrl: input.tokenUrl, clientId: input.clientId }, "Fetching OAuth2 client-credentials token");
    const token = await fetchClientCredentialsToken(input);
    res.json(token);
  } catch (error) {
    next(error);
  }
});
