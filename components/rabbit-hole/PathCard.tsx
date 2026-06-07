'use client';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { TIER_COLORS, RELATIONSHIP_COLORS, scoreTier, type RHPath } from '@/lib/rabbit-hole';
import { CATEGORY_COLORS } from '@/lib/graph';

interface Props {
  path:      RHPath;
  onExplore: (nodeId: string) => void;
  index:     number;
}

export default function PathCard({ path, onExplore, index }: Props) {
  const tier  = scoreTier(path.totalScore);
  const color = TIER_COLORS[tier];
  const pct   = Math.round(path.totalScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-purple-900/30 bg-white/4 p-4"
    >
      {/* Score */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
          <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ delay: index * 0.05 + 0.15, duration: 0.5 }} style={{ background: color }} />
        </div>
        <span className="text-[10px] font-bold" style={{ color }}>{pct} pts</span>
      </div>

      {/* Path steps */}
      <div className="flex items-start gap-1.5 flex-wrap">
        {path.steps.map((step, i) => {
          const catColor = CATEGORY_COLORS[step.node.category] ?? '#7c3aed';
          const relColor = RELATIONSHIP_COLORS[step.edge.relationship_type] ?? '#94a3b8';
          return (
            <div key={i} className="flex items-center gap-1.5">
              {/* Relationship arrow */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-6 h-px" style={{ background: relColor + '80' }} />
                <span className="text-[8px] capitalize" style={{ color: relColor }}>
                  {step.edge.relationship_type}
                </span>
              </div>
              {/* Node */}
              <button
                onClick={() => onExplore(step.node.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-all"
                style={{ border: `1px solid ${catColor}33` }}
              >
                <span className="text-xs">{step.node.icon ?? '◈'}</span>
                <span className="text-[10px] font-medium text-white">{step.node.title}</span>
                <ArrowRight size={9} className="text-slate-500" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Explanation of first edge */}
      <p className="text-[9px] text-slate-500 mt-2 line-clamp-2">
        {path.steps[0].edge.explanation}
      </p>
    </motion.div>
  );
}
