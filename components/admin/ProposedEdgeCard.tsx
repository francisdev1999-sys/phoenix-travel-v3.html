'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ArrowRight, User } from 'lucide-react';
import { EVIDENCE_COLORS } from '@/lib/graph';
import ReviewActions from './ReviewActions';

interface ProposedEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: string;
  description: string;
  evidenceLevel: string;
  confidence: number;
  strengthScore: number;
  explanation?: string | null;
  historicalBasis?: string | null;
  status: string;
  reviewNotes?: string | null;
  createdAt: string;
  submitter?: { id: string; name?: string | null; image?: string | null } | null;
}

interface Props {
  edge: ProposedEdge;
  onReviewed: (id: string, action: string) => void;
}

const REL_COLORS: Record<string, string> = {
  historical:    '#f59e0b',
  geographical:  '#22c55e',
  textual:       '#6366f1',
  thematic:      '#a855f7',
  influence:     '#06b6d4',
  contradictory: '#ef4444',
};

export default function ProposedEdgeCard({ edge, onReviewed }: Props) {
  const [expanded, setExpanded] = useState(false);

  const relColor = REL_COLORS[edge.relationship] ?? '#94a3b8';
  const evColor  = (EVIDENCE_COLORS as Record<string, string>)[edge.evidenceLevel] ?? '#94a3b8';

  return (
    <div className="rounded-xl border border-purple-900/30 bg-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-all"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: relColor + '22', color: relColor, border: `1px solid ${relColor}44` }}>
              {edge.relationship}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: evColor + '22', color: evColor }}>
              {edge.evidenceLevel.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-slate-500 ml-auto">
              {Math.round(edge.confidence * 100)}% confidence
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <code className="text-cyan-400 font-mono text-xs bg-cyan-900/20 px-1.5 py-0.5 rounded">{edge.fromNodeId}</code>
            <ArrowRight size={12} className="text-slate-500 flex-shrink-0" />
            <code className="text-purple-400 font-mono text-xs bg-purple-900/20 px-1.5 py-0.5 rounded">{edge.toNodeId}</code>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{edge.description}</p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0 mt-1" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0 mt-1" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-4 border-t border-purple-900/20 pt-4">
              {/* Meta */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                {edge.submitter && (
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {edge.submitter.name ?? 'Anonymous'}
                  </span>
                )}
                <span>{new Date(edge.createdAt).toLocaleDateString()}</span>
                <span>Strength: {Math.round(edge.strengthScore * 100)}%</span>
              </div>

              {/* Strength bar */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${edge.confidence * 100}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{Math.round(edge.confidence * 100)}%</span>
                </div>
              </div>

              {edge.explanation && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Explanation</p>
                  <p className="text-xs text-slate-300">{edge.explanation}</p>
                </div>
              )}

              {edge.historicalBasis && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Historical basis</p>
                  <p className="text-xs text-slate-400">{edge.historicalBasis}</p>
                </div>
              )}

              {edge.status === 'pending' && (
                <ReviewActions
                  endpoint={`/api/edges/${edge.id}/review`}
                  onDone={action => onReviewed(edge.id, action)}
                />
              )}

              {edge.reviewNotes && (
                <div className="p-3 rounded-xl bg-yellow-900/10 border border-yellow-500/20">
                  <p className="text-[10px] font-bold text-yellow-400 mb-1">Review notes</p>
                  <p className="text-xs text-slate-300">{edge.reviewNotes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
