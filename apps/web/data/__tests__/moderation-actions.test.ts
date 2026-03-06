import { describe, it, expect, mock } from "bun:test";

// Mock the database module before importing the functions under test
mock.module("@repo/database", () => ({
  db: {
    select: mock(() => {}),
    insert: mock(() => {}),
    update: mock(() => {}),
  },
}));

// Mock auth module
mock.module("@/app/lib/auth.server", () => ({
  getCurrentUser: mock(() => Promise.resolve(null)),
  isEmailVerified: mock(() => Promise.resolve(false)),
  isModerator: mock(() => Promise.resolve(false)),
}));

// Mock rate limiter
mock.module("@/lib/rate-limiter", () => ({
  checkRateLimit: mock(() => ({ allowed: true, retryAfter: 0 })),
  RATE_LIMITS: { FLAG: {} },
}));

import { flagContent } from "../moderation-actions";
import { getCurrentUser, isEmailVerified } from "@/app/lib/auth.server";

describe("flagContent", () => {
  it("returns auth error when user not logged in", async () => {
    (getCurrentUser as ReturnType<typeof mock>).mockImplementation(() =>
      Promise.resolve(null),
    );

    const result = await flagContent({
      targetType: "claim",
      targetId: "t1",
      reason: "spam",
    });

    expect(result).toEqual({
      success: false,
      error: "You must be logged in to flag content",
    });
  });

  it("returns verification error when email not verified", async () => {
    (getCurrentUser as ReturnType<typeof mock>).mockImplementation(() =>
      Promise.resolve({ id: "u1" }),
    );
    (isEmailVerified as ReturnType<typeof mock>).mockImplementation(() =>
      Promise.resolve(false),
    );

    const result = await flagContent({
      targetType: "claim",
      targetId: "t1",
      reason: "spam",
    });

    expect(result).toEqual({
      success: false,
      error: "Please verify your email address before flagging content",
    });
  });

  it("proceeds past auth checks when verified", async () => {
    (getCurrentUser as ReturnType<typeof mock>).mockImplementation(() =>
      Promise.resolve({ id: "u1" }),
    );
    (isEmailVerified as ReturnType<typeof mock>).mockImplementation(() =>
      Promise.resolve(true),
    );

    const result = await flagContent({
      targetType: "claim",
      targetId: "t1",
      reason: "spam",
    });

    // Should not be the auth or verification error strings
    expect(result.error).not.toBe("You must be logged in to flag content");
    expect(result.error).not.toBe(
      "Please verify your email address before flagging content",
    );
  });
});
