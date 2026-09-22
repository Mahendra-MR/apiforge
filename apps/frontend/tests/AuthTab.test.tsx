import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthTab } from "../src/components/request-builder/AuthTab";
import { useRequestStore } from "../src/store/useRequestStore";
import { renderWithQueryClient } from "./testUtils";

const fetchOAuth2TokenMock = vi.fn();

vi.mock("../src/api/auth", () => ({
  fetchOAuth2Token: (...args: unknown[]) => fetchOAuth2TokenMock(...args),
}));

describe("AuthTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRequestStore.getState().reset();
  });

  it("defaults to No Auth", () => {
    renderWithQueryClient(<AuthTab />);
    expect(screen.getByText(/does not use authorization/i)).toBeInTheDocument();
  });

  it("switches to Bearer Token and stores what's typed", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AuthTab />);

    await user.click(screen.getByRole("button", { name: "Bearer Token" }));
    await user.type(screen.getByPlaceholderText("{{accessToken}}"), "abc123");

    expect(useRequestStore.getState().draft.authType).toBe("bearer");
    expect(useRequestStore.getState().draft.auth.bearer.token).toBe("abc123");
  });

  it("switches to Basic Auth and stores username/password", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AuthTab />);

    await user.click(screen.getByRole("button", { name: "Basic Auth" }));
    await user.type(screen.getByText("Username").nextElementSibling as HTMLElement, "alice");
    await user.type(screen.getByText("Password").nextElementSibling as HTMLElement, "secret");

    expect(useRequestStore.getState().draft.auth.basic).toEqual({ username: "alice", password: "secret" });
  });

  it("switches to API Key and stores key/value/location", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AuthTab />);

    await user.click(screen.getByRole("button", { name: "API Key" }));
    await user.type(screen.getByPlaceholderText("X-API-Key"), "X-Token");
    await user.selectOptions(screen.getByText("Header").parentElement as HTMLElement, "query");

    expect(useRequestStore.getState().draft.auth.apiKey.key).toBe("X-Token");
    expect(useRequestStore.getState().draft.auth.apiKey.location).toBe("query");
  });

  it("disables 'Get New Access Token' until tokenUrl/clientId/clientSecret are all filled", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AuthTab />);

    await user.click(screen.getByRole("button", { name: "OAuth 2.0" }));
    const fetchButton = screen.getByRole("button", { name: /get new access token/i });
    expect(fetchButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/auth.example.com/i), "https://auth.example.com/token");
    await user.type(screen.getByText("Client ID").nextElementSibling as HTMLElement, "client-1");
    await user.type(screen.getByText("Client Secret").nextElementSibling as HTMLElement, "secret-1");

    expect(fetchButton).not.toBeDisabled();
  });

  it("fetches an OAuth2 token and stores it on the draft", async () => {
    fetchOAuth2TokenMock.mockResolvedValue({
      accessToken: "xyz",
      tokenType: "Bearer",
      expiresIn: 3600,
      scope: null,
      obtainedAt: "2026-01-01T00:00:00.000Z",
    });

    const user = userEvent.setup();
    renderWithQueryClient(<AuthTab />);

    await user.click(screen.getByRole("button", { name: "OAuth 2.0" }));
    await user.type(screen.getByPlaceholderText(/auth.example.com/i), "https://auth.example.com/token");
    await user.type(screen.getByText("Client ID").nextElementSibling as HTMLElement, "client-1");
    await user.type(screen.getByText("Client Secret").nextElementSibling as HTMLElement, "secret-1");

    await user.click(screen.getByRole("button", { name: /get new access token/i }));

    await waitFor(() => expect(useRequestStore.getState().draft.auth.oauth2.accessToken).toBe("xyz"));
    expect(fetchOAuth2TokenMock).toHaveBeenCalledWith({
      tokenUrl: "https://auth.example.com/token",
      clientId: "client-1",
      clientSecret: "secret-1",
      scope: undefined,
    });
  });
});
