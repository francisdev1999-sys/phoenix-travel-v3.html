'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rabbit, ChevronRight, RotateCcw, Loader2, ExternalLink } from 'lucide-react';
import { nodes as staticNodes } from '@/lib/graph';
import { CATEGORY_COLORS, EVIDENCE_COLORS } from '@/lib/graph';
import { computeRabbitHole, scoreTier, TIER_COLORS, RELATIONSHIP_COLORS, RELATIONSHIP_LABELS, type RabbitHoleData } from '@/lib/rabbit-hole';
import { nodes as allNodes, edges as allEdges } from '@/lib/graph';
import { useUserStore } from '@/lib/store/userStore';

export default function RabbitHoleMode() {
  const { rabbitHoleNodeId, setRabbitHoleNodeId, setCurrentView, rabbitHoleChain, setRabbitHoleChain } = useUserStore();
  const [data, setData] = useState<RabbitHoleData | null>(null);

  // Compute locally — no network needed for the side panel
  useEffect(() => {
    if (!rabbitHoleNodeId) { setData(null); return; }
    const result = computeRabbitHole(rabbitHoleNodeId, allNodes, allEdges);
    setData(result);
  }, [rabbitHoleNodeId]);

  const navigate = (nodeId: string) => {
    setRabbitHoleChain([...(rabbitHoleChain ?? []), nodeId]);
    setRabbitHoleNodeId(nodeId);
  };

  const reset = () => {
    setRabbitHoleNodeId(null);
    setRabbitHoleChain([]);
    setData(null);
  };

  const openFull = () => {
    setCurrentView('rabbit-hole');
  };

  if (!rabbitHoleNodeId || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <Rabbit size={32} className="text-purple-400 mx-auto animate-bounce" />
        <p className="text-sm text-slate-400">
          Click any node in the Knowledge Graph and press{' '}
          <span className="text-purple-300 font-bold">Rabbit Hole</span> to start exploring.
        </p>
        <p className="text-xs text-slate-600">Paths are ranked by evidence quality, historical relevance, and graph confidence.</p>
      </div>
    );
  }

  const { node, connections } = data;
  const catColor = CATEGORY_COLORS[node.category] ?? '#7c3aed';
  const evColor  = EVIDENCE_COLORS[node.evidence_level] ?? '#94a3b8';
  const top5     = connections.slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-900/20 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
            <Rabbit size={14} />
            Rabbit Hole — Depth {(rabbitHoleChain?.length ?? 0) + 1}
          </div>
          <button onClick={reset} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors">
            <RotateCcw size={11} />Reset
          </button>
        </div>

        {/* Current node */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-purple-900/30">
          <span className="text-xl">{node.icon ?? '◈'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{node.title}</p>
            <p className="text-[10px]" style={{ color: catColor }}>{node.category}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-purple-400">{Math.round(node.confidence_score * 100)}%</div>
            <div className="text-[9px]" style={{ color: evColor }}>{node.evidence_level.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {/* Connections */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            Top {top5.length} paths
          </p>
          <button onClick={openFull} className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
            Full analysis <ExternalLink size={9} />
          </button>
        </div>

        {top5.map((conn, i) => {
          const tier      = scoreTier(conn.score);
          const tierColor = TIER_COLORS[tier];
          const relColor  = RELATIONSHIP_COLORS[conn.edge.relationship_type] ?? '#94a3b8';
          const relLabel  = RELATIONSHIP_LABELS[conn.edge.relationship_type];
          const pct       = Math.round(conn.score * 100);
          const cc        = CATEGORY_COLORS[conn.node.category] ?? '#7c3aed';

          return (
            <motion.button
              key={conn.node.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => navigate(conn.node.id)}
              className="w-full text-left p-3 rounded-xl border border-purple-900/30 bg-white/4 hover:border-purple-500/40 hover:bg-white/8 transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: relColor + '22', color: relColor }}>{relLabel}</span>
                <span className="ml-auto text-[10px] font-bold" style={{ color: tierColor }}>{pct}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">{conn.node.icon ?? '◈'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{conn.node.title}</p>
                  <p className="text-[9px]" style={{ color: cc }}>{conn.node.category}</p>
                </div>
                <ChevronRight size={12} className="text-purple-500 flex-shrink-0" />
              </div>
              {/* Score bar */}
              <div className="mt-2 h-0.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tierColor }} />
              </div>
            </motion.button>
          );
        })}

        {connections.length > 5 && (
          <button onClick={openFull}
            className="w-full py-2.5 rounded-xl text-xs text-purple-400 border border-purple-900/30 hover:border-purple-500/40 hover:bg-white/5 transition-all">
            +{connections.length - 5} more connections in full view
          </button>
        )}
      </div>

      {/* History trail */}
      {(rabbitHoleChain?.length ?? 0) > 0 && (
        <div className="p-3 border-t border-purple-900/20 flex-shrink-0">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Trail</p>
          <div className="flex flex-col gap-1">
            {(rabbitHoleChain ?? []).map((id, i) => {
              const n = staticNodes.find(x => x.id === id);
              return (
                <button key={id + i} onClick={() => setRabbitHoleNodeId(id)}
                  className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-white transition-colors text-left">
                  <span>{n?.icon ?? '◈'}</span>{n?.title ?? id}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
