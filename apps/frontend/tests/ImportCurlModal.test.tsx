import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportCurlModal } from "../src/components/request-builder/ImportCurlModal";
import { useRequestStore } from "../src/store/useRequestStore";
import { renderWithQueryClient } from "./testUtils";

/** Pastes curl text into the modal's textarea. Uses fireEvent instead of userEvent.type
 * because the curl commands here contain `{`/`}` (JSON bodies), which userEvent.type
 * would otherwise interpret as special key syntax. */
function pasteCurl(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/curl --location/i), { target: { value: text } });
}

describe("ImportCurlModal", () => {
  beforeEach(() => {
    useRequestStore.getState().reset();
  });

  it("parses a pasted curl command into the request draft and closes", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithQueryClient(<ImportCurlModal onClose={onClose} />);

    pasteCurl(
      `curl --request POST 'https://api.example.com/users?active=true' --header 'Content-Type: application/json' --header 'Authorization: Bearer abc123' --data '{"name":"John"}'`,
    );
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const draft = useRequestStore.getState().draft;
    expect(draft.method).toBe("POST");
    expect(draft.url).toBe("https://api.example.com/users");
    expect(draft.params.map((row) => [row.key, row.value])).toEqual([
      ["active", "true"],
      ["", ""],
    ]);
    expect(draft.headers.some((row) => row.key === "Content-Type")).toBe(true);
    expect(draft.headers.some((row) => row.key.toLowerCase() === "authorization")).toBe(false);
    expect(draft.authType).toBe("bearer");
    expect(draft.auth.bearer.token).toBe("abc123");
    expect(draft.bodyMode).toBe("json");
    expect(JSON.parse(draft.jsonBody)).toEqual({ name: "John" });
  });

  it("decodes a Basic Authorization header into the Auth tab's username/password", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithQueryClient(<ImportCurlModal onClose={onClose} />);

    pasteCurl(`curl 'https://api.example.com' --header 'Authorization: Basic bWlmb3M6RHJpZnRlcnNAMTIz'`);
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(useRequestStore.getState().draft.authType).toBe("basic"));
    expect(useRequestStore.getState().draft.auth.basic).toEqual({ username: "mifos", password: "Drifters@123" });
  });

  it("shows an error and keeps the current draft when the curl command has no URL", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    useRequestStore.getState().setUrl("https://api.example.com/keep-me");
    renderWithQueryClient(<ImportCurlModal onClose={onClose} />);

    pasteCurl("curl --header 'Accept: application/json'");
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(useRequestStore.getState().draft.url).toBe("https://api.example.com/keep-me");
  });

  it("disables Import until something is pasted, and Cancel closes without changing the draft", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    useRequestStore.getState().setUrl("https://api.example.com/keep-me");
    renderWithQueryClient(<ImportCurlModal onClose={onClose} />);

    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(useRequestStore.getState().draft.url).toBe("https://api.example.com/keep-me");
  });
});
