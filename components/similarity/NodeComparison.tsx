'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeftRight, CheckCircle, Loader2, XCircle } from 'lucide-react';
import type { GraphNode } from '@/lib/graph/types';
import type { SimilarityResult, SimilarityDimensions } from '@/lib/similarity/engine';

interface CompareResponse {
  result:     SimilarityResult;
  nodeA:      GraphNode;
  nodeB:      GraphNode;
  disclaimer: string;
}

interface Props {
  nodeAId: string;
  nodeBId: string;
  onClose?: () => void;
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

const EVIDENCE_ORDER = ['verified', 'strong_evidence', 'debated', 'speculative', 'mythological'];

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const c = pct >= 65 ? '#a855f7' : pct >= 40 ? '#f59e0b' : '#64748b';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
      </div>
      <span className="text-[10px] font-bold w-7 flex-shrink-0" style={{ color: c }}>{pct}%</span>
    </div>
  );
}

function FieldRow({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start py-2 border-b border-purple-900/10">
      <div className="text-xs text-slate-300">{a}</div>
      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider self-center min-w-[60px] text-center">{label}</div>
      <div className="text-xs text-slate-300 text-right">{b}</div>
    </div>
  );
}

function EvidenceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    verified:        '#22c55e',
    strong_evidence: '#06b6d4',
    debated:         '#eab308',
    speculative:     '#f59e0b',
    mythological:    '#ef4444',
  };
  const c = colors[level] ?? '#94a3b8';
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: c + '22', color: c, border: `1px solid ${c}44` }}>
      {level.replace('_', ' ')}
    </span>
  );
}

export default function NodeComparison({ nodeAId, nodeBId, onClose }: Props) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/similarity/compare?a=${encodeURIComponent(nodeAId)}&b=${encodeURIComponent(nodeBId)}`)
      .then(r => r.json())
      .then((d: CompareResponse) => setData(d))
      .catch(() => setError('Failed to load comparison'))
      .finally(() => setLoading(false));
  }, [nodeAId, nodeBId]);

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={20} className="animate-spin text-purple-400" />
    </div>
  );

  if (error || !data) return <p className="text-xs text-red-400 py-4">{error ?? 'Unknown error'}</p>;

  const { result, nodeA, nodeB } = data;
  const overallPct = Math.round(result.overall * 100);
  const potPct     = Math.round(result.research_potential * 100);
  const scoreColor = overallPct >= 65 ? '#a855f7' : overallPct >= 40 ? '#f59e0b' : '#64748b';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 text-center">
          <div className="text-lg">{nodeA.icon ?? '◈'}</div>
          <p className="text-xs font-bold text-white mt-1 line-clamp-2">{nodeA.title}</p>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <ArrowLeftRight size={16} className="text-purple-400" />
          <span className="text-xl font-black" style={{ color: scoreColor }}>{overallPct}%</span>
          <span className="text-[9px] text-slate-500">similarity</span>
        </div>
        <div className="flex-1 min-w-0 text-center">
          <div className="text-lg">{nodeB.icon ?? '◈'}</div>
          <p className="text-xs font-bold text-white mt-1 line-clamp-2">{nodeB.title}</p>
        </div>
      </div>

      {/* Dimension breakdown */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Similarity Breakdown</p>
        <div className="space-y-2">
          {(Object.entries(result.dimensions) as [keyof SimilarityDimensions, { score: number; rationale: string }][]).map(([k, v]) => (
            <div key={k}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] text-slate-500 w-20 flex-shrink-0">{DIM_LABELS[k]}</span>
                <ScoreBar score={v.score} />
              </div>
              <p className="text-[9px] text-slate-600 ml-[5.5rem] leading-relaxed">{v.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Research potential */}
      <div className="p-3 rounded-xl bg-purple-900/10 border border-purple-500/20">
        <p className="text-[10px] font-bold text-purple-400 mb-1">Research Potential: {potPct}%</p>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {potPct >= 70
            ? 'High potential — these nodes share themes and entities but draw on different sources. Investigation may reveal genuinely novel connections, or may confirm they are coincidentally similar.'
            : potPct >= 40
            ? 'Moderate potential — some overlap in themes or entities. Worth reviewing but not a priority without additional supporting evidence.'
            : 'Limited research potential — low thematic or entity overlap suggests these nodes are not likely to yield useful comparative insights.'}
        </p>
      </div>

      {/* Side-by-side comparison */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Side-by-Side</p>
        <FieldRow
          label="Evidence"
          a={<EvidenceBadge level={nodeA.evidence_level} />}
          b={<EvidenceBadge level={nodeB.evidence_level} />}
        />
        <FieldRow
          label="Confidence"
          a={<span>{Math.round(nodeA.confidence_score * 100)}%</span>}
          b={<span>{Math.round(nodeB.confidence_score * 100)}%</span>}
        />
        <FieldRow
          label="Category"
          a={<span className="text-[10px] text-slate-400">{nodeA.category}</span>}
          b={<span className="text-[10px] text-slate-400">{nodeB.category}</span>}
        />
        {(nodeA.year ?? nodeA.date_start) !== undefined && (
          <FieldRow
            label="Year"
            a={<span className="text-[10px] text-slate-400">{nodeA.year ?? nodeA.date_start}</span>}
            b={<span className="text-[10px] text-slate-400">{nodeB.year ?? nodeB.date_start ?? '—'}</span>}
          />
        )}
        {(nodeA.country || nodeA.region) && (
          <FieldRow
            label="Location"
            a={<span className="text-[10px] text-slate-400">{[nodeA.region, nodeA.country].filter(Boolean).join(', ') || '—'}</span>}
            b={<span className="text-[10px] text-slate-400">{[nodeB.region, nodeB.country].filter(Boolean).join(', ') || '—'}</span>}
          />
        )}
        <FieldRow
          label="Claims"
          a={<span className="text-[10px] text-slate-400">{nodeA.claims.length} claim{nodeA.claims.length !== 1 ? 's' : ''}</span>}
          b={<span className="text-[10px] text-slate-400">{nodeB.claims.length} claim{nodeB.claims.length !== 1 ? 's' : ''}</span>}
        />
        <FieldRow
          label="Criticisms"
          a={<span className="text-[10px] text-slate-400">{nodeA.criticisms.length}</span>}
          b={<span className="text-[10px] text-slate-400">{nodeB.criticisms.length}</span>}
        />
      </div>

      {/* Critic analysis */}
      {(result.critic.contradictions.length > 0 || result.critic.why_not_related.length > 0) && (
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-900/5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />
            <p className="text-[10px] font-bold text-amber-400">Why these may NOT be related</p>
          </div>
          {result.critic.contradictions.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <XCircle size={10} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed">{c.detail}</p>
            </div>
          ))}
          {result.critic.why_not_related.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle size={10} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[9px] text-slate-700 border-t border-purple-900/10 pt-3 leading-relaxed">
        {data.disclaimer}
      </p>
    </div>
  );
}
