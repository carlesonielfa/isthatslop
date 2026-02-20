/**
 * In-memory fixed-window rate limiter.
 *
 * Uses a module-level Map as the store. Each entry tracks the count of
 * requests and the start of the current window. A cleanup interval runs
 * every 5 minutes to prevent unbounded memory growth.
 *
 * NOTE: This is process-local. In a multi-process or serverless deployment
 * each instance has its own store, so limits apply per-process. For a
 * distributed environment, replace the store with Redis.
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests allowed in the current window */
  remaining: number;
  /** Seconds until the window resets (0 when allowed) */
  retryAfter: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup entries whose window expired more than 5 minutes ago
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > EXPIRY_BUFFER_MS) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Check whether a given key is within the rate limit.
 *
 * @param key    - Unique identifier for the rate-limited action, e.g. `"claim:user-123"`
 * @param config - Rate limit configuration (limit and window)
 * @returns RateLimitResult with allowed flag, remaining count, and retryAfter seconds
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or window has expired — start a fresh window
  if (!entry || now - entry.windowStart >= config.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfter: 0,
    };
  }

  // Within the current window and over the limit
  if (entry.count >= config.limit) {
    const elapsed = now - entry.windowStart;
    const retryAfter = Math.ceil((config.windowMs - elapsed) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  // Within the current window and under the limit — increment
  entry.count += 1;
  store.set(key, entry);
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    retryAfter: 0,
  };
}

/**
 * Pre-configured rate limit constants.
 * Keys correspond to the type of mutation action.
 */
export const RATE_LIMITS = {
  CLAIM_SUBMIT: { limit: 5, windowMs: 60 * 60 * 1000 },
  VOTE: { limit: 50, windowMs: 60 * 60 * 1000 },
  SOURCE_CREATE: { limit: 3, windowMs: 60 * 60 * 1000 },
  COMMENT_SUBMIT: { limit: 10, windowMs: 60 * 60 * 1000 },
  FLAG: { limit: 20, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;
