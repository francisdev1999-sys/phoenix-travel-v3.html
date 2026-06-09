import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PerfMode = 'auto' | 'high' | 'performance' | 'low';

interface PerformanceState {
  mode: PerfMode;
  setMode: (m: PerfMode) => void;
}

export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set) => ({
      mode: 'auto',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'nexus-perf' }
  )
);

export function getEffectiveMode(mode: PerfMode): Exclude<PerfMode, 'auto'> {
  if (mode !== 'auto') return mode;
  if (typeof window === 'undefined') return 'performance';
  const lowEnd = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 4) <= 2;
  return lowEnd ? 'performance' : 'high';
}

export function getPerfConfig(mode: PerfMode) {
  const eff = getEffectiveMode(mode);
  return {
    maxNodes:           eff === 'high' ? 150 : eff === 'performance' ? 60 : 25,
    maxEdges:           eff === 'high' ? 300 : eff === 'performance' ? 120 : 50,
    particleMultiplier: eff === 'high' ? 1   : eff === 'performance' ? 0.5 : 0.2,
    showAllLabels:      eff === 'high',
    globeLabels:        eff !== 'low',
  };
}
