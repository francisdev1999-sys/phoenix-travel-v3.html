/**
 * In-memory sliding-window rate limiter.
 *
 * Works for single-process deployments (Railway default).
 * For multi-instance: replace the Map with Upstash Redis.
 *
 * State lives on globalThis so it survives Next.js hot-module reloads in dev
 * without accumulating duplicate instances.
 */

interface Window {
  count:   number;
  resetAt: number;
}

const g = globalThis as unknown as { _rlStore?: Map<string, Window> };
if (!g._rlStore) g._rlStore = new Map<string, Window>();
const store = g._rlStore;

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   number;
  limit:     number;
}

/**
 * Check and increment the rate counter for a given key.
 *
 * @param key       Unique identifier — e.g. `ip:1.2.3.4` or `user:abc123`
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(
  key:      string,
  limit:    number,
  windowMs: number,
): RateLimitResult {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs, limit };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt, limit };
}

/** Attach standard rate-limit headers to a Response. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)),
    'Retry-After':           result.allowed ? '' : String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}

// Prune expired entries every 5 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, w] of store.entries()) {
    if (now >= w.resetAt) store.delete(k);
  }
}, 5 * 60 * 1000);
