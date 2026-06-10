'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Search, TrendingUp } from 'lucide-react';
import type { GraphNode } from '@/lib/graph/types';
import type { RankedSimilarity, SimilarityDimensions, CriticAnalysis } from '@/lib/similarity/engine';

interface EnrichedSimilarity extends RankedSimilarity {
  node: GraphNode | null;
}

interface ApiResponse {
  nodeId: string;
  results: EnrichedSimilarity[];
  disclaimer: string;
}

interface Props {
  nodeId: string;
}

const DIM_LABELS: Record<keyof SimilarityDimensions, string> = {
  thematic:     'Thematic',
  timeline:     'Timeline',
  geographic:   'Geographic',
  source:       'Sources',
  evidence:     'Evidence',
  entity:       'Entities',
  relationship: 'Graph links',
};

const SEV_COLOR = { minor: '#64748b', moderate: '#f59e0b', significant: '#ef4444' };

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = pct >= 65 ? '#a855f7' : pct >= 40 ? '#f59e0b' : '#64748b';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-16 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-slate-400 w-7 text-right flex-shrink-0">{pct}%</span>
    </div>
  );
}

function CriticPanel({ critic }: { critic: CriticAnalysis }) {
  const [open, setOpen] = useState(false);
  const hasIssues = critic.why_not_related.length > 0 || critic.contradictions.length > 0;
  if (!hasIssues) return null;
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-900/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-all"
      >
        <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-bold text-amber-400 flex-1">Why these may NOT be related</span>
        {open ? <ChevronUp size={11} className="text-slate-500" /> : <ChevronDown size={11} className="text-slate-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2 border-t border-amber-500/10 pt-2">
              {critic.contradictions.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5"
                    style={{ background: SEV_COLOR[c.severity] + '25', color: SEV_COLOR[c.severity] }}>
                    {c.severity}
                  </span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{c.detail}</p>
                </div>
              ))}
              {critic.why_not_related.map((w, i) => (
                <p key={i} className="text-[10px] text-slate-500 leading-relaxed pl-2 border-l border-slate-700">
                  {w}
                </p>
              ))}
              <p className="text-[9px] text-slate-600 italic pt-1">{critic.disclaimer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SimilarNodeRow({ item, rank }: { item: EnrichedSimilarity; rank: number }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(item.overall * 100);
  const potPct = Math.round(item.research_potential * 100);
  const scoreColor = pct >= 65 ? '#a855f7' : pct >= 40 ? '#f59e0b' : '#64748b';

  return (
    <div className="rounded-xl border border-purple-900/20 bg-white/3 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-all"
      >
        <span className="text-[10px] text-slate-600 w-4 flex-shrink-0">#{rank}</span>
        <span className="text-sm flex-shrink-0">{item.node?.icon ?? '◈'}</span>
        <span className="flex-1 text-xs font-medium text-white truncate">{item.node?.title ?? item.nodeId}</span>
        <span className="text-xs font-bold flex-shrink-0" style={{ color: scoreColor }}>{pct}%</span>
        {open ? <ChevronUp size={12} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={12} className="text-slate-500 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-purple-900/10 pt-3 space-y-3">
              {item.node && (
                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{item.node.description}</p>
              )}

              <div className="space-y-1.5">
                {(Object.entries(item.dimensions) as [keyof SimilarityDimensions, { score: number; rationale: string }][]).map(([k, v]) => (
                  <div key={k}>
                    <ScoreBar score={v.score} label={DIM_LABELS[k]} />
                    <p className="text-[9px] text-slate-600 pl-18 mt-0.5 ml-[4.5rem]">{v.rationale}</p>
                  </div>
                ))}
              </div>

              {potPct > 50 && (
                <div className="flex items-center gap-2 text-[10px] text-purple-400">
                  <TrendingUp size={10} />
                  <span>Research potential: <span className="font-bold">{potPct}%</span> — investigation may be worthwhile</span>
                </div>
              )}

              <CriticPanel critic={item.critic} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SimilarityPanel({ nodeId }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/similarity/${nodeId}`)
      .then(r => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => setError('Failed to load similarity data'))
      .finally(() => setLoading(false));
  }, [nodeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-400 py-4">{error}</p>;
  }

  if (!data || data.results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <Search size={20} className="text-slate-600" />
        <p className="text-xs text-slate-500">No similarity data available.</p>
      </div>
    );
  }

  const topResearch = data.results.filter(r => r.research_potential >= 0.6).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-900/5">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="font-bold text-purple-400">Similarity ≠ evidence.</span>{' '}
          These nodes share measurable characteristics. That does NOT mean they are historically related, share an origin, or that claims from one apply to the other. All relationships require independent evidence and human review.
        </p>
      </div>

      {/* High research potential callout */}
      {topResearch.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp size={10} className="text-purple-400" /> High Research Potential
          </p>
          <div className="space-y-2">
            {topResearch.map((item, i) => (
              <div key={item.nodeId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900/10 border border-purple-500/15">
                <span className="text-sm flex-shrink-0">{item.node?.icon ?? '◈'}</span>
                <span className="flex-1 text-xs text-white truncate">{item.node?.title ?? item.nodeId}</span>
                <span className="text-[10px] text-purple-400 font-bold flex-shrink-0">
                  {Math.round(item.research_potential * 100)}% potential
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranked similar nodes */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Most Similar Nodes</p>
        <div className="space-y-2">
          {data.results.map((item, i) => (
            <SimilarNodeRow key={item.nodeId} item={item} rank={i + 1} />
          ))}
        </div>
      </div>

      <p className="text-[9px] text-slate-700 border-t border-purple-900/10 pt-3 leading-relaxed">
        {data.disclaimer}
      </p>
    </div>
  );
}
