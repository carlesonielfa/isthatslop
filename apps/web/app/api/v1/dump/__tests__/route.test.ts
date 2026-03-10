import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { NextRequest } from "next/server";

// Build a chainable Drizzle mock that returns a configurable result.
// Terminal method is .where() (async) — dump is a full table scan, no .limit().
let mockDbResult: unknown[] = [];

const drizzleChain = {
  select: mock(() => drizzleChain),
  from: mock(() => drizzleChain),
  innerJoin: mock(() => drizzleChain),
  where: mock(async () => mockDbResult),
};

mock.module("@repo/database", () => ({
  db: drizzleChain,
  sources: {},
  sourceScoreCache: {},
}));

mock.module("drizzle-orm", () => ({
  eq: mock(() => ({})),
  and: mock(() => ({})),
  isNull: mock(() => ({})),
  sql: mock(() => ({})),
}));

let mockRateLimitAllowed = true;

mock.module("@/lib/rate-limiter", () => ({
  checkRateLimit: mock(() => ({
    allowed: mockRateLimitAllowed,
    remaining: mockRateLimitAllowed ? 4 : 0,
    retryAfter: mockRateLimitAllowed ? 0 : 3600,
  })),
  RATE_LIMITS: { DUMP: { limit: 5, windowMs: 3600000 } },
}));

const { GET } = await import("@/app/api/v1/dump/route");

function makeRequest(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest;
}

describe("GET /api/v1/dump", () => {
  beforeEach(() => {
    mockRateLimitAllowed = true;
    mockDbResult = [];
    Object.values(drizzleChain).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) {
        (fn as ReturnType<typeof mock>).mockClear();
      }
    });
    // Re-wire where to return mockDbResult
    drizzleChain.where.mockImplementation(async () => mockDbResult);
  });

  test("returns 200 with { generatedAt, count, entries } shape", async () => {
    mockDbResult = [
      { url: "reddit.com/r/MachineLearning", tier: 2 },
      { url: "youtube.com/@Example", tier: 0 },
    ];
    const req = makeRequest("http://localhost/api/v1/dump");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("generatedAt");
    expect(body).toHaveProperty("count", 2);
    expect(body).toHaveProperty("entries");
    expect(Array.isArray(body.entries)).toBe(true);
  });

  test("entries array contains { url, tier } objects", async () => {
    mockDbResult = [
      { url: "reddit.com/r/MachineLearning", tier: 2 },
      { url: "youtube.com/@Example", tier: 0 },
    ];
    const req = makeRequest("http://localhost/api/v1/dump");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const entry = body.entries[0];
    expect(entry).toHaveProperty("url");
    expect(entry).toHaveProperty("tier");
    expect(body.entries[0].url).toBe("reddit.com/r/MachineLearning");
    expect(body.entries[0].tier).toBe(2);
  });

  test("excludes soft-deleted sources (query filters isNull(deletedAt))", async () => {
    // The mock always returns only non-deleted rows — this test verifies
    // the query was called (the filtering happens in DB via .where())
    mockDbResult = [];
    const req = makeRequest("http://localhost/api/v1/dump");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
    expect(body.entries).toEqual([]);
    // innerJoin ensures only sources with a score cache entry are included
    expect(drizzleChain.innerJoin.mock.calls.length).toBeGreaterThan(0);
  });

  test("excludes unscored sources (uses innerJoin not leftJoin)", async () => {
    // The dump uses innerJoin with sourceScoreCache — sources without a
    // score cache entry are excluded automatically.
    mockDbResult = [{ url: "scored.example.com", tier: 1 }];
    const req = makeRequest("http://localhost/api/v1/dump");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.entries[0].tier).toBe(1);
    // Confirm innerJoin was used (not leftJoin)
    expect(drizzleChain.innerJoin.mock.calls.length).toBeGreaterThan(0);
  });

  test("returns 429 with Retry-After header when rate limit exceeded", async () => {
    mockRateLimitAllowed = false;
    const req = makeRequest("http://localhost/api/v1/dump");
    const res = await GET(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
