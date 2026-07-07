'use client';
/**
 * Engagement store — the client source of truth for the redesigned app's
 * gamification layer (XP, ranks, streaks, daily quest/mystery, achievements,
 * bookmarks, collections, expeditions).
 *
 * Works for EVERY visitor (persisted to localStorage, no login required). When
 * the visitor is signed in, <EngagementSync> hydrates from and mirrors to the
 * server so progress follows them across devices. All award math lives in the
 * pure, unit-tested lib/engagement/rules so client and server never drift.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  rankForXp, nextRank, rankProgress,
  evaluateAchievements, ACHIEVEMENT_XP, XP_TABLE, type XpEvent,
  computeStreak, dayNumber, type AchievementState,
} from '@/lib/engagement/rules';

export interface Collection { id: string; name: string; nodeIds: string[] }
export interface Expedition {
  id: string; name: string; chain: string[]; notes: string; depth: number; createdAt: number;
}

/** The serializable slice — what we persist and sync to the server. */
export interface EngagementSnapshot {
  xp:               number;
  visited:          string[];
  connectionsFound: string[]; // sorted "a|b" pair keys
  maxDepth:         number;
  bookmarks:        string[];
  collections:      Collection[];
  expeditions:      Expedition[];
  proposals:        string[];
  streak:           number;
  lastActiveDay:    number | null;
  questDay:         number | null; // UTC day the quest was last completed
  mysteryDay:       number | null; // UTC day the mystery was last opened
  achUnlocked:      string[];
  onboardingDone:   boolean;
}

interface EngagementStore extends EngagementSnapshot {
  toasts:             string[];  // achievement keys queued for the toast stack
  hydratedFromServer: boolean;

  // derived
  rankName:     () => string;
  rankProgress: () => number;
  nextRankInfo: () => { name: string; xpNeeded: number } | null;

  // activity
  visitNode:          (id: string) => boolean;              // true if first visit
  discoverConnection: (a: string, b: string) => boolean;    // true if new pair
  noteDepth:          (depth: number) => void;
  awardHop:           () => void;                          // +15 XP per rabbit-hole hop
  recordProposal:     (id: string) => void;

  // bookmarks / collections
  toggleBookmark:     (id: string) => boolean;              // returns bookmarked-after
  createCollection:   (name: string) => void;
  deleteCollection:   (id: string) => void;
  toggleInCollection: (collectionId: string, nodeId: string) => void;

  // expeditions
  saveExpedition:        (name: string, chain: string[], notes: string, depth: number) => void;
  updateExpeditionNotes: (id: string, notes: string) => void;
  deleteExpedition:      (id: string) => void;

  // daily loops
  completeQuest:   (day: number) => boolean;                // true if newly completed
  openMystery:     (day: number) => boolean;                // true if newly opened today

  // misc
  markOnboardingDone: () => void;
  dismissToast:       () => void;

