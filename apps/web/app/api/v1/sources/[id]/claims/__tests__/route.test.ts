import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { NextRequest } from "next/server";
import type { AuthResult } from "@/app/api/v1/lib/auth";

// Build a chainable Drizzle mock that supports both SELECT and INSERT chains
let mockSelectResult: unknown[] = [{ id: "source-uuid-1" }];
let mockInsertResult: unknown[] = [{ id: "claim-uuid-1" }];

const drizzleInsertChain = {
  values: mock(() => drizzleInsertChain),
  returning: mock(async () => mockInsertResult),
};

const drizzleSelectChain = {
  select: mock(() => drizzleSelectChain),
  from: mock(() => drizzleSelectChain),
  where: mock(() => drizzleSelectChain),
  limit: mock(async () => mockSelectResult),
};

const drizzleChain = {
  ...drizzleSelectChain,
  insert: mock(() => drizzleInsertChain),
};

// mock.module() calls BEFORE the top-level await import of the route
mock.module("@repo/database", () => ({
  db: drizzleChain,
  claims: {},
  sources: {},
}));

const requireAuthMock = mock(async (): Promise<AuthResult> => ({
  ok: true,
  userId: "user-uuid-1",
}));
mock.module("@/app/api/v1/lib/auth", () => ({
  requireAuth: requireAuthMock,
}));

const getSessionMock = mock(async () => ({
  user: { emailVerified: true },
}));
mock.module("@/app/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

const checkRateLimitMock = mock(() => ({ allowed: true, retryAfter: 0 }));
mock.module("@/lib/rate-limiter", () => ({
  checkRateLimit: checkRateLimitMock,
  RATE_LIMITS: { CLAIM_SUBMIT: {} },
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
  params: { id: string },
  body: unknown,
  headers?: Record<string, string>,
): NextRequest {
  const req = new Request(
    `http://localhost/api/v1/sources/${params.id}/claims`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    },
  );
  return req as unknown as NextRequest;
}

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_BODY = {
  content: "a".repeat(100),
  impact: 3,
  confidence: 4,
};

describe("POST /api/v1/sources/:id/claims", () => {
  beforeEach(() => {
    // Reset to happy-path defaults
    mockSelectResult = [{ id: "source-uuid-1" }];
    mockInsertResult = [{ id: "claim-uuid-1" }];

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

    // Re-wire chains
    drizzleSelectChain.limit.mockImplementation(async () => mockSelectResult);
    drizzleInsertChain.returning.mockImplementation(
      async () => mockInsertResult,
    );
  });

  test("returns 201 with { claimId, sourceId } when authenticated and valid", async () => {
    const req = makeRequest({ id: VALID_UUID }, VALID_BODY);
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("claimId", "claim-uuid-1");
    expect(body).toHaveProperty("sourceId", VALID_UUID);
  });

  test("returns 401 when unauthenticated", async () => {
    requireAuthMock.mockImplementation(async () => ({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }));
    const req = makeRequest({ id: VALID_UUID }, VALID_BODY);
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(401);
  });

  test("returns 403 when email is not verified", async () => {
    getSessionMock.mockImplementation(async () => ({
      user: { emailVerified: false },
    }));
    const req = makeRequest({ id: VALID_UUID }, VALID_BODY);
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty("error", "Email verification required");
  });

  test("returns 429 when rate limited", async () => {
    checkRateLimitMock.mockImplementation(() => ({
      allowed: false,
      retryAfter: 60,
    }));
    const req = makeRequest({ id: VALID_UUID }, VALID_BODY);
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  test("returns 422 when impact is out of range (0)", async () => {
    const req = makeRequest({ id: VALID_UUID }, { ...VALID_BODY, impact: 0 });
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("returns 422 when impact is out of range (6)", async () => {
    const req = makeRequest({ id: VALID_UUID }, { ...VALID_BODY, impact: 6 });
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(422);
  });

  test("returns 422 when confidence is out of range (0)", async () => {
    const req = makeRequest(
      { id: VALID_UUID },
      { ...VALID_BODY, confidence: 0 },
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("returns 422 when content is too short (99 chars)", async () => {
    const req = makeRequest(
      { id: VALID_UUID },
      { ...VALID_BODY, content: "a".repeat(99) },
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(422);
  });

  test("returns 422 when content is too long (2001 chars)", async () => {
    const req = makeRequest(
      { id: VALID_UUID },
      { ...VALID_BODY, content: "a".repeat(2001) },
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(422);
  });

  test("returns 404 when source does not exist", async () => {
    mockSelectResult = [];
    drizzleSelectChain.limit.mockImplementation(async () => []);
    const req = makeRequest({ id: VALID_UUID }, VALID_BODY);
    const res = await POST(req, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error", "Source not found");
  });

  test("returns 400 when source id is not a valid UUID", async () => {
    const invalidId = "not-a-uuid";
    const req = makeRequest({ id: invalidId }, VALID_BODY);
    const res = await POST(req, { params: Promise.resolve({ id: invalidId }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error", "Invalid source ID");
  });
});
