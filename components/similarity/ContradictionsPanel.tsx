'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';

interface NodeMeta {
  id:            string;
  title:         string;
  icon:          string | null;
  evidenceLevel: string;
  category:      string;
}

interface ContradictionPair {
  nodeAId:           string;
  nodeBId:           string;
  overallSimilarity: number;
  evidenceConflict:  number;
  severity:          'minor' | 'moderate' | 'significant';
  contradictions:    { type: string; detail: string; severity: string }[];
  nodeA:             NodeMeta | null;
  nodeB:             NodeMeta | null;
}

interface ApiResponse {
  pairs:      ContradictionPair[];
  total:      number;
  disclaimer: string;
}

const SEV_COLOR: Record<string, string> = {
  minor:       '#64748b',
  moderate:    '#f59e0b',
  significant: '#ef4444',
};

const EVIDENCE_COLORS: Record<string, string> = {
  verified:        '#22c55e',
  strong_evidence: '#06b6d4',
  debated:         '#eab308',
  speculative:     '#f97316',
  mythological:    '#ef4444',
};

function ContradictionRow({ pair }: { pair: ContradictionPair }) {
  const [open, setOpen] = useState(false);
  const sc = SEV_COLOR[pair.severity] ?? '#64748b';
  const nA = pair.nodeA;
  const nB = pair.nodeB;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: sc + '30' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-all"
      >
        <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
          style={{ background: sc + '22', color: sc }}>
          {pair.severity}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-xs text-white truncate">{nA?.title ?? pair.nodeAId}</span>
          <span className="text-[10px] text-slate-600 flex-shrink-0">vs</span>
          <span className="text-xs text-white truncate">{nB?.title ?? pair.nodeBId}</span>
        </div>
        {open ? <ChevronUp size={11} className="flex-shrink-0 text-slate-500" /> : <ChevronDown size={11} className="flex-shrink-0 text-slate-500" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t pt-2 space-y-2.5" style={{ borderColor: sc + '20' }}>
              {/* Evidence comparison */}
              <div className="flex items-center gap-2 text-[10px]">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{nA?.icon ?? '◈'}</span>
                  <span className="truncate text-white">{nA?.title}</span>
                  {nA && (
                    <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: (EVIDENCE_COLORS[nA.evidenceLevel] ?? '#94a3b8') + '22', color: EVIDENCE_COLORS[nA.evidenceLevel] ?? '#94a3b8' }}>
                      {nA.evidenceLevel.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <span className="text-slate-600 flex-shrink-0">vs</span>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  {nB && (
                    <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: (EVIDENCE_COLORS[nB.evidenceLevel] ?? '#94a3b8') + '22', color: EVIDENCE_COLORS[nB.evidenceLevel] ?? '#94a3b8' }}>
                      {nB.evidenceLevel.replace('_', ' ')}
                    </span>
                  )}
                  <span className="truncate text-white">{nB?.title}</span>
                  <span className="text-lg flex-shrink-0">{nB?.icon ?? '◈'}</span>
                </div>
              </div>

              {/* Contradiction details */}
              {pair.contradictions.length > 0 && (
                <div className="space-y-1.5">
                  {pair.contradictions.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" style={{ color: SEV_COLOR[c.severity] ?? '#64748b' }} />
                      <p className="text-[10px] text-slate-400 leading-relaxed">{c.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 text-[9px] text-slate-600">
                <span>Similarity: <span className="text-slate-400">{Math.round(pair.overallSimilarity * 100)}%</span></span>
                <span>Evidence conflict: <span className="text-slate-400">{Math.round(pair.evidenceConflict * 100)}%</span></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  nodeId?: string;
}

export default function ContradictionsPanel({ nodeId }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = nodeId
      ? `/api/similarity/contradictions?nodeId=${encodeURIComponent(nodeId)}&limit=15`
      : `/api/similarity/contradictions?limit=20`;
    fetch(url)
      .then(r => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => setError('Failed to load contradictions'))
      .finally(() => setLoading(false));
  }, [nodeId]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={18} className="animate-spin text-amber-400" />
    </div>
  );

  if (error) return <p className="text-xs text-red-400 py-4">{error}</p>;
  if (!data || data.pairs.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-8">
      <Zap size={18} className="text-slate-600" />
      <p className="text-xs text-slate-500">No contradictory node pairs found.</p>
      {!nodeId && <p className="text-[10px] text-slate-600">Run a similarity rebuild to populate this view.</p>}
    </div>
  );

  const significant = data.pairs.filter(p => p.severity === 'significant');
  const other       = data.pairs.filter(p => p.severity !== 'significant');

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-900/5">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="font-bold text-amber-400">Evidence conflicts detected.</span>{' '}
          These nodes share thematic characteristics but have conflicting evidence levels.
          Findings from one must not be used to support the other without independent verification.
        </p>
      </div>

      {significant.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle size={10} className="text-red-400" /> Significant Conflicts
          </p>
          <div className="space-y-2">
            {significant.map(p => <ContradictionRow key={`${p.nodeAId}:${p.nodeBId}`} pair={p} />)}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Moderate / Minor Conflicts
          </p>
          <div className="space-y-2">
            {other.map(p => <ContradictionRow key={`${p.nodeAId}:${p.nodeBId}`} pair={p} />)}
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-700 border-t border-amber-900/10 pt-3 leading-relaxed">
        {data.disclaimer}
      </p>
    </div>
  );
}
