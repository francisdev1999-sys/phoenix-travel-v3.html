/**
 * Sliding-window rate limiter.
 *
 * Primary: Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *   - Works across multiple Railway instances
 *   - Uses Redis INCR + EXPIRE for atomic counting
 *
 * Fallback: in-memory Map on globalThis
 *   - Works for single-process deployments (Railway default)
 *   - State survives Next.js hot-module reloads in dev
 *
 * The fallback activates automatically when Upstash env vars are absent,
 * so no code changes needed when transitioning.
 */

import { Redis } from '@upstash/redis';

// ── Upstash client (lazy — only constructed when env vars are present) ─────────

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ── In-memory fallback ────────────────────────────────────────────────────────

interface Window {
  count:   number;
  resetAt: number;
}

const g = globalThis as unknown as { _rlStore?: Map<string, Window> };
if (!g._rlStore) g._rlStore = new Map<string, Window>();
const memStore = g._rlStore;

// Prune expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, w] of memStore.entries()) {
    if (now >= w.resetAt) memStore.delete(k);
  }
}, 5 * 60 * 1000);

// ── Shared result type ────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   number;
  limit:     number;
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Check and increment the rate counter for a given key.
 *
 * @param key       Unique identifier — e.g. `ip:1.2.3.4` or `user:abc123`
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export async function rateLimit(
  key:      string,
  limit:    number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (redis) {
    return rateLimitRedis(key, limit, windowMs);
  }
  return rateLimitMemory(key, limit, windowMs);
}

async function rateLimitRedis(
  key:      string,
  limit:    number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const windowSec = Math.ceil(windowMs / 1000);
  const now = Date.now();

  try {
    // INCR is atomic — safe across instances
    const count = await redis!.incr(redisKey);
    if (count === 1) {
      await redis!.expire(redisKey, windowSec);
    }
    const ttlSec = await redis!.ttl(redisKey);
    const resetAt = now + ttlSec * 1000;

    if (count > limit) {
      return { allowed: false, remaining: 0, resetAt, limit };
    }
    return { allowed: true, remaining: limit - count, resetAt, limit };
  } catch {
    // Redis error — fall through to memory limiter
    return rateLimitMemory(key, limit, windowMs);
  }
}

function rateLimitMemory(
  key:      string,
  limit:    number,
  windowMs: number,
): RateLimitResult {
  const now   = Date.now();
  const entry = memStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs, limit };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt, limit };
}

// ── Header helper ─────────────────────────────────────────────────────────────

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)),
    'Retry-After':           result.allowed ? '' : String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}
