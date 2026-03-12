import { describe, it, expect, beforeEach } from "bun:test";
import { chromeMock } from "./mocks/chrome";
import {
  readAuthCookie,
  fetchUserData,
  checkAuth,
  authenticatedFetch,
} from "../lib/auth";

describe("readAuthCookie", () => {
  it("returns token value from __Secure- cookie name (prod)", async () => {
    const originalGet = chromeMock.cookies.get;
    chromeMock.cookies.get = async ({ name }: { url: string; name: string }) =>
      name === "__Secure-better-auth.session_token"
        ? { value: "tok123" }
        : null;
    const result = await readAuthCookie();
    expect(result).toBe("tok123");
    chromeMock.cookies.get = originalGet;
  });

  it("falls back to plain cookie name when __Secure- variant absent (dev)", async () => {
    const originalGet = chromeMock.cookies.get;
    chromeMock.cookies.get = async ({ name }: { url: string; name: string }) =>
      name === "better-auth.session_token" ? { value: "devtok" } : null;
    const result = await readAuthCookie();
    expect(result).toBe("devtok");
    chromeMock.cookies.get = originalGet;
  });

  it("returns null when neither cookie name is present", async () => {
    const originalGet = chromeMock.cookies.get;
    chromeMock.cookies.get = async () => null;
    const result = await readAuthCookie();
    expect(result).toBeNull();
    chromeMock.cookies.get = originalGet;
  });
});

describe("fetchUserData", () => {
  it("returns userId and username from get-session response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          session: { userId: "u1" },
          user: { id: "u1", username: "alice", displayUsername: "Alice" },
        }),
        { status: 200 },
      );
    const result = await fetchUserData("sometoken");
    expect(result).toEqual({ userId: "u1", username: "Alice" });
    globalThis.fetch = originalFetch;
  });

  it("uses username when displayUsername absent", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          session: { userId: "u2" },
          user: { id: "u2", username: "bob" },
        }),
        { status: 200 },
      );
    const result = await fetchUserData("sometoken");
    expect(result).toEqual({ userId: "u2", username: "bob" });
    globalThis.fetch = originalFetch;
  });

  it("returns null when response is not ok", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 401 });
    const result = await fetchUserData("badtoken");
    expect(result).toBeNull();
    globalThis.fetch = originalFetch;
  });

  it("returns null on network error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("network error");
    };
    const result = await fetchUserData("sometoken");
    expect(result).toBeNull();
    globalThis.fetch = originalFetch;
  });
});

describe("checkAuth (popup auth check)", () => {
  let originalGet: typeof chromeMock.storage.local.get;
  let originalSet: typeof chromeMock.storage.local.set;
  let originalCookiesGet: typeof chromeMock.cookies.get;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalGet = chromeMock.storage.local.get;
    originalSet = chromeMock.storage.local.set;
    originalCookiesGet = chromeMock.cookies.get;
    originalFetch = globalThis.fetch;
  });

  it("returns cached token from storage when authToken matches cookie", async () => {
    chromeMock.cookies.get = async ({ name }: { url: string; name: string }) =>
      name === "__Secure-better-auth.session_token"
        ? { value: "cached-tok" }
        : null;
    chromeMock.storage.local.get = async () => ({ authToken: "cached-tok" });

    const result = await checkAuth();
    expect(result).toBe("cached-tok");

    chromeMock.cookies.get = originalCookiesGet;
    chromeMock.storage.local.get = originalGet;
  });

  it("re-hydrates and stores data when cookie token differs from stored authToken", async () => {
    chromeMock.cookies.get = async ({ name }: { url: string; name: string }) =>
      name === "__Secure-better-auth.session_token"
        ? { value: "new-tok" }
        : null;
    chromeMock.storage.local.get = async () => ({ authToken: "old-tok" });

    const stored: Record<string, unknown> = {};
    chromeMock.storage.local.set = async (items: Record<string, unknown>) => {
      Object.assign(stored, items);
    };

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ user: { id: "u99", displayUsername: "Carol" } }),
        { status: 200 },
      );

    const result = await checkAuth();
    expect(result).toBe("new-tok");
    expect(stored.authToken).toBe("new-tok");
    expect(stored.userId).toBe("u99");
    expect(stored.username).toBe("Carol");

    chromeMock.cookies.get = originalCookiesGet;
    chromeMock.storage.local.get = originalGet;
    chromeMock.storage.local.set = originalSet;
    globalThis.fetch = originalFetch;
  });

  it("returns null when no cookie present", async () => {
    chromeMock.cookies.get = async () => null;
    const result = await checkAuth();
    expect(result).toBeNull();
    chromeMock.cookies.get = originalCookiesGet;
  });
});

describe("authenticatedFetch (AUTH-03)", () => {
  it("attaches Authorization: Bearer <token> header when authToken present in storage", async () => {
    const capturedHeaders: Record<string, string>[] = [];
    const originalGet = chromeMock.storage.local.get;
    chromeMock.storage.local.get = async () => ({ authToken: "mytoken" });
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const h =
        init?.headers instanceof Headers
          ? init.headers
          : new Headers(init?.headers);
      capturedHeaders.push(Object.fromEntries(h.entries()));
      return new Response(null, { status: 200 });
    };
    await authenticatedFetch("https://isthatslop.com/api/v1/claims", {});
    expect(capturedHeaders[0]?.["authorization"]).toBe("Bearer mytoken");
    chromeMock.storage.local.get = originalGet;
  });

  it("makes request without Authorization header when authToken absent from storage", async () => {
    const capturedHeaders: Record<string, string>[] = [];
    const originalGet = chromeMock.storage.local.get;
    chromeMock.storage.local.get = async () => ({});
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const h =
        init?.headers instanceof Headers
          ? init.headers
          : new Headers(init?.headers);
      capturedHeaders.push(Object.fromEntries(h.entries()));
      return new Response(null, { status: 200 });
    };
    await authenticatedFetch("https://isthatslop.com/api/v1/claims", {});
    expect(capturedHeaders[0]?.["authorization"]).toBeUndefined();
    chromeMock.storage.local.get = originalGet;
  });
});
