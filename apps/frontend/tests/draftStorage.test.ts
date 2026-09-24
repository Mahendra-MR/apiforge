import { beforeEach, describe, expect, it } from "vitest";
import { DRAFT_STORAGE_KEY, loadDraftFromStorage, saveDraftToStorage } from "../src/lib/draftStorage";
import type { RequestDraft } from "../src/types";

function draft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    id: "d1",
    savedRequestId: null,
    collectionId: null,
    name: "Untitled request",
    method: "GET",
    url: "https://api.example.com",
    params: [],
    headers: [],
    bodyMode: "none",
    jsonBody: "",
    rawBody: "",
    formData: [],
    authType: "none",
    auth: {
      bearer: { token: "" },
      basic: { username: "", password: "" },
      apiKey: { key: "", value: "", location: "header" },
      oauth2: { tokenUrl: "", clientId: "", clientSecret: "", scope: "", accessToken: null, tokenType: null, obtainedAt: null },
    },
    ...overrides,
  };
}

describe("draftStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing has been autosaved yet", () => {
    expect(loadDraftFromStorage()).toBeNull();
  });

  it("round-trips a draft through local storage", () => {
    saveDraftToStorage(draft({ url: "https://api.example.com/users", method: "POST" }));

    const restored = loadDraftFromStorage();
    expect(restored?.url).toBe("https://api.example.com/users");
    expect(restored?.method).toBe("POST");
  });

  it("returns null instead of throwing when the stored value is corrupted", () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "{not valid json");
    expect(loadDraftFromStorage()).toBeNull();
  });

  it("does not throw when storage writes fail (e.g. private browsing)", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("quota exceeded");
    };

    try {
      expect(() => saveDraftToStorage(draft())).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
