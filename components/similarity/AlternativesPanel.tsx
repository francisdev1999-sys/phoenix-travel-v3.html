'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Loader2, Shuffle, TrendingUp } from 'lucide-react';

interface NodeMeta {
  id:                  string;
  title:               string;
  icon:                string | null;
  evidenceLevel:       string;
  category:            string;
  descriptionSnippet:  string;
}

interface AlternativePair {
  nodeAId:            string;
  nodeBId:            string;
  overallSimilarity:  number;
  thematicSimilarity: number;
  sourceDivergence:   number;
  researchPotential:  number;
  thematicRationale:  string;
  sourceRationale:    string;
  nodeA:              NodeMeta | null;
  nodeB:              NodeMeta | null;
}

interface ApiResponse {
  pairs:      AlternativePair[];
  total:      number;
  disclaimer: string;
}

function AlternativeRow({ pair }: { pair: AlternativePair }) {
  const [open, setOpen] = useState(false);
  const potPct = Math.round(pair.researchPotential * 100);
  const potColor = potPct >= 70 ? '#a855f7' : potPct >= 50 ? '#f59e0b' : '#64748b';

  return (
    <div className="rounded-xl border border-purple-900/20 bg-white/3 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-all"
      >
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-sm flex-shrink-0">{pair.nodeA?.icon ?? '◈'}</span>
          <span className="text-xs text-white truncate">{pair.nodeA?.title ?? pair.nodeAId}</span>
          <span className="text-[10px] text-slate-600 flex-shrink-0">↔</span>
          <span className="text-xs text-white truncate">{pair.nodeB?.title ?? pair.nodeBId}</span>
          <span className="text-sm flex-shrink-0">{pair.nodeB?.icon ?? '◈'}</span>
        </div>
        <span className="text-[10px] font-bold flex-shrink-0 flex items-center gap-1" style={{ color: potColor }}>
          <TrendingUp size={9} /> {potPct}%
        </span>
        {open ? <ChevronUp size={11} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={11} className="text-slate-500 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-purple-900/10 pt-2 space-y-2.5">
              {/* Side-by-side snippets */}
              <div className="grid grid-cols-2 gap-2">
                {[pair.nodeA, pair.nodeB].map((n, i) => n && (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] font-semibold text-white">{n.title}</p>
                    <p className="text-[9px] text-slate-500 italic">{n.category} · {n.evidenceLevel.replace('_', ' ')}</p>
                    <p className="text-[9px] text-slate-400 leading-relaxed">{n.descriptionSnippet}…</p>
                  </div>
                ))}
              </div>

              {pair.thematicRationale && (
                <p className="text-[10px] text-slate-500">
                  <span className="text-slate-400 font-medium">Thematic: </span>{pair.thematicRationale}
                </p>
              )}
              {pair.sourceRationale && (
                <p className="text-[10px] text-slate-500">
                  <span className="text-slate-400 font-medium">Source divergence: </span>{pair.sourceRationale}
                </p>
              )}

              <div className="flex gap-4 text-[9px] text-slate-600">
                <span>Thematic similarity: <span className="text-slate-400">{Math.round(pair.thematicSimilarity * 100)}%</span></span>
                <span>Source divergence: <span className="text-slate-400">{Math.round(pair.sourceDivergence * 100)}%</span></span>
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

export default function AlternativesPanel({ nodeId }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = nodeId
      ? `/api/similarity/alternatives?nodeId=${encodeURIComponent(nodeId)}&limit=15`
      : `/api/similarity/alternatives?limit=20`;
    fetch(url)
      .then(r => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => setError('Failed to load alternatives'))
      .finally(() => setLoading(false));
  }, [nodeId]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={18} className="animate-spin text-purple-400" />
    </div>
  );

  if (error) return <p className="text-xs text-red-400 py-4">{error}</p>;
  if (!data || data.pairs.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-8">
      <Shuffle size={18} className="text-slate-600" />
      <p className="text-xs text-slate-500">No alternative explanation pairs found.</p>
      {!nodeId && <p className="text-[10px] text-slate-600">Run a similarity rebuild to populate this view.</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-900/5">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="font-bold text-purple-400">Alternative explanations.</span>{' '}
          These node pairs share thematic characteristics but draw on entirely different source bases,
          suggesting independent traditions or competing hypotheses. High research potential means
          investigation may be worthwhile — but similarity is NOT evidence of connection.
        </p>
      </div>

      <div className="space-y-2">
        {data.pairs.map(p => (
          <AlternativeRow key={`${p.nodeAId}:${p.nodeBId}`} pair={p} />
        ))}
      </div>

      <p className="text-[9px] text-slate-700 border-t border-purple-900/10 pt-3 leading-relaxed">
        {data.disclaimer}
      </p>
    </div>
  );
}
