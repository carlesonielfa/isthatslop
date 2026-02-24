import { describe, test, expect, beforeEach } from "bun:test";
import { checkRateLimit, RATE_LIMITS, type RateLimitConfig } from "./rate-limiter";

/**
 * Bun's module cache means the module-level `store` Map is shared across all
 * tests in a file. We reset it by re-importing with a fresh mock of Date.now
 * — but the simpler approach is to exploit window expiry: set windowMs to a
 * very small value so that each test starts after the previous window expired,
 * OR use distinct keys per test so entries never collide.
 *
 * We use unique keys per test to keep things simple and fast.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nowMs = 1_000_000; // arbitrary epoch offset

// Override Date.now for deterministic time control
const originalDateNow = Date.now;

function setTime(ms: number) {
  nowMs = ms;
  Date.now = () => nowMs;
}

function advanceTime(ms: number) {
  nowMs += ms;
}

// Restore after each group if needed — we restore once at the end of the file.
// Individual tests call setTime() to reset to a known starting point.

const BASE_CONFIG: RateLimitConfig = { limit: 3, windowMs: 60_000 };

// Generate a unique key per test to avoid cross-test store pollution.
let keyCounter = 0;
function uniqueKey(prefix = "test") {
  return `${prefix}:${++keyCounter}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  beforeEach(() => {
    setTime(1_000_000);
  });

  describe("first request", () => {
    test("is allowed", () => {
      const result = checkRateLimit(uniqueKey(), BASE_CONFIG);
      expect(result.allowed).toBe(true);
    });

    test("returns remaining = limit - 1", () => {
      const result = checkRateLimit(uniqueKey(), BASE_CONFIG);
      expect(result.remaining).toBe(BASE_CONFIG.limit - 1);
    });

    test("returns retryAfter = 0", () => {
      const result = checkRateLimit(uniqueKey(), BASE_CONFIG);
      expect(result.retryAfter).toBe(0);
    });
  });

  describe("subsequent requests within the window", () => {
    test("all allowed up to and including the limit", () => {
      const key = uniqueKey();
      for (let i = 0; i < BASE_CONFIG.limit; i++) {
        const result = checkRateLimit(key, BASE_CONFIG);
        expect(result.allowed).toBe(true);
      }
    });

    test("remaining decrements with each call", () => {
      const key = uniqueKey();
      for (let i = 0; i < BASE_CONFIG.limit; i++) {
        const result = checkRateLimit(key, BASE_CONFIG);
        expect(result.remaining).toBe(BASE_CONFIG.limit - 1 - i);
      }
    });
  });

  describe("exceeding the limit", () => {
    test("request beyond the limit is blocked", () => {
      const key = uniqueKey();
      // Exhaust the limit
      for (let i = 0; i < BASE_CONFIG.limit; i++) {
        checkRateLimit(key, BASE_CONFIG);
      }
      const result = checkRateLimit(key, BASE_CONFIG);
      expect(result.allowed).toBe(false);
    });

    test("blocked result has remaining = 0", () => {
      const key = uniqueKey();
      for (let i = 0; i < BASE_CONFIG.limit; i++) {
        checkRateLimit(key, BASE_CONFIG);
      }
      const result = checkRateLimit(key, BASE_CONFIG);
      expect(result.remaining).toBe(0);
    });

    test("retryAfter is > 0 when blocked", () => {
      const key = uniqueKey();
      for (let i = 0; i < BASE_CONFIG.limit; i++) {
        checkRateLimit(key, BASE_CONFIG);
      }
      // Advance time slightly so we're still inside the window
      advanceTime(1_000);
      const result = checkRateLimit(key, BASE_CONFIG);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test("retryAfter uses Math.ceil — never 0 when blocked at window boundary", () => {
      const key = uniqueKey();
      const windowMs = 10_000; // 10 s window
      const config: RateLimitConfig = { limit: 1, windowMs };

      // Exhaust with one request
      checkRateLimit(key, config);

      // Advance to 1 ms before window expiry — retryAfter should be 1, not 0
      advanceTime(windowMs - 1);
      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);
      // (windowMs - elapsed) = 1 ms → ceil(1/1000) = 1
      expect(result.retryAfter).toBe(1);
    });

    test("retryAfter reflects time remaining in the window", () => {
      const key = uniqueKey();
      const windowMs = 60_000;
      const config: RateLimitConfig = { limit: 1, windowMs };

      checkRateLimit(key, config); // consume the single slot
      advanceTime(10_000); // 10 s into the window

      const result = checkRateLimit(key, config);
      // elapsed = 10_000, remaining = 50_000 ms → ceil(50_000/1000) = 50 s
      expect(result.retryAfter).toBe(50);
    });
  });

  describe("window expiry resets the counter", () => {
    test("request after window expiry is allowed again", () => {
      const key = uniqueKey();
      // Exhaust limit
      for (let i = 0; i < BASE_CONFIG.limit; i++) {
        checkRateLimit(key, BASE_CONFIG);
      }
      expect(checkRateLimit(key, BASE_CONFIG).allowed).toBe(false);

      // Jump past the window
      advanceTime(BASE_CONFIG.windowMs);
      const result = checkRateLimit(key, BASE_CONFIG);
      expect(result.allowed).toBe(true);
    });

    test("counter resets to 1 after window expiry", () => {
      const key = uniqueKey();
      for (let i = 0; i < BASE_CONFIG.limit; i++) {
        checkRateLimit(key, BASE_CONFIG);
      }

      advanceTime(BASE_CONFIG.windowMs);
      const result = checkRateLimit(key, BASE_CONFIG);
      // Fresh window: count = 1, remaining = limit - 1
      expect(result.remaining).toBe(BASE_CONFIG.limit - 1);
    });

    test("exactly at window boundary (elapsed === windowMs) starts a new window", () => {
      const key = uniqueKey();
      checkRateLimit(key, BASE_CONFIG); // first request

      // Advance exactly to windowMs — condition is `elapsed >= windowMs`
      advanceTime(BASE_CONFIG.windowMs);
      const result = checkRateLimit(key, BASE_CONFIG);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(BASE_CONFIG.limit - 1);
    });
  });

  describe("key isolation", () => {
    test("different keys have independent counters", () => {
      const keyA = uniqueKey("user-a");
      const keyB = uniqueKey("user-b");
      const config: RateLimitConfig = { limit: 1, windowMs: 60_000 };

      checkRateLimit(keyA, config); // exhaust A

      // B should still be allowed
      const result = checkRateLimit(keyB, config);
      expect(result.allowed).toBe(true);
    });

    test("blocking one key does not affect another", () => {
      const keyA = uniqueKey("user-a");
      const keyB = uniqueKey("user-b");
      const config: RateLimitConfig = { limit: 2, windowMs: 60_000 };

      // Exhaust A
      checkRateLimit(keyA, config);
      checkRateLimit(keyA, config);
      expect(checkRateLimit(keyA, config).allowed).toBe(false);

      // B is untouched — first call on B
      expect(checkRateLimit(keyB, config).allowed).toBe(true);
    });
  });
});

describe("RATE_LIMITS constants", () => {
  test("CLAIM_SUBMIT has limit 5 and 1-hour window", () => {
    expect(RATE_LIMITS.CLAIM_SUBMIT.limit).toBe(5);
    expect(RATE_LIMITS.CLAIM_SUBMIT.windowMs).toBe(60 * 60 * 1000);
  });

  test("VOTE has limit 50 and 1-hour window", () => {
    expect(RATE_LIMITS.VOTE.limit).toBe(50);
    expect(RATE_LIMITS.VOTE.windowMs).toBe(60 * 60 * 1000);
  });

  test("SOURCE_CREATE has limit 3 and 1-hour window", () => {
    expect(RATE_LIMITS.SOURCE_CREATE.limit).toBe(3);
    expect(RATE_LIMITS.SOURCE_CREATE.windowMs).toBe(60 * 60 * 1000);
  });

  test("COMMENT_SUBMIT has limit 10 and 1-hour window", () => {
    expect(RATE_LIMITS.COMMENT_SUBMIT.limit).toBe(10);
    expect(RATE_LIMITS.COMMENT_SUBMIT.windowMs).toBe(60 * 60 * 1000);
  });

  test("FLAG has limit 20 and 1-hour window", () => {
    expect(RATE_LIMITS.FLAG.limit).toBe(20);
    expect(RATE_LIMITS.FLAG.windowMs).toBe(60 * 60 * 1000);
  });

  test("all entries satisfy RateLimitConfig shape", () => {
    for (const [name, cfg] of Object.entries(RATE_LIMITS)) {
      expect(typeof cfg.limit, name).toBe("number");
      expect(typeof cfg.windowMs, name).toBe("number");
      expect(cfg.limit, name).toBeGreaterThan(0);
      expect(cfg.windowMs, name).toBeGreaterThan(0);
    }
  });
});

// Restore real Date.now after the test file finishes
// (Bun runs each file in a worker so this is belt-and-suspenders)
Date.now = originalDateNow;
