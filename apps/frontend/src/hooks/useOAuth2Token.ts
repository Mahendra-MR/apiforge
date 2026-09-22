import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchOAuth2Token, type ClientCredentialsInput } from "../api/auth";
import { ApiClientError } from "../api/client";

/** Fetches a fresh OAuth2 access token for the Auth tab's "Get New Access Token" button. The caller stores the result via useRequestStore's setOAuth2Token. */
export function useOAuth2Token() {
  return useMutation({
    mutationFn: (input: ClientCredentialsInput) => fetchOAuth2Token(input),
    onSuccess: () => toast.success("Access token fetched"),
    onError: (error) => {
      const message = error instanceof ApiClientError ? error.message : "Failed to fetch access token";
      toast.error(message);
    },
  });
}
