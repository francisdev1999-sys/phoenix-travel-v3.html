'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProgress, Achievement } from '@/lib/types';

const LEVELS = [
  { name: 'Curious Visitor', minXP: 0 },
  { name: 'Researcher', minXP: 100 },
  { name: 'Investigator', minXP: 300 },
  { name: 'Truth Seeker', minXP: 600 },
  { name: 'Deep Diver', minXP: 1000 },
  { name: 'Rabbit Hole Master', minXP: 2000 },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-discovery', title: 'First Discovery', description: 'Explored your first theory', icon: '🔍', unlockCondition: 'explore_1', xpReward: 50 },
  { id: 'ancient-explorer', title: 'Ancient Explorer', description: 'Explored 3 Ancient Civilization theories', icon: '🏛️', unlockCondition: 'category_ancient_3', xpReward: 100 },
  { id: 'pyramid-researcher', title: 'Pyramid Researcher', description: 'Fully explored the Great Pyramid theory', icon: '🔺', unlockCondition: 'explore_great-pyramid', xpReward: 75 },
  { id: 'alien-investigator', title: 'Alien Investigator', description: 'Explored 3 UFO/UAP theories', icon: '👽', unlockCondition: 'category_ufo_3', xpReward: 100 },
  { id: 'enoch-scholar', title: 'Enoch Scholar', description: 'Explored the Book of Enoch and related theories', icon: '📜', unlockCondition: 'explore_book-of-enoch', xpReward: 75 },
  { id: 'conspiracy-cartographer', title: 'Conspiracy Cartographer', description: 'Discovered 10 connections between theories', icon: '🗺️', unlockCondition: 'connections_10', xpReward: 150 },
  { id: 'deep-diver', title: 'Deep Diver', description: 'Reached Rabbit Hole depth of 5', icon: '🐇', unlockCondition: 'rabbit_hole_5', xpReward: 200 },
  { id: 'rabbit-hole-master', title: 'Rabbit Hole Master', description: 'Reached maximum Rabbit Hole depth', icon: '🌀', unlockCondition: 'rabbit_hole_10', xpReward: 500 },
  { id: 'simulation-breaker', title: 'Simulation Breaker', description: 'Explored Simulation Theory', icon: '💻', unlockCondition: 'explore_simulation-theory', xpReward: 75 },
  { id: 'archive-complete', title: 'Archive Complete', description: 'Explored all major theories', icon: '🏆', unlockCondition: 'explore_all', xpReward: 1000 },
];

export type ViewType =
  | 'landing' | 'graph' | 'theory' | 'universe'
  | 'galaxy' | 'cluster' | 'node' | 'research-graph'
  | 'timeline' | 'evidence-board' | 'globe' | 'dashboard'
  | 'diagnostics' | 'sources' | 'admin' | 'rabbit-hole';

export interface NavContext {
  galaxySlug:  string | null;
  galaxyName:  string | null;
  clusterSlug: string | null;
  clusterName: string | null;
  nodeId:      string | null;
  nodeName:    string | null;
}

interface UserStore {
  progress: UserProgress;
  audioEnabled: boolean;
  rabbitHoleChain: string[];
  rabbitHoleNodeId: string | null;
  /** Not persisted — signals RabbitHoleView to load a specific node on mount */
  pendingRabbitHoleNodeId: string | null;
  currentView: ViewType;
  /** Navigation breadcrumb context — universe > galaxy > cluster > node */
  navContext: NavContext;
  selectedTheory: string | null;
  searchQuery: string;
  /** Shared cross-view focus: theory ID that both Timeline and Globe react to */
  focusedTheoryId: string | null;
  /** Guest mode — browse-only, no contributions. Not persisted. */
  guestMode: boolean;

  setGuestMode: (v: boolean) => void;
  exploreTheory: (theoryId: string) => void;
  discoverConnection: (fromId: string, toId: string) => void;
  toggleAudio: () => void;
  setCurrentView: (view: ViewType) => void;
  setRabbitHoleNodeId: (id: string | null) => void;
  setRabbitHoleChain: (chain: string[]) => void;
  setSelectedTheory: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFocusedTheoryId: (id: string | null) => void;
  setPendingRabbitHoleNodeId: (id: string | null) => void;
  startRabbitHole: (theoryId: string) => void;
  extendRabbitHole: (theoryId: string) => void;
  resetRabbitHole: () => void;
  unlockAchievement: (achievementId: string) => void;
  getLevel: () => string;
  getNextLevel: () => { name: string; xpNeeded: number } | null;

  // Navigation actions for the Galaxy → Cluster → Node hierarchy
  navigateToUniverse: () => void;
  navigateToGalaxy: (slug: string, name: string) => void;
  navigateToCluster: (galaxySlug: string, galaxyName: string, clusterSlug: string, clusterName: string) => void;
  navigateToNode: (nodeId: string, nodeName: string, clusterSlug?: string, clusterName?: string, galaxySlug?: string, galaxyName?: string) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      progress: {
        theoriesExplored: [],
        connectionsDiscovered: [],
        rabbitHoleDepth: 0,
        achievements: [],
        xp: 0,
        level: 'Curious Visitor',
        recentDiscoveries: [],
      },
      audioEnabled: false,
      rabbitHoleChain: [],
      rabbitHoleNodeId: null,
      pendingRabbitHoleNodeId: null,
      currentView: 'landing',
      navContext: { galaxySlug: null, galaxyName: null, clusterSlug: null, clusterName: null, nodeId: null, nodeName: null },
      selectedTheory: null,
      searchQuery: '',
      focusedTheoryId: null,
      guestMode: false,

