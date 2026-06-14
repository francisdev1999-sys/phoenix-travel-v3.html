'use client';
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, Landmark, CircleDot, Shield, Flame, Network,
  Dna, Users, Satellite, Telescope, ChevronRight,
  Dot, BookOpen, Link2, Folder, Globe2,
} from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import type { GalaxyWithCounts } from '@/app/api/galaxies/route';

const UniverseView = lazy(() => import('@/components/sections/UniverseView'));

// Map galaxy icon names to lucide-react components
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Landmark, CircleDot, Shield, Flame, Network, Dna, Users, Satellite, Telescope, Dot,
};

function GalaxyIcon({ name, size = 24, className, style }: { name: string | null; size?: number; className?: string; style?: React.CSSProperties }) {
  const Comp = name ? (ICON_MAP[name] ?? Dot) : Dot;
  return <Comp size={size} className={className} style={style} />;
}

const EVIDENCE_BAR_COLORS = ['#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9'];

function MaturityBar({ nodeCount }: { nodeCount: number }) {
  // Archive maturity: 0–25 nodes = low, 26–50 = building, 51–100 = established, 100+ = rich
  const pct = Math.min(Math.round((nodeCount / 100) * 100), 100);
  const label = nodeCount < 10 ? 'Emerging' : nodeCount < 30 ? 'Building' : nodeCount < 60 ? 'Established' : 'Rich';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[9px] text-slate-600">{label}</span>
        <span className="text-[9px] text-slate-600">{nodeCount} nodes</span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
        />
      </div>
    </div>
  );
}

function GalaxyCard({ galaxy, index }: { galaxy: GalaxyWithCounts; index: number }) {
  const { navigateToGalaxy } = useUserStore();
  const [hovered, setHovered] = useState(false);
  const color = galaxy.color ?? '#7c3aed';

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => navigateToGalaxy(galaxy.slug, galaxy.name)}
      className="relative text-left w-full rounded-2xl overflow-hidden border transition-all duration-200"
      style={{
        borderColor: hovered ? color + '60' : color + '22',
        background:  hovered ? color + '0f' : color + '07',
      }}
    >
      {/* Glow spot */}
      <motion.div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        animate={{ opacity: hovered ? 0.3 : 0.1 }}
        style={{ background: color }}
      />

      <div className="relative p-4 sm:p-5">
        {/* Icon + Name */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: color + '22', border: `1px solid ${color}44` }}
          >
            <GalaxyIcon name={galaxy.icon} size={18} className="opacity-90" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white leading-tight truncate">{galaxy.name}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{galaxy.description}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] text-slate-500">
            <span className="font-bold text-white">{galaxy.nodeCount}</span> nodes
          </span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">
            <span className="font-bold text-slate-300">{galaxy.sourceCount}</span> sources
          </span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">
            <span className="font-bold text-slate-300">{galaxy.clusterCount}</span> clusters
          </span>
        </div>

        {/* Maturity bar */}
        <MaturityBar nodeCount={galaxy.nodeCount} />

        {/* CTA */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -4 }}
          className="absolute bottom-4 right-4 flex items-center gap-1"
        >
          <span className="text-[10px] font-bold" style={{ color }}>Explore</span>
          <ChevronRight size={11} style={{ color }} />
        </motion.div>
      </div>
    </motion.button>
  );
}

// ── Cluster card (used inside Galaxy detail view) ──────────────────────────

interface ClusterItem {
  id: string; slug: string; name: string; color: string; icon: string;
  nodeCount: number; sourceCount: number;
  evidenceDist: Record<string, number>;
}

function ClusterCard({ cluster, galaxySlug, galaxyName, index }: {
  cluster: ClusterItem; galaxySlug: string; galaxyName: string; index: number;
}) {
  const { navigateToCluster } = useUserStore();
  const [hovered, setHovered] = useState(false);
  const c = cluster.color;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => navigateToCluster(galaxySlug, galaxyName, cluster.slug, cluster.name)}
      className="w-full text-left rounded-xl border transition-all duration-150 p-4"
      style={{ borderColor: hovered ? c + '55' : c + '22', background: hovered ? c + '0c' : 'transparent' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: c + '20', border: `1px solid ${c}35` }}>
          <Folder size={15} style={{ color: c }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{cluster.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500"><span className="font-bold text-slate-300">{cluster.nodeCount}</span> nodes</span>
            {cluster.sourceCount > 0 && (
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><BookOpen size={9} />{cluster.sourceCount}</span>
            )}
          </div>
        </div>
        <motion.div animate={{ opacity: hovered ? 1 : 0 }}>
          <ChevronRight size={14} className="text-slate-500" />
        </motion.div>
      </div>
    </motion.button>
  );
}

