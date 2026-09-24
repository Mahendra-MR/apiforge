import { beforeEach, describe, expect, it } from "vitest";
import { DRAFT_STORAGE_KEY } from "../src/lib/draftStorage";
import { useRequestStore } from "../src/store/useRequestStore";
import type { ExecuteRequestResponse, HistoryEntry, RequestExample, SavedRequest } from "../src/types";

describe("useRequestStore", () => {
  beforeEach(() => {
    useRequestStore.getState().reset();
  });

  it("starts with a single empty row in params/headers/formData", () => {
    const { draft } = useRequestStore.getState();
    expect(draft.params).toHaveLength(1);
    expect(draft.headers).toHaveLength(1);
    expect(draft.formData).toHaveLength(1);
    expect(draft.method).toBe("GET");
  });

  it("setMethod and setUrl update the draft", () => {
    useRequestStore.getState().setMethod("POST");
    useRequestStore.getState().setUrl("https://api.example.com");
    const { draft } = useRequestStore.getState();
    expect(draft.method).toBe("POST");
    expect(draft.url).toBe("https://api.example.com");
  });

  it("updateRow fills the row and grows a new trailing empty row", () => {
    const firstRowId = useRequestStore.getState().draft.headers[0].id;
    useRequestStore.getState().updateRow("headers", firstRowId, { key: "Authorization", value: "Bearer x" });

    const { headers } = useRequestStore.getState().draft;
    expect(headers).toHaveLength(2);
    expect(headers[0]).toMatchObject({ key: "Authorization", value: "Bearer x" });
    expect(headers[1]).toMatchObject({ key: "", value: "" });
  });

  it("updateRow does not add another empty row when the last row is already empty", () => {
    useRequestStore.getState().updateRow("params", useRequestStore.getState().draft.params[0].id, { enabled: false });
    expect(useRequestStore.getState().draft.params).toHaveLength(1);
  });

  it("removeRow removes a row but always keeps at least one", () => {
    const store = useRequestStore.getState();
    store.updateRow("headers", store.draft.headers[0].id, { key: "A", value: "1" });
    const [first] = useRequestStore.getState().draft.headers;
    useRequestStore.getState().removeRow("headers", first.id);
    useRequestStore.getState().removeRow("headers", useRequestStore.getState().draft.headers[0].id);
    expect(useRequestStore.getState().draft.headers).toHaveLength(1);
  });

  it("loadFromHistory populates the draft from a history entry, including a JSON body", () => {
    const entry: HistoryEntry = {
      id: "h1",
      userId: null,
      requestId: null,
      method: "POST",
      url: "https://api.example.com/users",
      requestHeaders: { "Content-Type": "application/json" },
      requestBody: { name: "John" },
      responseStatus: 201,
      responseHeaders: {},
      responseBody: { id: 1 },
      responseTimeMs: 10,
      responseSizeBytes: 20,
      error: null,
      executedAt: new Date().toISOString(),
    };

    useRequestStore.getState().loadFromHistory(entry);

    const { draft } = useRequestStore.getState();
    expect(draft.method).toBe("POST");
    expect(draft.url).toBe("https://api.example.com/users");
    expect(draft.bodyMode).toBe("json");
    expect(JSON.parse(draft.jsonBody)).toEqual({ name: "John" });
    expect(draft.headers.some((h) => h.key === "Content-Type")).toBe(true);
  });

  it("reset restores a blank draft", () => {
    useRequestStore.getState().setUrl("https://example.com");
    useRequestStore.getState().reset();
    expect(useRequestStore.getState().draft.url).toBe("");
  });

  it("autosaves the draft to local storage as it changes", () => {
    useRequestStore.getState().setUrl("https://api.example.com/autosave-check");

    const stored = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null");
    expect(stored?.url).toBe("https://api.example.com/autosave-check");
  });

  const saved: SavedRequest = {
    id: "r1",
    collectionId: "c1",
    name: "Search",
    method: "GET",
    url: "https://api.example.com/search",
    queryParams: [
      { key: "q", value: "ada", enabled: true },
      { key: "debug", value: "1", enabled: false },
    ],
    pathParams: null,
    headers: null,
    authType: "none",
    authConfig: null,
    bodyType: "none",
    body: null,
    createdAt: "",
    updatedAt: "",
  };
  const response = { status: 200, statusText: "OK", headers: {}, body: "", bodyJson: null, timeMs: 1, sizeBytes: 0 } as ExecuteRequestResponse;

  it("restores a saved request's persisted params, disabled ones included", () => {
    useRequestStore.getState().loadFromSavedRequest(saved);
    const params = useRequestStore.getState().draft.params;
    expect(params.map(({ key, value, enabled }) => ({ key, value, enabled }))).toEqual([
      { key: "q", value: "ada", enabled: true },
      { key: "debug", value: "1", enabled: false },
      { key: "", value: "", enabled: true },
    ]);
  });

  it("opens a history entry as an unsaved draft, so editing it can't overwrite its saved request", () => {
    useRequestStore.getState().loadFromHistory({
      id: "h1",
      userId: null,
      requestId: "r1",
      method: "GET",
      url: "https://api.example.com/x",
      requestHeaders: null,
      requestBody: null,
      responseStatus: 200,
      responseHeaders: null,
      responseBody: null,
      responseTimeMs: 1,
      responseSizeBytes: 1,
      error: null,
      executedAt: "",
    });
    expect(useRequestStore.getState().draft.savedRequestId).toBeNull();
  });

  it("drops the previous response when a different request is opened", () => {
    useRequestStore.getState().setResponse(response);
    expect(useRequestStore.getState().response).toBe(response);
    useRequestStore.getState().loadFromSavedRequest(saved);
    expect(useRequestStore.getState().response).toBeNull();
  });

  it("opens an example on its request, and a new send's response replaces it", () => {
    const example = { id: "e1", requestId: "r1", name: "200 OK" } as RequestExample;
    useRequestStore.getState().openExample(saved, example);
    expect(useRequestStore.getState().draft.savedRequestId).toBe("r1");
    expect(useRequestStore.getState().viewingExample).toBe(example);

    useRequestStore.getState().setResponse(response);
    expect(useRequestStore.getState().viewingExample).toBeNull();
  });

  it("pasting a curl into a saved request replaces its contents in place, keeping it in its folder", () => {
    useRequestStore.getState().loadFromSavedRequest(saved);
    const before = useRequestStore.getState().draft;
    useRequestStore.getState().loadFromCurl({
      method: "POST",
      url: "https://api.example.com/orders",
      queryParams: [],
      headers: [["X-A", "1"]],
      bodyMode: "raw",
      jsonBody: "",
      rawBody: "hi",
      formData: [],
      authType: "none",
      authConfig: null,
    });
    const after = useRequestStore.getState().draft;
    expect(after).toMatchObject({ id: before.id, savedRequestId: "r1", collectionId: "c1", name: "Search", method: "POST", url: "https://api.example.com/orders" });
  });
});

