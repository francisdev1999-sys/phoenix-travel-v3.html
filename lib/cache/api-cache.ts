/**
 * Tiny in-process TTL cache for hot, public, read-only API responses
 * (landing stats, galaxies, activity feed, trending). The app runs as a
 * single Node process on Railway, so this removes nearly all repeat DB work
 * for landing-page traffic — the difference between every visitor paying
 * 4-5 DB round trips and only the first visitor per TTL window paying them.
 *
 * Values must be JSON-serializable. Failures are never cached.
 */

interface Entry { value: unknown; expiresAt: number }

const globalStore = globalThis as unknown as { __apiCache?: Map<string, Entry> };
const store: Map<string, Entry> = globalStore.__apiCache ?? new Map();
globalStore.__apiCache = store;

const MAX_ENTRIES = 200;

export async function cachedJson<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value as T;

  const value = await compute();

  if (store.size >= MAX_ENTRIES) {
    // Drop the oldest entry (Map preserves insertion order).
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** For tests / targeted invalidation. */
export function invalidateApiCache(prefix?: string): void {
  if (!prefix) { store.clear(); return; }
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
