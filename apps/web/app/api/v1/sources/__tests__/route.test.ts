import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { NextRequest } from "next/server";

// Build a chainable Drizzle mock that returns a configurable result
let mockDbResult: unknown[] = [];

const drizzleChain = {
  select: mock(() => drizzleChain),
  from: mock(() => drizzleChain),
  leftJoin: mock(() => drizzleChain),
  where: mock(() => drizzleChain),
  orderBy: mock(() => drizzleChain),
  limit: mock(async () => mockDbResult),
};

mock.module("@repo/database", () => ({
  db: drizzleChain,
  sources: {},
  sourceScoreCache: {},
  eq: mock(() => ({})),
  and: mock(() => ({})),
  isNull: mock(() => ({})),
  ilike: mock(() => ({})),
  desc: mock(() => ({})),
}));

mock.module("drizzle-orm", () => ({
  eq: mock(() => ({})),
  and: mock(() => ({})),
  isNull: mock(() => ({})),
  ilike: mock(() => ({})),
  desc: mock(() => ({})),
  sql: mock(() => ({})),
}));

const { GET } = await import("@/app/api/v1/sources/route");

function makeRequest(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest;
}

describe("GET /api/v1/sources", () => {
  beforeEach(() => {
    mockDbResult = [];
    Object.values(drizzleChain).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) {
        (fn as ReturnType<typeof mock>).mockClear();
      }
    });
    // Re-wire limit to return mockDbResult
    drizzleChain.limit.mockImplementation(async () => mockDbResult);
  });

  test("returns 400 when url param is missing", async () => {
    const req = makeRequest("http://localhost/api/v1/sources");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("returns 404 when no source matches the url", async () => {
    mockDbResult = [];
    const req = makeRequest("http://localhost/api/v1/sources?url=unknown.example.com");
    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("url");
  });

  test("returns 200 with source shape when url matches", async () => {
    mockDbResult = [
      {
        id: "uuid-1",
        name: "Test Source",
        slug: "test-source",
        type: "subreddit",
        url: "reddit.com/r/test",
        path: "uuid-1",
        depth: 1,
        tier: 2,
        rawScore: "1.50",
        normalizedScore: "0.45",
        claimCount: 5,
        approvalStatus: "approved",
      },
    ];
    const req = makeRequest("http://localhost/api/v1/sources?url=reddit.com/r/test");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("id", "uuid-1");
    expect(body).toHaveProperty("tier", 2);
    expect(body).toHaveProperty("score");
    expect(body.score).toHaveProperty("raw");
    expect(body.score).toHaveProperty("normalized");
    expect(body).toHaveProperty("claimCount", 5);
    // Internal fields must not leak
    expect(body).not.toHaveProperty("deletedAt");
    expect(body).not.toHaveProperty("createdByUserId");
  });

  test("returns tier:null when source has no score cache entry", async () => {
    mockDbResult = [
      {
        id: "uuid-2",
        name: "Unscored Source",
        slug: "unscored",
        type: null,
        url: "example.com",
        path: "uuid-2",
        depth: 0,
        tier: null,
        rawScore: null,
        normalizedScore: null,
        claimCount: null,
        approvalStatus: "approved",
      },
    ];
    const req = makeRequest("http://localhost/api/v1/sources?url=example.com");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBeNull();
    expect(body.claimCount).toBe(0); // null coerced to 0
  });
});
