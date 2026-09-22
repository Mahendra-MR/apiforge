import { env } from "../config/env.js";
import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";
import { validateRequestUrl } from "../utils/validateUrl.js";

export interface ClientCredentialsInput {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export interface AccessToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number | null;
  scope: string | null;
  obtainedAt: string;
}

export class OAuth2TokenError extends Error {
  constructor(
    message: string,
    public readonly providerStatus?: number,
  ) {
    super(message);
    this.name = "OAuth2TokenError";
  }
}

/**
 * Fetches an access token via the OAuth2 "client credentials" grant
 * (RFC 6749 §4.4) — the server-to-server flow, with no user login/redirect
 * involved. Runs on the backend so the client secret never has to be part
 * of a browser-side request to a third party.
 */
export async function fetchClientCredentialsToken(input: ClientCredentialsInput): Promise<AccessToken> {
  const url = validateRequestUrl(input.tokenUrl);

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  if (input.scope) body.set("scope", input.scope);

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    },
    env.REQUEST_TIMEOUT_MS,
  );

  const rawBody = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    // fall through with an empty object; the raw body is still surfaced in the error below
  }

  if (!response.ok) {
    const description =
      (typeof parsed.error_description === "string" && parsed.error_description) ||
      (typeof parsed.error === "string" && parsed.error) ||
      rawBody.slice(0, 300) ||
      response.statusText;
    throw new OAuth2TokenError(`Token request failed (${response.status}): ${description}`, response.status);
  }

  if (typeof parsed.access_token !== "string") {
    throw new OAuth2TokenError("Token endpoint responded 2xx but the response had no access_token field");
  }

  return {
    accessToken: parsed.access_token,
    tokenType: typeof parsed.token_type === "string" ? parsed.token_type : "Bearer",
    expiresIn: typeof parsed.expires_in === "number" ? parsed.expires_in : null,
    scope: typeof parsed.scope === "string" ? parsed.scope : null,
    obtainedAt: new Date().toISOString(),
  };
}
