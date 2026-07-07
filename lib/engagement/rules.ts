/**
 * Engagement rules — the single source of truth for XP, ranks, streaks,
 * achievements and the deterministic daily quest. PURE and unit-tested so the
 * client store (lib/store/userStore) and the server (/api/user/engagement)
 * apply identical logic and can never drift.
 *
 * Values mirror the design handoff exactly (Part 1 → "Engagement/state rules").
 */

// ── Ranks ─────────────────────────────────────────────────────────────────────

export interface Rank { name: string; minXP: number }

export const RANKS: Rank[] = [
  { name: 'Novice',       minXP: 0 },
  { name: 'Researcher',   minXP: 75 },
  { name: 'Investigator', minXP: 200 },
  { name: 'Field Agent',  minXP: 400 },
  { name: 'Archivist',    minXP: 700 },
  { name: 'Nexus Keeper', minXP: 1200 },
];

/** Current rank for a given XP total. */
export function rankForXp(xp: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (xp >= r.minXP) current = r;
  return current;
}

/** Next rank + XP still needed, or null once at the top. */
export function nextRank(xp: number): { name: string; minXP: number; xpNeeded: number } | null {
  const upcoming = RANKS.find(r => r.minXP > xp);
  return upcoming ? { name: upcoming.name, minXP: upcoming.minXP, xpNeeded: upcoming.minXP - xp } : null;
}

/** 0..1 progress through the current rank band (1 when maxed out). */
export function rankProgress(xp: number): number {
  const cur = rankForXp(xp);
  const nxt = nextRank(xp);
  if (!nxt) return 1;
  const span = nxt.minXP - cur.minXP;
  return span <= 0 ? 1 : Math.min(1, Math.max(0, (xp - cur.minXP) / span));
}

// ── XP awards ─────────────────────────────────────────────────────────────────

export type XpEvent =
  | 'node_first_visit'   // +10 — first time opening a node
  | 'rabbit_hop'         // +15 — each rabbit-hole hop
  | 'bookmark'           // +5  — bookmarking a node
  | 'new_connection'     // +20 — discovering a new node pair
  | 'daily_mystery'      // +25 — opening today's mystery
  | 'daily_quest'        // +40 — completing today's quest
  | 'proposal'           // +30 — proposing a node
  | 'expedition_save'    // +10 — saving a named expedition
  | 'achievement';       // +15 — each achievement unlock

export const XP_TABLE: Record<XpEvent, number> = {
  node_first_visit: 10,
  rabbit_hop:       15,
  bookmark:         5,
  new_connection:   20,
  daily_mystery:    25,
  daily_quest:      40,
  proposal:         30,
  expedition_save:  10,
  achievement:      15,
};

// ── Achievements ──────────────────────────────────────────────────────────────

export interface AchievementDef {
  key:  string;
  icon: string;             // lucide-react icon name
  name: string;
  desc: string;
  /** Current progress toward `goal`, computed from engagement state. */
  metric: (s: AchievementState) => number;
  goal: number;
}

/** Minimal shape the achievement metrics read from. */
export interface AchievementState {
  visitedCount:      number;
  connectionsCount:  number;
  maxDepth:          number;
  expeditionsCount:  number;
  bookmarksCount:    number;
  collectionsCount:  number;
  proposalsCount:    number;
  questCompleted:    boolean;
  streak:            number;
}

export const ACHIEVEMENT_XP = XP_TABLE.achievement;

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first-steps',       icon: 'footprints', name: 'First Steps',       desc: 'Read your first node',            metric: s => s.visitedCount,     goal: 1 },
  { key: 'curious-mind',      icon: 'book-open',  name: 'Curious Mind',      desc: 'Explore 10 nodes',                metric: s => s.visitedCount,     goal: 10 },
  { key: 'omnivore',          icon: 'library',    name: 'Omnivore',          desc: 'Explore 25 nodes',                metric: s => s.visitedCount,     goal: 25 },
  { key: 'connector',         icon: 'waypoints',  name: 'Connector',         desc: 'Trace your first connection',     metric: s => s.connectionsCount, goal: 1 },
  { key: 'web-weaver',        icon: 'spline',     name: 'Web Weaver',        desc: 'Discover 10 connections',         metric: s => s.connectionsCount, goal: 10 },
  { key: 'deep-diver',        icon: 'rabbit',     name: 'Deep Diver',        desc: 'Reach depth 5 in a rabbit hole',  metric: s => s.maxDepth,         goal: 5 },
  { key: 'expedition-leader', icon: 'flag',       name: 'Expedition Leader', desc: 'Save a named expedition',         metric: s => s.expeditionsCount, goal: 1 },
  { key: 'curator',           icon: 'bookmark',   name: 'Curator',           desc: 'Bookmark 5 nodes',                metric: s => s.bookmarksCount,   goal: 5 },
  { key: 'librarian',         icon: 'folder-open',name: 'Librarian',         desc: 'Create a collection',             metric: s => s.collectionsCount, goal: 1 },
  { key: 'contributor',       icon: 'file-plus',  name: 'Contributor',       desc: 'Propose a node',                  metric: s => s.proposalsCount,   goal: 1 },
  { key: 'marksman',          icon: 'target',     name: 'Marksman',          desc: 'Complete a daily quest',          metric: s => (s.questCompleted ? 1 : 0), goal: 1 },
  { key: 'devoted',           icon: 'flame',      name: 'Devoted',           desc: 'Reach a 3-day streak',            metric: s => s.streak,           goal: 3 },
];

