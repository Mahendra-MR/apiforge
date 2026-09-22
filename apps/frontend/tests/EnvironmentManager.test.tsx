import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvironmentManager } from "../src/components/environments/EnvironmentManager";
import type { Environment } from "../src/types";
import { renderWithQueryClient } from "./testUtils";

const fetchEnvironmentsMock = vi.fn();
const createEnvironmentMock = vi.fn();
const activateEnvironmentMock = vi.fn();
const deleteEnvironmentMock = vi.fn();
const renameEnvironmentMock = vi.fn();
const createVariableMock = vi.fn();
const updateVariableMock = vi.fn();
const deleteVariableMock = vi.fn();

vi.mock("../src/api/environments", () => ({
  fetchEnvironments: (...args: unknown[]) => fetchEnvironmentsMock(...args),
  createEnvironment: (...args: unknown[]) => createEnvironmentMock(...args),
  renameEnvironment: (...args: unknown[]) => renameEnvironmentMock(...args),
  activateEnvironment: (...args: unknown[]) => activateEnvironmentMock(...args),
  deleteEnvironment: (...args: unknown[]) => deleteEnvironmentMock(...args),
  createVariable: (...args: unknown[]) => createVariableMock(...args),
  updateVariable: (...args: unknown[]) => updateVariableMock(...args),
  deleteVariable: (...args: unknown[]) => deleteVariableMock(...args),
}));

function environment(overrides: Partial<Environment> = {}): Environment {
  return {
    id: "e1",
    userId: "u1",
    name: "Local",
    isActive: true,
    variables: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("EnvironmentManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an empty state when there are no environments", async () => {
    fetchEnvironmentsMock.mockResolvedValue([]);
    renderWithQueryClient(<EnvironmentManager open onClose={() => {}} />);
    expect(await screen.findByText(/no environments yet/i)).toBeInTheDocument();
  });

  it("lists environments and marks the active one", async () => {
    fetchEnvironmentsMock.mockResolvedValue([environment({ id: "e1", name: "Local", isActive: true })]);
    renderWithQueryClient(<EnvironmentManager open onClose={() => {}} />);

    expect(await screen.findByDisplayValue("Local")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("creates a new environment", async () => {
    fetchEnvironmentsMock.mockResolvedValue([]);
    createEnvironmentMock.mockResolvedValue(environment({ id: "e2", name: "Staging" }));

    const user = userEvent.setup();
    renderWithQueryClient(<EnvironmentManager open onClose={() => {}} />);
    await screen.findByText(/no environments yet/i);

    await user.type(screen.getByPlaceholderText(/new environment name/i), "Staging");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createEnvironmentMock).toHaveBeenCalledWith("Staging"));
  });

  it("activates a non-active environment", async () => {
    fetchEnvironmentsMock.mockResolvedValue([environment({ id: "e1", name: "Local", isActive: false })]);
    activateEnvironmentMock.mockResolvedValue(environment({ id: "e1", name: "Local", isActive: true }));

    const user = userEvent.setup();
    renderWithQueryClient(<EnvironmentManager open onClose={() => {}} />);

    await user.click(await screen.findByRole("button", { name: "Activate" }));
    await waitFor(() => expect(activateEnvironmentMock).toHaveBeenCalledWith("e1"));
  });

  it("adds a variable to an expanded environment", async () => {
    fetchEnvironmentsMock.mockResolvedValue([environment({ id: "e1", variables: [] })]);
    createVariableMock.mockResolvedValue({});

    const user = userEvent.setup();
    renderWithQueryClient(<EnvironmentManager open onClose={() => {}} />);

    await user.click(await screen.findByLabelText(/expand environment/i));
    await user.type(screen.getByPlaceholderText(/new variable key/i), "baseUrl");
    await user.type(screen.getByPlaceholderText("Value"), "https://api.example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(createVariableMock).toHaveBeenCalledWith("e1", { key: "baseUrl", value: "https://api.example.com" }),
    );
  });

  it("masks a secret variable's value until revealed", async () => {
    fetchEnvironmentsMock.mockResolvedValue([
      environment({
        id: "e1",
        variables: [
          {
            id: "v1",
            environmentId: "e1",
            key: "apiKey",
            value: "super-secret",
            isSecret: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    ]);

    const user = userEvent.setup();
    renderWithQueryClient(<EnvironmentManager open onClose={() => {}} />);

    await user.click(await screen.findByLabelText(/expand environment/i));
    const valueInput = (await screen.findByDisplayValue("super-secret")) as HTMLInputElement;
    expect(valueInput.type).toBe("password");

    await user.click(screen.getByLabelText(/reveal value/i));
    expect(valueInput.type).toBe("text");
  });
});
