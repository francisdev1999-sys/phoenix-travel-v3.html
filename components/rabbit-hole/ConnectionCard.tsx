'use client';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, BookMarked } from 'lucide-react';
import { CATEGORY_COLORS, EVIDENCE_COLORS } from '@/lib/graph';
import {
  RELATIONSHIP_COLORS, RELATIONSHIP_LABELS, TIER_COLORS, scoreTier,
  type RHConnection,
} from '@/lib/rabbit-hole';

interface Props {
  conn:          RHConnection;
  onExplore:     (nodeId: string) => void;
  sourceCount?:  number;
  index:         number;
}

export default function ConnectionCard({ conn, onExplore, sourceCount = 0, index }: Props) {
  const { node, edge, score, breakdown, direction } = conn;
  const tier      = scoreTier(score);
  const tierColor = TIER_COLORS[tier];
  const catColor  = CATEGORY_COLORS[node.category] ?? '#7c3aed';
  const evColor   = EVIDENCE_COLORS[node.evidence_level] ?? '#94a3b8';
  const relColor  = RELATIONSHIP_COLORS[edge.relationship_type] ?? '#94a3b8';
  const relLabel  = RELATIONSHIP_LABELS[edge.relationship_type];
  const pct       = Math.round(score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group rounded-xl border border-purple-900/30 bg-white/4 hover:border-purple-500/40 hover:bg-white/7 transition-all overflow-hidden cursor-pointer"
      onClick={() => onExplore(node.id)}
    >
      <div className="p-3.5">
        {/* Top row — badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: relColor + '22', color: relColor, border: `1px solid ${relColor}44` }}>
            {relLabel}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: evColor + '18', color: evColor }}>
            {(node.evidence_level ?? 'unknown').replace('_', ' ')}
          </span>
          {direction === 'incoming' && (
            <span className="text-[9px] text-slate-600 ml-auto">← references this</span>
          )}
          {sourceCount > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-cyan-500 ml-auto">
              <BookMarked size={9} />{sourceCount}
            </span>
          )}
        </div>

        {/* Node title */}
        <div className="flex items-start gap-2 mb-2.5">
          <span className="text-base leading-none flex-shrink-0 mt-0.5">{node.icon ?? '◈'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-snug group-hover:text-purple-200 transition-colors">{node.title}</p>
            <p className="text-[10px]" style={{ color: catColor }}>{node.category}</p>
          </div>
          <ArrowRight size={13} className="text-purple-500 group-hover:text-purple-300 transition-colors flex-shrink-0 mt-1" />
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: index * 0.04 + 0.1, duration: 0.5 }}
              style={{ background: tierColor }}
            />
          </div>
          <span className="text-[10px] font-bold w-7 text-right" style={{ color: tierColor }}>
            {pct}
          </span>
        </div>

        {/* Score breakdown — tooltip-style on hover */}
        <div className="hidden group-hover:flex items-center gap-3 mt-2 text-[9px] text-slate-500">
          <span>Confidence {Math.round(breakdown.confidence / 0.35 * 100)}%</span>
          <span>·</span>
          <span>Evidence {Math.round(breakdown.evidenceQuality / 0.30 * 100)}%</span>
          <span>·</span>
          <span>Strength {Math.round(breakdown.edgeStrength / 0.20 * 100)}%</span>
        </div>
      </div>

      {/* Explanation snippet */}
      <div className="px-3.5 pb-3 text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
        {edge.explanation}
      </div>
    </motion.div>
  );
}
