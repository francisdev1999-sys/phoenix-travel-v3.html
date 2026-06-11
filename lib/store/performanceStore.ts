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

  // Honour OS-level accessibility setting
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'low';

  const cores = navigator.hardwareConcurrency ?? 4;
  const ram   = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
  const conn  = (navigator as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  const slowNet = conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';

  // Truly low-end: dual-core, <2 GB RAM, or data-saver / 2G
  if (cores <= 2 || ram < 2 || slowNet) return 'low';

  // Mid-range: mobile viewport, quad-core, or <4 GB RAM
  if (window.innerWidth < 768 || cores <= 4 || ram < 4) return 'performance';

  return 'high';
}

export function getPerfConfig(mode: PerfMode) {
  const eff = getEffectiveMode(mode);
  return {
    maxNodes:          eff === 'high' ? 150 : eff === 'performance' ? 60  : 25,
    maxEdges:          eff === 'high' ? 300 : eff === 'performance' ? 120 : 50,
    particleMultiplier:eff === 'high' ? 1   : eff === 'performance' ? 0.5 : 0.2,
    showAllLabels:     eff === 'high',
    globeLabels:       eff !== 'low',
    targetFPS:         eff === 'high' ? 60  : eff === 'performance' ? 30  : 20,
    skipHeavyEffects:  eff === 'low',
    canvasDpr:         eff === 'high' ? ([1, 2] as [number, number])
                     : eff === 'performance' ? ([1, 1.5] as [number, number])
                     : ([0.75, 1] as [number, number]),
  };
}