// ── Galaxy detail (cluster list for a specific galaxy) ──────────────────────

function GalaxyDetailView() {
  const { navContext } = useUserStore();
  const { galaxySlug, galaxyName } = navContext;

  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [galaxy, setGalaxy]     = useState<{ name: string; description: string | null; color: string | null; icon: string | null } | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!galaxySlug) return;
    fetch(`/api/galaxies/${galaxySlug}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setGalaxy(d.galaxy ?? null); setClusters(d.clusters ?? []); })
      .catch(err => console.error('[galaxy]', err))
      .finally(() => setLoading(false));
  }, [galaxySlug]);

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <Loader2 className="animate-spin text-purple-400" size={20} />
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">{galaxy?.name ?? galaxyName}</h1>
          {galaxy?.description && (
            <p className="text-xs text-slate-500 leading-relaxed">{galaxy.description}</p>
          )}
          <p className="text-[10px] text-slate-600">{clusters.length} clusters</p>
        </div>

        <div className="space-y-1.5">
          {clusters.map((c, i) => (
            <ClusterCard key={c.id} cluster={c} galaxySlug={galaxySlug ?? ''} galaxyName={galaxyName ?? ''} index={i} />
          ))}
        </div>

        {clusters.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">No clusters with published nodes yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Universe view (all galaxies) ────────────────────────────────────────────

export default function GalaxyView() {
  const { currentView } = useUserStore();

  // ── All hooks must be called before any early return (React rules) ────────
  const [galaxies, setGalaxies]     = useState<GalaxyWithCounts[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(false);
  const [cosmosMode, setCosmosMode] = useState(false);

  useEffect(() => {
    // Only fetch when showing the universe grid
    if (currentView !== 'universe') return;
    setLoading(true);
    setError(false);
    fetch('/api/galaxies')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setGalaxies)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [currentView]);

  // ── Conditional render AFTER all hooks ────────────────────────────────────
  // When on 'galaxy' view, show the selected galaxy's clusters
  if (currentView === 'galaxy') return <GalaxyDetailView />;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="animate-spin text-purple-400" size={24} />
        <p className="text-xs text-slate-500">Loading galaxies…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-sm text-red-400">Failed to load galaxies.</p>
        <button onClick={() => window.location.reload()} className="text-xs text-purple-400 hover:text-purple-300">Retry</button>
      </div>
    );
  }

  const totalNodes   = galaxies.reduce((s, g) => s + g.nodeCount, 0);
  const totalSources = galaxies.reduce((s, g) => s + g.sourceCount, 0);

  return (
    <div className="h-full relative overflow-hidden">
      {/* 3D Cosmos overlay */}
      {cosmosMode && (
        <div className="absolute inset-0 z-10">
          <Suspense fallback={
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-purple-400" size={24} />
            </div>
          }>
            <UniverseView galaxies={galaxies} onClose={() => setCosmosMode(false)} />
          </Suspense>
        </div>
      )}

      {/* Flat grid (always mounted, hidden under cosmos) */}
      <div className={`h-full overflow-y-auto ${cosmosMode ? 'invisible' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2 pb-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Telescope size={16} className="text-purple-400" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-purple-500 uppercase">The Nexus Archive</span>
              </div>
              {/* Cosmos toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCosmosMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-purple-500/20 text-xs text-purple-300 hover:text-purple-200 hover:border-purple-500/40 transition-all"
                title="Switch to 3D Cosmos view"
              >
                <Globe2 size={12} />
                Cosmos
              </motion.button>
            </div>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Universe</h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {totalNodes.toLocaleString()} nodes across {galaxies.length} galaxies · {totalSources.toLocaleString()} sources
              </p>
            </div>
          </motion.div>

          {/* Galaxy grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {galaxies.map((galaxy, i) => (
              <GalaxyCard key={galaxy.id} galaxy={galaxy} index={i} />
            ))}
          </div>

          <p className="text-[10px] text-slate-700 text-center pb-4">
            Select a galaxy to explore its clusters and nodes.
          </p>
        </div>
      </div>
    </div>
  );
}