/**
 * Given the current state and the set of already-unlocked achievement keys,
 * return the keys that have *newly* met their goal. Pure and idempotent —
 * previously-unlocked keys are never returned again.
 */
export function evaluateAchievements(state: AchievementState, alreadyUnlocked: readonly string[]): string[] {
  const have = new Set(alreadyUnlocked);
  return ACHIEVEMENTS
    .filter(a => !have.has(a.key) && a.metric(state) >= a.goal)
    .map(a => a.key);
}

// ── Streak ────────────────────────────────────────────────────────────────────

/** UTC day number (days since epoch) for a timestamp. */
export function dayNumber(now: number): number {
  return Math.floor(now / 86_400_000);
}

/**
 * Compute the new streak given the last-active day and today.
 * - same day        → unchanged
 * - consecutive day  → +1
 * - gap > 1 day      → reset to 1
 * First-ever activity (lastActiveDay null/undefined) starts the streak at 1.
 */
export function computeStreak(
  lastActiveDay: number | null | undefined,
  today: number,
  currentStreak: number,
): number {
  if (lastActiveDay == null) return Math.max(1, currentStreak === 0 ? 1 : currentStreak);
  if (today === lastActiveDay) return Math.max(1, currentStreak);
  if (today === lastActiveDay + 1) return currentStreak + 1;
  return 1; // missed one or more days
}

// ── Deterministic daily quest ─────────────────────────────────────────────────

/** A minimal graph shape the quest picker needs. */
export interface QuestGraph {
  nodeIds: string[];
  adjacency: Map<string, Set<string>>; // undirected
}

/** Build an undirected adjacency map from edge endpoint pairs. */
export function buildAdjacency(nodeIds: string[], pairs: Array<[string, string]>): QuestGraph {
  const set = new Set(nodeIds);
  const adjacency = new Map<string, Set<string>>();
  for (const id of nodeIds) adjacency.set(id, new Set());
  for (const [a, b] of pairs) {
    if (!set.has(a) || !set.has(b) || a === b) continue;
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }
  return { nodeIds, adjacency };
}

/** BFS reachability between two nodes (≤ maxHops), used to verify the quest is solvable. */
export function isReachable(g: QuestGraph, from: string, to: string, maxHops = 6): boolean {
  if (from === to) return true;
  const seen = new Set([from]);
  let frontier = [from];
  for (let depth = 0; depth < maxHops && frontier.length; depth++) {
    const next: string[] = [];
    for (const cur of frontier) {
      for (const nb of g.adjacency.get(cur) ?? []) {
        if (nb === to) return true;
        if (!seen.has(nb)) { seen.add(nb); next.push(nb); }
      }
    }
    frontier = next;
  }
  return false;
}

const QUEST_PRIME_A = 2654435761;
const QUEST_PRIME_B = 40503;

/**
 * Pick a deterministic, reachable node pair for a given day. Every visitor sees
 * the same pair on the same UTC day; it changes at midnight. Guaranteed to be
 * a *connectable* pair (verified via BFS) when the graph has any reachable pair.
 * Returns null only for a graph too small/disconnected to offer one.
 */
export function dailyQuestPair(day: number, g: QuestGraph): { from: string; to: string } | null {
  const ids = g.nodeIds;
  const n = ids.length;
  if (n < 2) return null;

  const startFrom = Math.abs((day * QUEST_PRIME_A) % n);
  const startTo   = Math.abs((day * QUEST_PRIME_B + 17) % n);

  // Walk deterministically from the seeded starting points until we find a
  // reachable, non-trivial (≥2 apart) pair. Bounded scan keeps it cheap.
  for (let i = 0; i < n; i++) {
    const from = ids[(startFrom + i) % n];
    for (let j = 1; j < n; j++) {
      const to = ids[(startTo + i * 7 + j) % n];
      if (to === from) continue;
      if (isReachable(g, from, to)) return { from, to };
    }
  }
  return null;
}
