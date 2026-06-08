/**
 * In-process LRU cache for hot nodes and graph viewport data.
 *
 * Layer 1 in the retrieval stack:
 *   LRU (60s TTL) → AdjacencyCache (DB materialized) → Live DB query
 *
 * Uses a hand-rolled LRU backed by Map insertion order so we don't need
 * an external dependency. At 10K nodes, 500 entries × ~4KB each ≈ 2MB RAM.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LRUCache<T> {
  private readonly map = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // Re-insert to mark as recently used
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.maxSize) {
      // Evict the oldest (first) entry
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

// Singletons — survive across requests in long-running Next.js processes.
// In serverless environments these reset per cold start, which is acceptable.
const globalCache = globalThis as unknown as {
  _nodeCache: LRUCache<object>;
  _viewportCache: LRUCache<object>;
};

if (!globalCache._nodeCache) {
  globalCache._nodeCache = new LRUCache(500, 60_000);        // 500 nodes, 60s TTL
}
if (!globalCache._viewportCache) {
  globalCache._viewportCache = new LRUCache(20, 300_000);    // 20 viewports, 5m TTL
}

export const nodeCache     = globalCache._nodeCache     as LRUCache<object>;
export const viewportCache = globalCache._viewportCache as LRUCache<object>;

/** Invalidate a single node from the LRU cache after a write. */
export function invalidateNode(nodeId: string): void {
  nodeCache.delete(nodeId);
  // Also clear viewport caches since they embed node summaries
  viewportCache.clear();
}
