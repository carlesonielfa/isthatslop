import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { NextRequest } from "next/server";

// Build a chainable Drizzle mock that supports INSERT chain
let mockInsertResult: unknown[] = [{ id: "source-uuid-1" }];

const drizzleInsertChain = {
  values: mock(() => drizzleInsertChain),
  returning: mock(async () => mockInsertResult),
};

const drizzleUpdateChain = {
  set: mock(() => drizzleUpdateChain),
  where: mock(async () => undefined),
};

const drizzleChain = {
  insert: mock(() => drizzleInsertChain),
  update: mock(() => drizzleUpdateChain),
};

// mock.module() calls BEFORE the top-level await import of the route
mock.module("@repo/database", () => ({
  db: drizzleChain,
  sources: {},
  sourceScoreCache: {},
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requireAuthMock = mock(async (): Promise<any> => ({
  ok: true,
  userId: "user-uuid-1",
}));
mock.module("@/app/api/v1/lib/auth", () => ({
  requireAuth: requireAuthMock,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSessionMock = mock(async (): Promise<any> => ({
  user: { emailVerified: true },
}));
mock.module("@/app/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

const checkRateLimitMock = mock(() => ({ allowed: true, retryAfter: 0 }));
mock.module("@/lib/rate-limiter", () => ({
  checkRateLimit: checkRateLimitMock,
  RATE_LIMITS: { SOURCE_CREATE: {} },
}));

mock.module("drizzle-orm", () => ({
  eq: mock(() => ({})),
  and: mock(() => ({})),
  isNull: mock(() => ({})),
  sql: mock(() => ({})),
}));

// Use top-level await import AFTER mock.module() calls
const { POST } = await import("../route");

function makeRequest(
  body: unknown,
  headers?: Record<string, string>,
): NextRequest {
  const req = new Request("http://localhost/api/v1/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return req as unknown as NextRequest;
}

const VALID_BODY = {
  name: "Test Source",
  url: "https://example.com",
};

describe("POST /api/v1/sources", () => {
  beforeEach(() => {
    mockInsertResult = [{ id: "source-uuid-1" }];

    requireAuthMock.mockImplementation(async () => ({
      ok: true,
      userId: "user-uuid-1",
    }));
    getSessionMock.mockImplementation(async () => ({
      user: { emailVerified: true },
    }));
    checkRateLimitMock.mockImplementation(() => ({
      allowed: true,
      retryAfter: 0,
    }));

    drizzleInsertChain.returning.mockImplementation(
      async () => mockInsertResult,
    );
  });

  test("returns 201 with { id, name } when authenticated and valid", async () => {
    const req = makeRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("id", "source-uuid-1");
    expect(body).toHaveProperty("name", VALID_BODY.name);
  });

  test("returns 401 when unauthenticated", async () => {
    requireAuthMock.mockImplementation(async () => ({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }));
    const req = makeRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("returns 403 when email is not verified", async () => {
    getSessionMock.mockImplementation(async () => ({
      user: { emailVerified: false },
    }));
    const req = makeRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  test("returns 400 when URL is missing", async () => {
    const req = makeRequest({ name: "Test Source" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 when URL is invalid", async () => {
    const req = makeRequest({ name: "Test Source", url: "not-a-url" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 when name is empty", async () => {
    const req = makeRequest({ name: "", url: "https://example.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