      exploreTheory: (theoryId: string) => {
        set((state) => {
          const already = state.progress.theoriesExplored.includes(theoryId);
          if (already) return state;

          const newExplored = [...state.progress.theoriesExplored, theoryId];
          const newRecent = [theoryId, ...state.progress.recentDiscoveries].slice(0, 10);
          const newXP = state.progress.xp + 30;
          const newLevel = LEVELS.reduce((acc, l) => newXP >= l.minXP ? l.name : acc, 'Curious Visitor');

          const newAchievements = [...state.progress.achievements];
          if (newExplored.length === 1 && !newAchievements.includes('first-discovery')) {
            newAchievements.push('first-discovery');
          }

          return {
            progress: {
              ...state.progress,
              theoriesExplored: newExplored,
              recentDiscoveries: newRecent,
              xp: newXP,
              level: newLevel,
              achievements: newAchievements,
            }
          };
        });
      },

      discoverConnection: (fromId: string, toId: string) => {
        const connectionId = [fromId, toId].sort().join('-');
        set((state) => {
          if (state.progress.connectionsDiscovered.includes(connectionId)) return state;
          const newConnections = [...state.progress.connectionsDiscovered, connectionId];
          const newXP = state.progress.xp + 15;
          const newLevel = LEVELS.reduce((acc, l) => newXP >= l.minXP ? l.name : acc, 'Curious Visitor');

          const newAchievements = [...state.progress.achievements];
          if (newConnections.length >= 10 && !newAchievements.includes('conspiracy-cartographer')) {
            newAchievements.push('conspiracy-cartographer');
          }

          return {
            progress: {
              ...state.progress,
              connectionsDiscovered: newConnections,
              xp: newXP,
              level: newLevel,
              achievements: newAchievements,
            }
          };
        });
      },

      setGuestMode: (v) => set({ guestMode: v }),

      toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

      setCurrentView: (view) => set({ currentView: view }),

      navigateToUniverse: () => set({
        currentView: 'universe',
        navContext: { galaxySlug: null, galaxyName: null, clusterSlug: null, clusterName: null, nodeId: null, nodeName: null },
      }),

      navigateToGalaxy: (slug, name) => set({
        currentView: 'galaxy',
        navContext: { galaxySlug: slug, galaxyName: name, clusterSlug: null, clusterName: null, nodeId: null, nodeName: null },
      }),

      navigateToCluster: (galaxySlug, galaxyName, clusterSlug, clusterName) => set({
        currentView: 'cluster',
        navContext: { galaxySlug, galaxyName, clusterSlug, clusterName, nodeId: null, nodeName: null },
      }),

      navigateToNode: (nodeId, nodeName, clusterSlug, clusterName, galaxySlug, galaxyName) => set((state) => ({
        currentView: 'node',
        navContext: {
          galaxySlug:  galaxySlug  ?? state.navContext.galaxySlug,
          galaxyName:  galaxyName  ?? state.navContext.galaxyName,
          clusterSlug: clusterSlug ?? state.navContext.clusterSlug,
          clusterName: clusterName ?? state.navContext.clusterName,
          nodeId,
          nodeName,
        },
      })),

      setRabbitHoleNodeId: (id) => set({ rabbitHoleNodeId: id }),

      setRabbitHoleChain: (chain) => set({ rabbitHoleChain: chain }),

      setPendingRabbitHoleNodeId: (id) => set({ pendingRabbitHoleNodeId: id }),

      setSelectedTheory: (id) => set({ selectedTheory: id }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setFocusedTheoryId: (id) => set({ focusedTheoryId: id }),

      startRabbitHole: (theoryId: string) => {
        set({ rabbitHoleChain: [theoryId], rabbitHoleNodeId: theoryId });
        get().exploreTheory(theoryId);
      },

      extendRabbitHole: (theoryId: string) => {
        set((state) => {
          const newChain = [...state.rabbitHoleChain, theoryId];
          const newDepth = Math.max(state.progress.rabbitHoleDepth, newChain.length);

          const newAchievements = [...state.progress.achievements];
          if (newDepth >= 5 && !newAchievements.includes('deep-diver')) newAchievements.push('deep-diver');
          if (newDepth >= 10 && !newAchievements.includes('rabbit-hole-master')) newAchievements.push('rabbit-hole-master');

          return {
            rabbitHoleChain: newChain,
            progress: {
              ...state.progress,
              rabbitHoleDepth: newDepth,
              achievements: newAchievements,
            }
          };
        });
        get().exploreTheory(theoryId);
      },

      resetRabbitHole: () => set({ rabbitHoleChain: [] }),

      unlockAchievement: (achievementId: string) => {
        set((state) => {
          if (state.progress.achievements.includes(achievementId)) return state;
          const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
          const newXP = state.progress.xp + (achievement?.xpReward || 0);
          const newLevel = LEVELS.reduce((acc, l) => newXP >= l.minXP ? l.name : acc, 'Curious Visitor');
          return {
            progress: {
              ...state.progress,
              achievements: [...state.progress.achievements, achievementId],
              xp: newXP,
              level: newLevel,
            }
          };
        });
      },

      getLevel: () => get().progress.level,

      getNextLevel: () => {
        const { xp } = get().progress;
        const next = LEVELS.find(l => l.minXP > xp);
        if (!next) return null;
        return { name: next.name, xpNeeded: next.minXP - xp };
      },
    }),
    {
      name: 'nexus-archive-progress',
      // Don't persist view/UI state — always start fresh from landing
      partialize: (state) => ({
        progress:         state.progress,
        audioEnabled:     state.audioEnabled,
        rabbitHoleChain:  state.rabbitHoleChain,
        rabbitHoleNodeId: state.rabbitHoleNodeId,
      }),
    }
  )
);

export { ACHIEVEMENTS };
