import { apiFetch } from "./client";
import type { OAuth2TokenResponse } from "../types";

export interface ClientCredentialsInput {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}

/** Fetches an OAuth2 access token via the client-credentials grant, proxied through the backend so the secret never leaves the server in a browser-visible request. */
export function fetchOAuth2Token(input: ClientCredentialsInput): Promise<OAuth2TokenResponse> {
  return apiFetch<OAuth2TokenResponse>("/auth/oauth2/token", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
