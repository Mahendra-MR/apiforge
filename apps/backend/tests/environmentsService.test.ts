import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMock = { query: vi.fn(), release: vi.fn() };
const poolMock = { query: vi.fn(), connect: vi.fn().mockResolvedValue(clientMock) };

vi.mock("../src/db/pool.js", () => ({ pool: poolMock }));

const environmentsService = await import("../src/services/environmentsService.js");

function envRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "env-1",
    user_id: "user-1",
    name: "Development",
    is_active: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function varRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "var-1",
    environment_id: "env-1",
    key: "baseUrl",
    value: "https://dev-api.example.com",
    is_secret: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("environmentsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listEnvironments joins variables onto their environment", async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [envRow()] })
      .mockResolvedValueOnce({ rows: [varRow()] });

    const result = await environmentsService.listEnvironments("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].variables).toHaveLength(1);
    expect(result[0].variables[0].key).toBe("baseUrl");
  });

  it("listEnvironments returns an empty array without querying variables when there are no environments", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });

    const result = await environmentsService.listEnvironments("user-1");

    expect(result).toEqual([]);
    expect(poolMock.query).toHaveBeenCalledTimes(1);
  });

  it("createEnvironment auto-activates a user's first environment", async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // existing-check finds none
      .mockResolvedValueOnce({ rows: [envRow({ is_active: 1 })] });

    await environmentsService.createEnvironment("user-1", "Development");

    const insertCall = poolMock.query.mock.calls[1];
    expect(insertCall[1]).toEqual([
      expect.any(String), // id
      "user-1",
      "Development",
      1, // isFirstEnvironment, converted to 0/1 for SQLite
      expect.any(String), // created_at
      expect.any(String), // updated_at
    ]);
  });

  it("createEnvironment does not activate a subsequent environment", async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // an environment already exists
      .mockResolvedValueOnce({ rows: [envRow({ is_active: 0, name: "Staging" })] });

    await environmentsService.createEnvironment("user-1", "Staging");

    const insertCall = poolMock.query.mock.calls[1];
    expect(insertCall[1]).toEqual([
      expect.any(String),
      "user-1",
      "Staging",
      0,
      expect.any(String),
      expect.any(String),
    ]);
  });

  it("setActiveEnvironment activates the target and deactivates the rest inside a transaction", async () => {
    clientMock.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: "env-1" }] }) // activate target
      .mockResolvedValueOnce(undefined) // deactivate others
      .mockResolvedValueOnce(undefined); // COMMIT
    poolMock.query
      .mockResolvedValueOnce({ rows: [envRow()] }) // getEnvironmentOrThrow env lookup
      .mockResolvedValueOnce({ rows: [varRow()] }); // getEnvironmentOrThrow variables lookup

    const result = await environmentsService.setActiveEnvironment("env-1", "user-1");

    expect(result?.isActive).toBe(true);
    expect(clientMock.query).toHaveBeenCalledWith("BEGIN");
    expect(clientMock.query).toHaveBeenCalledWith("COMMIT");
    expect(clientMock.release).toHaveBeenCalledOnce();
  });

  it("setActiveEnvironment rolls back and returns null when the environment doesn't belong to the user", async () => {
    clientMock.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // no row updated
      .mockResolvedValueOnce(undefined); // ROLLBACK

    const result = await environmentsService.setActiveEnvironment("env-x", "user-1");

    expect(result).toBeNull();
    expect(clientMock.query).toHaveBeenCalledWith("ROLLBACK");
  });

  it("createVariable upserts on (environment_id, key) conflict", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [varRow()] });

    await environmentsService.createVariable("env-1", { key: "baseUrl", value: "https://x", isSecret: false });

    expect(poolMock.query.mock.calls[0][0]).toContain("ON CONFLICT (environment_id, key)");
  });

  it("deleteEnvironment returns false when nothing was deleted", async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 0 });
    expect(await environmentsService.deleteEnvironment("env-x", "user-1")).toBe(false);
  });
});
