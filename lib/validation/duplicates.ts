/**
 * Pure duplicate-detection utilities.
 * No database calls — accepts pre-fetched data so tests run without a DB.
 *
 * The batch import route fetches existing node data from the DB and passes
 * it here as plain arrays.
 */

export interface TitleMatch {
  id: string;
  title: string;
  similarity: number; // Jaccard similarity 0–1
}

export interface InBatchDuplicate {
  index: number;
  id: string;
  title: string;
}

// ── Title similarity ──────────────────────────────────────────────────────────

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2), // ignore short words / stop words
  );
}

/**
 * Jaccard similarity between two title word-sets.
 * Returns 0–1 where 1.0 = identical word sets.
 */
export function titleSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Checks a list of candidate existing nodes for titles similar to `title`.
 * Returns matches above the similarity threshold, sorted descending.
 *
 * @param title       - title from the incoming node
 * @param candidates  - existing nodes from the DB or current batch
 * @param threshold   - Jaccard threshold to flag (default 0.7 = 70% word overlap)
 */
export function findSimilarTitles(
  title: string,
  candidates: { id: string; title: string }[],
  threshold = 0.7,
): TitleMatch[] {
  return candidates
    .map(c => ({ id: c.id, title: c.title, similarity: titleSimilarity(title, c.title) }))
    .filter(r => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

// ── In-batch duplicate detection ─────────────────────────────────────────────

/**
 * Checks for exact ID duplicates and similar titles WITHIN a single import batch.
 * Returns a map of node index → list of conflicting nodes (earlier in batch).
 *
 * Call this after collecting all input nodes, before any DB queries.
 */
export function detectInBatchDuplicates(nodes: { id: string; title: string }[]): {
  duplicateIds: Map<string, number[]>;   // id → indices that share it
  similarPairs: Array<{ a: number; b: number; similarity: number }>;
} {
  // Exact ID duplicates
  const idMap = new Map<string, number[]>();
  nodes.forEach(({ id }, i) => {
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id)!.push(i);
  });
  const duplicateIds = new Map(
    [...idMap.entries()].filter(([, indices]) => indices.length > 1),
  );

  // Similar title pairs (O(n²) — acceptable for n ≤ 50)
  const similarPairs: Array<{ a: number; b: number; similarity: number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const sim = titleSimilarity(nodes[i].title, nodes[j].title);
      if (sim >= 0.7) similarPairs.push({ a: i, b: j, similarity: sim });
    }
  }

  return { duplicateIds, similarPairs };
}
