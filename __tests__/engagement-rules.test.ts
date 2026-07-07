import { describe, it, expect } from 'vitest';
import {
  RANKS, rankForXp, nextRank, rankProgress,
  XP_TABLE, ACHIEVEMENTS, evaluateAchievements, type AchievementState,
  computeStreak, dayNumber,
  buildAdjacency, isReachable, dailyQuestPair,
} from '@/lib/engagement/rules';

describe('ranks', () => {
  it('maps XP to the correct rank at and around each boundary', () => {
    expect(rankForXp(0).name).toBe('Novice');
    expect(rankForXp(74).name).toBe('Novice');
    expect(rankForXp(75).name).toBe('Researcher');
    expect(rankForXp(199).name).toBe('Researcher');
    expect(rankForXp(200).name).toBe('Investigator');
    expect(rankForXp(400).name).toBe('Field Agent');
    expect(rankForXp(700).name).toBe('Archivist');
    expect(rankForXp(1200).name).toBe('Nexus Keeper');
    expect(rankForXp(99999).name).toBe('Nexus Keeper');
  });

  it('reports the next rank and remaining XP', () => {
    expect(nextRank(0)).toEqual({ name: 'Researcher', minXP: 75, xpNeeded: 75 });
    expect(nextRank(180)).toEqual({ name: 'Investigator', minXP: 200, xpNeeded: 20 });
    expect(nextRank(1200)).toBeNull();
  });

  it('rankProgress is 0 at a boundary, ~1 approaching the next, and 1 when maxed', () => {
    expect(rankProgress(75)).toBeCloseTo(0, 5);       // just entered Researcher
    expect(rankProgress(199)).toBeCloseTo(124 / 125); // almost Investigator
    expect(rankProgress(1200)).toBe(1);               // top rank
  });
});

describe('XP table', () => {
  it('matches the design handoff values', () => {
    expect(XP_TABLE.node_first_visit).toBe(10);
    expect(XP_TABLE.rabbit_hop).toBe(15);
    expect(XP_TABLE.bookmark).toBe(5);
    expect(XP_TABLE.new_connection).toBe(20);
    expect(XP_TABLE.daily_mystery).toBe(25);
    expect(XP_TABLE.daily_quest).toBe(40);
    expect(XP_TABLE.proposal).toBe(30);
    expect(XP_TABLE.expedition_save).toBe(10);
    expect(XP_TABLE.achievement).toBe(15);
  });
});

describe('achievements', () => {
  const base: AchievementState = {
    visitedCount: 0, connectionsCount: 0, maxDepth: 0, expeditionsCount: 0,
    bookmarksCount: 0, collectionsCount: 0, proposalsCount: 0,
    questCompleted: false, streak: 0,
  };

  it('ships exactly the 12 designed achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(12);
    expect(ACHIEVEMENTS.map(a => a.key)).toContain('first-steps');
    expect(ACHIEVEMENTS.map(a => a.key)).toContain('devoted');
  });

  it('unlocks only newly-met goals and never re-unlocks', () => {
    const s = { ...base, visitedCount: 10 };
    const first = evaluateAchievements(s, []);
    expect(first).toContain('first-steps');
    expect(first).toContain('curious-mind');
    expect(first).not.toContain('omnivore');
    // Idempotent: passing them as already-unlocked yields nothing new.
    expect(evaluateAchievements(s, first)).toEqual([]);
  });

  it('evaluates each metric against its goal', () => {
    expect(evaluateAchievements({ ...base, streak: 3 }, [])).toContain('devoted');
    expect(evaluateAchievements({ ...base, questCompleted: true }, [])).toContain('marksman');
    expect(evaluateAchievements({ ...base, maxDepth: 5 }, [])).toContain('deep-diver');
    expect(evaluateAchievements({ ...base, bookmarksCount: 4 }, [])).not.toContain('curator');
    expect(evaluateAchievements({ ...base, bookmarksCount: 5 }, [])).toContain('curator');
  });
});

describe('streak', () => {
  it('starts at 1 on first-ever activity', () => {
    expect(computeStreak(null, 100, 0)).toBe(1);
  });
  it('is unchanged on the same day', () => {
    expect(computeStreak(100, 100, 4)).toBe(4);
  });
  it('increments on a consecutive day', () => {
    expect(computeStreak(100, 101, 4)).toBe(5);
  });
  it('resets to 1 after a gap', () => {
    expect(computeStreak(100, 103, 9)).toBe(1);
  });
  it('dayNumber advances at UTC midnight', () => {
    const before = Date.UTC(2026, 6, 1, 23, 59);
    const after  = Date.UTC(2026, 6, 2, 0, 1);
    expect(dayNumber(after)).toBe(dayNumber(before) + 1);
  });
});

describe('daily quest', () => {
  // A small connected line graph: a-b-c-d-e
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const g = buildAdjacency(ids, [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']]);

  it('finds reachable pairs and rejects disconnected ones', () => {
    expect(isReachable(g, 'a', 'e')).toBe(true);
    const g2 = buildAdjacency(['a', 'b', 'x', 'y'], [['a', 'b'], ['x', 'y']]);
    expect(isReachable(g2, 'a', 'y')).toBe(false);
  });

  it('returns a deterministic, reachable pair for a given day', () => {
    const p1 = dailyQuestPair(20_000, g);
    const p2 = dailyQuestPair(20_000, g);
    expect(p1).toEqual(p2);
    expect(p1).not.toBeNull();
    expect(p1!.from).not.toBe(p1!.to);
    expect(isReachable(g, p1!.from, p1!.to)).toBe(true);
  });

  it('returns null when no pair is possible', () => {
    expect(dailyQuestPair(1, buildAdjacency(['solo'], []))).toBeNull();
  });

  it('varies across days', () => {
    const pairs = new Set(
      Array.from({ length: 8 }, (_, i) => {
        const p = dailyQuestPair(20_000 + i, g);
        return p ? `${p.from}->${p.to}` : 'null';
      }),
    );
    expect(pairs.size).toBeGreaterThan(1);
  });
});
