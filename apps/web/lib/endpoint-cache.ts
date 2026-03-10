/**
 * In-memory TTL cache for expensive API route handlers.
 *
 * Stores the result of a computation in module-level memory and returns the
 * cached value on subsequent calls until the TTL expires. On expiry the next
 * call recomputes and repopulates the cache.
 *
 * Usage:
 *
 *   const cache = createEndpointCache({ ttlMs: 2 * 60 * 60 * 1000 });
 *
 *   export async function GET() {
 *     const data = await cache.get(() => expensiveDbQuery());
 *     return Response.json(data);
 *   }
 *
 * NOTE: This is process-local. In a multi-process or serverless deployment
 * each instance has its own cache, so TTLs are per-process. For a distributed
 * environment, replace with Redis or a shared cache layer.
 *
 * NOTE: Concurrent requests that arrive while the cache is cold (or expired)
 * will all trigger the recompute function simultaneously (thundering herd).
 * For low-traffic endpoints this is acceptable. For high-traffic endpoints
 * consider adding an in-flight deduplication lock.
 */

export interface EndpointCacheConfig {
  /** How long the cached value remains valid, in milliseconds */
  ttlMs: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface EndpointCache<T> {
  /**
   * Return the cached value if still valid, otherwise call `compute()`,
   * store the result, and return it.
   */
  get(compute: () => Promise<T>): Promise<T>;
  /** Invalidate the cache immediately, forcing recompute on next call */
  invalidate(): void;
}

/**
 * Create an in-memory TTL cache for a single endpoint's response.
 *
 * @param config - Cache configuration (ttlMs)
 * @returns EndpointCache with get() and invalidate() methods
 */
export function createEndpointCache<T>(
  config: EndpointCacheConfig,
): EndpointCache<T> {
  let entry: CacheEntry<T> | null = null;

  return {
    async get(compute) {
      if (entry && Date.now() < entry.expiresAt) {
        return entry.value;
      }
      const value = await compute();
      entry = { value, expiresAt: Date.now() + config.ttlMs };
      return value;
    },
    invalidate() {
      entry = null;
    },
  };
}
