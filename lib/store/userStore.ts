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

interface UserStore {
  progress: UserProgress;
  audioEnabled: boolean;
  rabbitHoleChain: string[];
  rabbitHoleNodeId: string | null;
  currentView: 'landing' | 'graph' | 'theory' | 'universe' | 'timeline' | 'evidence-board' | 'globe' | 'dashboard' | 'diagnostics' | 'sources' | 'admin' | 'rabbit-hole';
  selectedTheory: string | null;
  searchQuery: string;

  exploreTheory: (theoryId: string) => void;
  discoverConnection: (fromId: string, toId: string) => void;
  toggleAudio: () => void;
  setCurrentView: (view: 'landing' | 'graph' | 'theory' | 'universe' | 'timeline' | 'evidence-board' | 'globe' | 'dashboard' | 'diagnostics' | 'sources' | 'admin' | 'rabbit-hole') => void;
  setRabbitHoleNodeId: (id: string | null) => void;
  setRabbitHoleChain: (chain: string[]) => void;
  setSelectedTheory: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  startRabbitHole: (theoryId: string) => void;
  extendRabbitHole: (theoryId: string) => void;
  resetRabbitHole: () => void;
  unlockAchievement: (achievementId: string) => void;
  getLevel: () => string;
  getNextLevel: () => { name: string; xpNeeded: number } | null;
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
      currentView: 'landing',
      selectedTheory: null,
      searchQuery: '',

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

      toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

      setCurrentView: (view) => set({ currentView: view }),

      setRabbitHoleNodeId: (id) => set({ rabbitHoleNodeId: id }),

      setRabbitHoleChain: (chain) => set({ rabbitHoleChain: chain }),

      setSelectedTheory: (id) => set({ selectedTheory: id }),

      setSearchQuery: (query) => set({ searchQuery: query }),

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
