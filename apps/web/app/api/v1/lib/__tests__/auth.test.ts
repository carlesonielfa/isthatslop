import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { NextRequest } from "next/server";

// Mock before importing the module under test
const mockGetSession = mock(async () => null);

mock.module("@/app/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

// Dynamic import AFTER mocks are set up
const { requireAuth } = await import("@/app/api/v1/lib/auth");

describe("requireAuth", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetSession.mockImplementation(async () => null);
  });

  test("returns ok:false and 401 Response when getSession returns null", async () => {
    const req = new Request(
      "http://localhost/api/v1/sources/some-id",
    ) as unknown as NextRequest;
    const result = await requireAuth(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body).toHaveProperty("error");
    }
  });

  test("returns ok:true with userId when getSession returns a valid session", async () => {
    mockGetSession.mockImplementation(async () => ({
      user: { id: "user-123", email: "test@example.com" },
      session: { id: "session-abc" },
    }));
    const req = new Request(
      "http://localhost/api/v1/sources/some-id",
    ) as unknown as NextRequest;
    const result = await requireAuth(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("user-123");
    }
  });
});
