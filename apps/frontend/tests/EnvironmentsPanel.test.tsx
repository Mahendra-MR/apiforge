import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvironmentsPanel } from "../src/components/environments/EnvironmentsPanel";
import { TopBar } from "../src/components/layout/TopBar";
import type { Environment } from "../src/types";
import { renderWithQueryClient } from "./testUtils";

const fetchEnvironmentsMock = vi.fn();
const activateEnvironmentMock = vi.fn();

vi.mock("../src/api/environments", () => ({
  fetchEnvironments: (...args: unknown[]) => fetchEnvironmentsMock(...args),
  activateEnvironment: (...args: unknown[]) => activateEnvironmentMock(...args),
  createEnvironment: vi.fn(),
  renameEnvironment: vi.fn(),
  deleteEnvironment: vi.fn(),
  createVariable: vi.fn(),
  updateVariable: vi.fn(),
  deleteVariable: vi.fn(),
}));

function environment(overrides: Partial<Environment> = {}): Environment {
  return {
    id: "e1",
    userId: "u1",
    name: "Local",
    collectionId: null,
    isActive: false,
    variables: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("EnvironmentsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only the global environments and marks the active one", async () => {
    fetchEnvironmentsMock.mockResolvedValue([
      environment({ id: "g1", name: "Staging", isActive: true }),
      environment({ id: "g2", name: "Production" }),
      environment({ id: "f1", name: "Folder only", collectionId: "c1", isActive: true }),
    ]);
    renderWithQueryClient(<EnvironmentsPanel />);

    expect(await screen.findByRole("button", { name: /staging/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /production/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Folder only")).not.toBeInTheDocument();
  });

  it("activates an environment when clicked", async () => {
    fetchEnvironmentsMock.mockResolvedValue([environment({ id: "g1", name: "Staging", isActive: true }), environment({ id: "g2", name: "Production" })]);
    activateEnvironmentMock.mockResolvedValue(environment({ id: "g2", isActive: true }));

    const user = userEvent.setup();
    renderWithQueryClient(<EnvironmentsPanel />);
    await user.click(await screen.findByRole("button", { name: /production/i }));

    await waitFor(() => expect(activateEnvironmentMock).toHaveBeenCalledWith("g2"));
  });

  it("opens the environment manager from Manage", async () => {
    fetchEnvironmentsMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithQueryClient(<EnvironmentsPanel />);

    await screen.findByText(/no environments yet/i);
    await user.click(screen.getByRole("button", { name: /manage/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});

describe("TopBar", () => {
  it("no longer carries an environment switcher or settings gear", () => {
    render(<TopBar />);
    expect(screen.getByText("APIForge")).toBeInTheDocument();
    expect(screen.queryByLabelText(/active environment/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/manage environments/i)).not.toBeInTheDocument();
  });
});
