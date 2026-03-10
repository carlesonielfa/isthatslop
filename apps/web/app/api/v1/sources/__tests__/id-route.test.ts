import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { NextRequest } from "next/server";

let mockDbResult: unknown[] = [];

const drizzleChain = {
  select: mock(() => drizzleChain),
  from: mock(() => drizzleChain),
  leftJoin: mock(() => drizzleChain),
  where: mock(() => drizzleChain),
  limit: mock(async () => mockDbResult),
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
}));

mock.module("@/lib/rate-limiter", () => ({
  checkRateLimit: mock(() => ({ allowed: true, retryAfter: 0 })),
  RATE_LIMITS: { API_LOOKUP: {} },
}));

const { GET } = await import("@/app/api/v1/sources/[id]/route");

function makeRequest(
  id: string,
): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new Request(
    `http://localhost/api/v1/sources/${id}`,
  ) as unknown as NextRequest;
  const params = Promise.resolve({ id });
  return [req, { params }];
}

describe("GET /api/v1/sources/:id", () => {
  beforeEach(() => {
    mockDbResult = [];
    drizzleChain.limit.mockImplementation(async () => mockDbResult);
  });

  test("returns 400 for a non-UUID id", async () => {
    const [req, ctx] = makeRequest("not-a-uuid");
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("returns 400 for an empty id", async () => {
    const [req, ctx] = makeRequest("");
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  test("returns 404 when source is not found", async () => {
    mockDbResult = [];
    const [req, ctx] = makeRequest("550e8400-e29b-41d4-a716-446655440000");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("returns 200 with id, name, tier, claimCount for known source", async () => {
    mockDbResult = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Test Source",
        tier: 3,
        claimCount: 7,
      },
    ];
    const [req, ctx] = makeRequest("550e8400-e29b-41d4-a716-446655440000");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("id", "550e8400-e29b-41d4-a716-446655440000");
    expect(body).toHaveProperty("name", "Test Source");
    expect(body).toHaveProperty("tier", 3);
    expect(body).toHaveProperty("claimCount", 7);
    // Internal fields must not appear
    expect(body).not.toHaveProperty("approvalStatus");
    expect(body).not.toHaveProperty("deletedAt");
  });

  test("returns tier:null and claimCount:0 for unscored source", async () => {
    mockDbResult = [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Unscored",
        tier: null,
        claimCount: null,
      },
    ];
    const [req, ctx] = makeRequest("550e8400-e29b-41d4-a716-446655440001");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBeNull();
    expect(body.claimCount).toBe(0);
  });
});
