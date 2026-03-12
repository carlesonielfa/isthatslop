import { describe, it, expect, beforeEach } from "bun:test";
import { chromeMock } from "./mocks/chrome";

// signOut() and renderAuthState() exported from options/index.ts for testability.
// options/index.ts guards its void main() call behind typeof document check
// so importing the module in Bun doesn't crash.

describe("signOut", () => {
  it("removes authToken, username, userId from chrome.storage.local", async () => {
    const removed: Array<string | string[]> = [];
    const originalRemove = (
      chromeMock.storage.local as Record<string, unknown>
    ).remove;
    (chromeMock.storage.local as Record<string, unknown>).remove = async (
      keys: string | string[],
    ) => {
      removed.push(keys);
    };

    const { signOut } = await import("../../entrypoints/options/index");
    await signOut();

    expect(removed[0]).toContain("authToken");
    expect(removed[0]).toContain("username");
    expect(removed[0]).toContain("userId");

    (chromeMock.storage.local as Record<string, unknown>).remove =
      originalRemove;
  });

  it("leaves other storage keys (scoreCache, scoreCacheUpdatedAt) untouched", async () => {
    const removed: Array<string | string[]> = [];
    const originalRemove = (
      chromeMock.storage.local as Record<string, unknown>
    ).remove;
    (chromeMock.storage.local as Record<string, unknown>).remove = async (
      keys: string | string[],
    ) => {
      removed.push(keys);
    };

    const { signOut } = await import("../../entrypoints/options/index");
    await signOut();

    expect(removed[0]).not.toContain("scoreCache");
    expect(removed[0]).not.toContain("scoreCacheUpdatedAt");

    (chromeMock.storage.local as Record<string, unknown>).remove =
      originalRemove;
  });
});

describe("options page auth state render", () => {
  beforeEach(() => {
    // Provide minimal DOM stubs so renderAuthState can run in Bun
    // We test by spying on what gets set on the el stub.
    (globalThis as Record<string, unknown>).document = {
      getElementById: (_id: string) => ({
        innerHTML: "",
        addEventListener: () => {},
      }),
    };
  });

  it("shows 'Signed in as @username' when authToken and username present", async () => {
    const el = { innerHTML: "", addEventListener: () => {} };
    (globalThis as Record<string, unknown>).document = {
      getElementById: (_id: string) => el,
    };

    const { renderAuthState } = await import("../../entrypoints/options/index");
    renderAuthState("sometoken", "alice");

    expect(el.innerHTML).toContain("Signed in as");
    expect(el.innerHTML).toContain("@alice");
  });

  it("shows 'Not signed in' when authToken absent", async () => {
    const el = { innerHTML: "", addEventListener: () => {} };
    (globalThis as Record<string, unknown>).document = {
      getElementById: (_id: string) => el,
    };

    const { renderAuthState } = await import("../../entrypoints/options/index");
    renderAuthState(null, null);

    expect(el.innerHTML).toContain("Not signed in");
  });
});
