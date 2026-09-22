import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryPanel } from "../src/components/history/HistoryPanel";
import { useRequestStore } from "../src/store/useRequestStore";
import type { HistoryEntry } from "../src/types";
import { renderWithQueryClient } from "./testUtils";

const fetchHistoryMock = vi.fn();
const deleteHistoryEntryMock = vi.fn();
const clearHistoryMock = vi.fn();

vi.mock("../src/api/history", () => ({
  fetchHistory: (...args: unknown[]) => fetchHistoryMock(...args),
  deleteHistoryEntry: (...args: unknown[]) => deleteHistoryEntryMock(...args),
  clearHistory: (...args: unknown[]) => clearHistoryMock(...args),
}));

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "h1",
    userId: null,
    requestId: null,
    method: "GET",
    url: "https://api.example.com/users",
    requestHeaders: null,
    requestBody: null,
    responseStatus: 200,
    responseHeaders: null,
    responseBody: null,
    responseTimeMs: 12,
    responseSizeBytes: 34,
    error: null,
    executedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("HistoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRequestStore.getState().reset();
  });

  it("shows an empty state when there is no history", async () => {
    fetchHistoryMock.mockResolvedValue([]);
    renderWithQueryClient(<HistoryPanel />);
    expect(await screen.findByText(/no history yet/i)).toBeInTheDocument();
  });

  it("lists history entries returned by the backend", async () => {
    fetchHistoryMock.mockResolvedValue([entry(), entry({ id: "h2", method: "POST", responseStatus: 201 })]);
    renderWithQueryClient(<HistoryPanel />);

    expect(await screen.findByText("GET")).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
  });

  it("loads a history entry into the request draft when clicked", async () => {
    fetchHistoryMock.mockResolvedValue([entry()]);
    renderWithQueryClient(<HistoryPanel />);

    const user = userEvent.setup();
    await user.click(await screen.findByText("GET"));

    expect(useRequestStore.getState().draft.url).toBe("https://api.example.com/users");
  });

  it("deletes an entry when its delete button is clicked", async () => {
    fetchHistoryMock.mockResolvedValue([entry()]);
    deleteHistoryEntryMock.mockResolvedValue(undefined);
    renderWithQueryClient(<HistoryPanel />);

    const user = userEvent.setup();
    await screen.findByText("GET");
    await user.click(screen.getByLabelText(/delete history entry/i));

    await waitFor(() => expect(deleteHistoryEntryMock).toHaveBeenCalled());
    expect(deleteHistoryEntryMock.mock.calls[0][0]).toBe("h1");
  });

  it("clears all history when Clear is clicked", async () => {
    fetchHistoryMock.mockResolvedValue([entry()]);
    clearHistoryMock.mockResolvedValue({ deletedCount: 1 });
    renderWithQueryClient(<HistoryPanel />);

    const user = userEvent.setup();
    await user.click(await screen.findByLabelText(/clear all history/i));

    await waitFor(() => expect(clearHistoryMock).toHaveBeenCalledOnce());
  });

  it("passes the search term through to fetchHistory", async () => {
    fetchHistoryMock.mockResolvedValue([]);
    renderWithQueryClient(<HistoryPanel />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/search history/i), "users");

    await waitFor(() => expect(fetchHistoryMock).toHaveBeenLastCalledWith("users"));
  });
});