  // server sync
  hydrate:  (server: Partial<EngagementSnapshot>) => void;
  snapshot: () => EngagementSnapshot;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/** Bump the streak once per UTC day on any meaningful activity. */
function touchStreak(s: EngagementSnapshot): EngagementSnapshot {
  const today = dayNumber(Date.now());
  if (s.lastActiveDay === today) return s;
  return { ...s, lastActiveDay: today, streak: computeStreak(s.lastActiveDay, today, s.streak) };
}

/** Re-evaluate achievements after any state change; award +15 & queue toasts for new unlocks. */
function withAchievements(s: EngagementSnapshot & { toasts: string[] }): EngagementSnapshot & { toasts: string[] } {
  const metricState: AchievementState = {
    visitedCount:     s.visited.length,
    connectionsCount: s.connectionsFound.length,
    maxDepth:         s.maxDepth,
    expeditionsCount: s.expeditions.length,
    bookmarksCount:   s.bookmarks.length,
    collectionsCount: s.collections.length,
    proposalsCount:   s.proposals.length,
    questCompleted:   s.questDay != null,
    streak:           s.streak,
  };
  const newly = evaluateAchievements(metricState, s.achUnlocked);
  if (newly.length === 0) return s;
  return {
    ...s,
    achUnlocked: [...s.achUnlocked, ...newly],
    xp:          s.xp + newly.length * ACHIEVEMENT_XP,
    toasts:      [...s.toasts, ...newly],
  };
}

const INITIAL: EngagementSnapshot = {
  xp: 0, visited: [], connectionsFound: [], maxDepth: 0,
  bookmarks: [], collections: [], expeditions: [], proposals: [],
  streak: 0, lastActiveDay: null, questDay: null, mysteryDay: null,
  achUnlocked: [], onboardingDone: false,
};

export const useEngagement = create<EngagementStore>()(
  persist(
    (set, get) => {
      /** Apply a primary mutation, then touch streak + re-eval achievements atomically. */
      const commit = (mutator: (s: EngagementStore) => Partial<EngagementSnapshot>) =>
        set(state => {
          const merged = { ...state, ...mutator(state) };
          const streaked = touchStreak(merged);
          return withAchievements({ ...merged, ...streaked });
        });

      return {
        ...INITIAL,
        toasts: [],
        hydratedFromServer: false,

        rankName:     () => rankForXp(get().xp).name,
        rankProgress: () => rankProgress(get().xp),
        nextRankInfo: () => {
          const n = nextRank(get().xp);
          return n ? { name: n.name, xpNeeded: n.xpNeeded } : null;
        },

        visitNode: (id) => {
          if (get().visited.includes(id)) { commit(() => ({})); return false; }
          commit(s => ({ visited: [...s.visited, id], xp: s.xp + XP_TABLE.node_first_visit }));
          return true;
        },

        discoverConnection: (a, b) => {
          const key = pairKey(a, b);
          if (a === b || get().connectionsFound.includes(key)) return false;
          commit(s => ({ connectionsFound: [...s.connectionsFound, key], xp: s.xp + XP_TABLE.new_connection }));
          return true;
        },

        noteDepth: (depth) => {
          if (depth <= get().maxDepth) return;
          commit(() => ({ maxDepth: depth }));
        },

        awardHop: () => commit(s => ({ xp: s.xp + XP_TABLE.rabbit_hop })),

        recordProposal: (id) => {
          if (get().proposals.includes(id)) return;
          commit(s => ({ proposals: [...s.proposals, id], xp: s.xp + XP_TABLE.proposal }));
        },

        toggleBookmark: (id) => {
          const has = get().bookmarks.includes(id);
          if (has) {
            commit(s => ({
              bookmarks:   s.bookmarks.filter(b => b !== id),
              collections: s.collections.map(c => ({ ...c, nodeIds: c.nodeIds.filter(n => n !== id) })),
            }));
            return false;
          }
          commit(s => ({ bookmarks: [...s.bookmarks, id], xp: s.xp + XP_TABLE.bookmark }));
          return true;
        },

        createCollection: (name) => {
          const clean = name.trim();
          if (!clean) return;
          commit(s => ({ collections: [...s.collections, { id: uid(), name: clean, nodeIds: [] }] }));
        },

        deleteCollection: (id) =>
          commit(s => ({ collections: s.collections.filter(c => c.id !== id) })),

        toggleInCollection: (collectionId, nodeId) =>
          commit(s => ({
            collections: s.collections.map(c =>
              c.id !== collectionId ? c
                : { ...c, nodeIds: c.nodeIds.includes(nodeId) ? c.nodeIds.filter(n => n !== nodeId) : [...c.nodeIds, nodeId] }),
          })),

        saveExpedition: (name, chain, notes, depth) =>
          commit(s => ({
            expeditions: [
              { id: uid(), name: name.trim() || 'Untitled expedition', chain: [...chain], notes, depth, createdAt: Date.now() },
              ...s.expeditions,
            ],
            xp: s.xp + XP_TABLE.expedition_save,
          })),

        updateExpeditionNotes: (id, notes) =>
          commit(s => ({ expeditions: s.expeditions.map(e => e.id === id ? { ...e, notes } : e) })),

        deleteExpedition: (id) =>
          commit(s => ({ expeditions: s.expeditions.filter(e => e.id !== id) })),

        completeQuest: (day) => {
          if (get().questDay === day) return false;
          commit(s => ({ questDay: day, xp: s.xp + XP_TABLE.daily_quest }));
          return true;
        },

        openMystery: (day) => {
          if (get().mysteryDay === day) return false;
          commit(s => ({ mysteryDay: day, xp: s.xp + XP_TABLE.daily_mystery }));
          return true;
        },

        markOnboardingDone: () => set({ onboardingDone: true }),

        dismissToast: () => set(s => ({ toasts: s.toasts.slice(1) })),

        snapshot: () => {
          const s = get();
          return {
            xp: s.xp, visited: s.visited, connectionsFound: s.connectionsFound, maxDepth: s.maxDepth,
            bookmarks: s.bookmarks, collections: s.collections, expeditions: s.expeditions,
            proposals: s.proposals, streak: s.streak, lastActiveDay: s.lastActiveDay,
            questDay: s.questDay, mysteryDay: s.mysteryDay, achUnlocked: s.achUnlocked,
            onboardingDone: s.onboardingDone,
          };
        },

        /** Conservative merge: union arrays, keep the most-progressed scalars. Never loses progress. */
        hydrate: (server) =>
          set(state => {
            const union = (a: string[] = [], b: string[] = []) => Array.from(new Set([...a, ...b]));
            const mergedCollections = [...state.collections];
            for (const sc of server.collections ?? []) {
              const existing = mergedCollections.find(c => c.id === sc.id);
              if (existing) existing.nodeIds = union(existing.nodeIds, sc.nodeIds);
              else mergedCollections.push(sc);
            }
            const expById = new Map(state.expeditions.map(e => [e.id, e]));
            for (const se of server.expeditions ?? []) if (!expById.has(se.id)) expById.set(se.id, se);
            const qDay = Math.max(state.questDay ?? -1, server.questDay ?? -1);
            const mDay = Math.max(state.mysteryDay ?? -1, server.mysteryDay ?? -1);
            const merged = withAchievements({
              ...state,
              xp:               Math.max(state.xp, server.xp ?? 0),
              visited:          union(state.visited, server.visited),
              connectionsFound: union(state.connectionsFound, server.connectionsFound),
              maxDepth:         Math.max(state.maxDepth, server.maxDepth ?? 0),
              bookmarks:        union(state.bookmarks, server.bookmarks),
              collections:      mergedCollections,
              expeditions:      Array.from(expById.values()).sort((a, b) => b.createdAt - a.createdAt),
              proposals:        union(state.proposals, server.proposals),
              streak:           Math.max(state.streak, server.streak ?? 0),
              lastActiveDay:    Math.max(state.lastActiveDay ?? 0, server.lastActiveDay ?? 0) || null,
              questDay:         qDay < 0 ? null : qDay,
              mysteryDay:       mDay < 0 ? null : mDay,
              achUnlocked:      union(state.achUnlocked, server.achUnlocked),
              onboardingDone:   state.onboardingDone || !!server.onboardingDone,
              toasts:           state.toasts,
            });
            return { ...merged, hydratedFromServer: true };
          }),
      };
    },
    {
      name: 'nexus_app_v2',
      partialize: (s) => s.snapshot(),
    },
  ),
);

/** Non-hook helper for award calls from outside React (e.g. imperative flows). */
export const engagement = () => useEngagement.getState();

export type { XpEvent };
