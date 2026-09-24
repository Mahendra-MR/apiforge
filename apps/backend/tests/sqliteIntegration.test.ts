import { describe, expect, it } from "vitest";
import { DEFAULT_USER_ID } from "../src/config/constants.js";
import * as collectionsService from "../src/services/collectionsService.js";
import * as environmentsService from "../src/services/environmentsService.js";
import * as historyService from "../src/services/historyService.js";
import * as savedRequestsService from "../src/services/savedRequestsService.js";

/**
 * Every other *Service test mocks `src/db/pool.js` entirely (see the
 * `vi.mock("../src/db/pool.js", ...)` calls throughout), which is what makes
 * them fast unit tests — but it also means none of them actually execute a
 * real SQL statement against SQLite. This file deliberately does NOT mock
 * the pool, so it's the one place that catches a real syntax error (a wrong
 * placeholder count, a bad IN (...) clause, a JSON column that doesn't round
 * -trip) that the mocked suite structurally cannot see. Runs against the
 * `:memory:` database configured in vitest.config.ts.
 */
describe("SQLite integration (real, unmocked pool)", () => {
  it("round-trips an environment and its variables, including the upsert-on-conflict path", async () => {
    const env = await environmentsService.createEnvironment(DEFAULT_USER_ID, "Development");
    expect(env.isActive).toBe(true); // first environment for the user auto-activates

    const created = await environmentsService.createVariable(env.id, { key: "baseUrl", value: "https://dev.example.com" });
    expect(created.isSecret).toBe(false);

    // Same key again exercises the ON CONFLICT (environment_id, key) DO UPDATE path.
    const upserted = await environmentsService.createVariable(env.id, {
      key: "baseUrl",
      value: "https://updated.example.com",
      isSecret: true,
    });
    expect(upserted.id).toBe(created.id); // same row, not a duplicate
    expect(upserted.value).toBe("https://updated.example.com");
    expect(upserted.isSecret).toBe(true);

    const [listed] = await environmentsService.listEnvironments(DEFAULT_USER_ID);
    expect(listed.variables).toHaveLength(1);
    expect(listed.variables[0].value).toBe("https://updated.example.com");
    expect(typeof listed.createdAt).toBe("string");
  });

  it("setActiveEnvironment activates one and deactivates the rest inside a real transaction", async () => {
    const first = await environmentsService.createEnvironment(DEFAULT_USER_ID, "Staging");
    const second = await environmentsService.createEnvironment(DEFAULT_USER_ID, "Production");
    expect(second.isActive).toBe(false); // only the very first environment ever created auto-activates

    const activated = await environmentsService.setActiveEnvironment(second.id, DEFAULT_USER_ID);
    expect(activated?.isActive).toBe(true);

    const all = await environmentsService.listEnvironments(DEFAULT_USER_ID);
    const firstAfter = all.find((e) => e.id === first.id);
    expect(firstAfter?.isActive).toBe(false);
  });

  it("scopes a folder's environment independently of the global one and of other folders", async () => {
    const folderA = await collectionsService.createCollection(DEFAULT_USER_ID, { name: "Folder A" });
    const folderB = await collectionsService.createCollection(DEFAULT_USER_ID, { name: "Folder B" });

    const globalEnv = (await environmentsService.listEnvironments(DEFAULT_USER_ID)).find((e) => e.collectionId === null);
    const folderAEnv = await environmentsService.createEnvironment(DEFAULT_USER_ID, "Folder A env", folderA.id);
    expect(folderAEnv.isActive).toBe(true); // first environment scoped to Folder A, regardless of the global scope's own state

    const folderAEnvTwo = await environmentsService.createEnvironment(DEFAULT_USER_ID, "Folder A env 2", folderA.id);
    expect(folderAEnvTwo.isActive).toBe(false);

    const folderBEnv = await environmentsService.createEnvironment(DEFAULT_USER_ID, "Folder B env", folderB.id);
    expect(folderBEnv.isActive).toBe(true); // Folder B's own first environment, unaffected by Folder A

    await environmentsService.setActiveEnvironment(folderAEnvTwo.id, DEFAULT_USER_ID);

    const all = await environmentsService.listEnvironments(DEFAULT_USER_ID);
    expect(all.find((e) => e.id === folderAEnvTwo.id)?.isActive).toBe(true);
    expect(all.find((e) => e.id === folderAEnv.id)?.isActive).toBe(false); // deactivated — same scope (Folder A)
    expect(all.find((e) => e.id === folderBEnv.id)?.isActive).toBe(true); // untouched — different scope (Folder B)
    if (globalEnv) {
      expect(all.find((e) => e.id === globalEnv.id)?.isActive).toBe(globalEnv.isActive); // untouched — different scope (global)
    }

    // Deleting the folder cascades to the environment scoped to it, same as it already does for subfolders/requests.
    await collectionsService.deleteCollection(folderA.id, DEFAULT_USER_ID);
    const afterDelete = await environmentsService.listEnvironments(DEFAULT_USER_ID);
    expect(afterDelete.some((e) => e.id === folderAEnv.id || e.id === folderAEnvTwo.id)).toBe(false);
  });

  it("rejects moving a collection into its own descendant (cycle prevention over real rows)", async () => {
    const parent = await collectionsService.createCollection(DEFAULT_USER_ID, { name: "Parent" });
    const child = await collectionsService.createCollection(DEFAULT_USER_ID, { name: "Child", parentId: parent.id });

    await expect(
      collectionsService.updateCollection(parent.id, DEFAULT_USER_ID, { parentId: child.id }),
    ).rejects.toThrow(collectionsService.CircularCollectionMoveError);
  });

  it("saves a request with JSON body/headers, updates it, and reads it back with everything round-tripped", async () => {
    const collection = await collectionsService.createCollection(DEFAULT_USER_ID, { name: "Auth" });

    const saved = await savedRequestsService.createSavedRequest(collection.id, {
      name: "Login",
      method: "POST",
      url: "{{baseUrl}}/auth/login",
      headers: { "Content-Type": "application/json" },
      bodyType: "json",
      body: { email: "a@example.com", password: "secret" },
    });
    expect(saved.headers).toEqual({ "Content-Type": "application/json" });
    expect(saved.body).toEqual({ email: "a@example.com", password: "secret" });

    const otherCollection = await collectionsService.createCollection(DEFAULT_USER_ID, { name: "Other" });
    const updated = await savedRequestsService.updateSavedRequest(saved.id, {
      collectionId: otherCollection.id,
      body: { email: "b@example.com", password: "changed" },
    });
    expect(updated?.collectionId).toBe(otherCollection.id);
    expect(updated?.body).toEqual({ email: "b@example.com", password: "changed" });
    expect(updated?.headers).toEqual({ "Content-Type": "application/json" }); // untouched fields survive the update

    // Exercises the IN (...) rewrite of the old `= ANY($1)` query across two collection ids.
    const requests = await savedRequestsService.listRequestsForCollections([collection.id, otherCollection.id]);
    expect(requests.map((r) => r.id)).toEqual([saved.id]);

    expect(await savedRequestsService.deleteSavedRequest(saved.id)).toBe(true);
    expect(await savedRequestsService.getSavedRequest(saved.id)).toBeNull();
  });

  it("records history and searches it with the LIKE-based filter (the old ILIKE rewrite)", async () => {
    await historyService.recordHistory({ method: "GET", url: "https://api.example.com/Users", responseStatus: 200 });
    await historyService.recordHistory({ method: "POST", url: "https://api.example.com/orders", responseStatus: 201 });

    const matches = await historyService.listHistory({ search: "users" }); // lowercase search, mixed-case stored URL
    expect(matches).toHaveLength(1);
    expect(matches[0].url).toBe("https://api.example.com/Users");
    expect(typeof matches[0].executedAt).toBe("string");

    const cleared = await historyService.clearHistory();
    expect(cleared).toBeGreaterThanOrEqual(2);
  });
});
