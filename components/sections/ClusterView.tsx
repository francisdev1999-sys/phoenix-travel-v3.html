'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, ChevronRight, Search, SlidersHorizontal,
  Dot, BookOpen, Link2, ArrowUpDown,
} from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';

interface ClusterNode {
  id:            string;
  title:         string;
  description:   string;
  evidenceLevel: string;
  confidence:    number;
  year:          number | null;
  region:        string | null;
  country:       string | null;
  icon:          string;
  color:         string;
  tags:          string[];
  sourceCount:   number;
  edgeCount:     number;
}

interface ClusterData {
  cluster: {
    id: string; slug: string; name: string; color: string; icon: string;
    galaxy: { id: string; slug: string; name: string; color: string | null; icon: string | null } | null;
  };
  nodes: ClusterNode[];
  total: number;
}

const EVIDENCE_COLORS: Record<string, string> = {
  confirmed:   '#22c55e',
  strong:      '#84cc16',
  moderate:    '#eab308',
  weak:        '#f97316',
  speculative: '#64748b',
};

const EVIDENCE_ORDER = ['confirmed','strong','moderate','weak','speculative'];

function EvidenceBadge({ level }: { level: string }) {
  const color = EVIDENCE_COLORS[level] ?? '#64748b';
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: color + '18', border: `1px solid ${color}33` }}
    >
      {level}
    </span>
  );
}

function NodeCard({ node, index, galaxySlug, galaxyName, clusterSlug, clusterName }: {
  node: ClusterNode; index: number;
  galaxySlug: string; galaxyName: string;
  clusterSlug: string; clusterName: string;
}) {
  const { navigateToNode } = useUserStore();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.5) }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => navigateToNode(node.id, node.title, clusterSlug, clusterName, galaxySlug, galaxyName)}
      className="w-full text-left rounded-xl border transition-all duration-150 overflow-hidden"
      style={{
        borderColor: hovered ? node.color + '50' : node.color + '18',
        background:  hovered ? node.color + '0a' : 'transparent',
      }}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: node.color + '18', border: `1px solid ${node.color}30` }}
        >
          <Dot size={16} style={{ color: node.color }} />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Title + evidence */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white leading-snug">{node.title}</h3>
            <EvidenceBadge level={node.evidenceLevel} />
          </div>

          {/* Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{node.description}</p>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            {node.year && (
              <span className="text-[10px] text-slate-600">{node.year < 0 ? `${Math.abs(node.year)} BCE` : `${node.year} CE`}</span>
            )}
            {node.region && (
              <span className="text-[10px] text-slate-600">{node.region}</span>
            )}
            {node.sourceCount > 0 && (
              <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                <BookOpen size={9} />{node.sourceCount}
              </span>
            )}
            {node.edgeCount > 0 && (
              <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                <Link2 size={9} />{node.edgeCount}
              </span>
            )}
            {node.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-600">{t}</span>
            ))}
          </div>
        </div>

        <motion.div
          animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -4 }}
          className="flex-shrink-0 self-center"
        >
          <ChevronRight size={14} className="text-slate-500" />
        </motion.div>
      </div>
    </motion.button>
  );
}

type SortMode = 'confidence' | 'evidence' | 'title' | 'recent';

const PAGE_SIZE = 25;

export default function ClusterView() {
  const { navContext, navigateToNode } = useUserStore();
  const { galaxySlug, galaxyName, clusterSlug, clusterName } = navContext;

  const [data, setData]           = useState<ClusterData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [sort, setSort]           = useState<SortMode>('confidence');
  const [query, setQuery]         = useState('');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const sentinelRef               = useRef<HTMLDivElement>(null);

  const load = useCallback((sortMode: SortMode) => {
    if (!clusterSlug) return;
    setLoading(true);
    fetch(`/api/clusters/${clusterSlug}?sort=${sortMode}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [clusterSlug]);

  useEffect(() => { load(sort); }, [load, sort]);

  // Reset window when filter query changes
  useEffect(() => { setDisplayCount(PAGE_SIZE); }, [query]);

  const filtered = data?.nodes.filter(n =>
    !query || n.title.toLowerCase().includes(query.toLowerCase()) || n.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  ) ?? [];

  const visible   = filtered.slice(0, displayCount);
  const hasMore   = filtered.length > displayCount;

  // Auto-expand via IntersectionObserver when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDisplayCount(c => c + PAGE_SIZE); },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, visible.length]);

  if (!clusterSlug) {
    return <div className="flex items-center justify-center h-full"><p className="text-xs text-slate-500">No cluster selected.</p></div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{clusterName ?? 'Cluster'}</h1>
            {data && (
              <span className="text-xs text-slate-500 font-normal">
                {data.total} node{data.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {data?.cluster.galaxy && (
            <p className="text-xs text-slate-600">
              Galaxy: <span style={{ color: data.cluster.galaxy.color ?? '#7c3aed' }}>{data.cluster.galaxy.name}</span>
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter nodes…"
              className="w-full pl-7 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-1 py-0.5">
            <ArrowUpDown size={10} className="text-slate-600 ml-1" />
            {(['confidence','evidence','title'] as SortMode[]).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-2 py-1 rounded text-[10px] font-medium capitalize transition-all ${
                  sort === s ? 'bg-purple-700/50 text-purple-200' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-purple-400" size={20} />
          </div>
        ) : error ? (
          <p className="text-xs text-red-400 text-center py-8">Failed to load cluster.</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            {query ? 'No nodes match your filter.' : 'No published nodes in this cluster yet.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {visible.map((node, i) => (
              <NodeCard
                key={node.id}
                node={node}
                index={i}
                galaxySlug={galaxySlug ?? ''}
                galaxyName={galaxyName ?? ''}
                clusterSlug={clusterSlug ?? ''}
                clusterName={clusterName ?? ''}
              />
            ))}

            {/* Sentinel — IntersectionObserver triggers next page load */}
            {hasMore && <div ref={sentinelRef} className="py-4 flex justify-center">
              <Loader2 size={16} className="animate-spin text-purple-900" />
            </div>}
          </div>
        )}

        {data && filtered.length > 0 && (
          <p className="text-[10px] text-slate-700 text-center pb-4">
            {visible.length} of {filtered.length} nodes shown
            {filtered.length < data.total ? ` · ${data.total} total` : ''}
            {' '}· Click any node to open its research page
          </p>
        )}
      </div>
    </div>
  );
}
