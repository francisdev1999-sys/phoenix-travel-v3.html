'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, User, Calendar } from 'lucide-react';
import { EVIDENCE_COLORS, CATEGORY_COLORS } from '@/lib/graph';
import ReviewActions from './ReviewActions';

interface ProposedNode {
  id: string;
  nodeId?: string | null;
  label: string;
  category: string;
  description: string;
  evidenceLevel: string;
  confidence: number;
  claims?: string[] | null;
  criticisms?: string[] | null;
  openQuestions?: string[] | null;
  mainstreamView?: string | null;
  region?: string | null;
  country?: string | null;
  status: string;
  reviewNotes?: string | null;
  createdAt: string;
  submitter?: { id: string; name?: string | null; image?: string | null } | null;
}

interface Props {
  node: ProposedNode;
  onReviewed: (id: string, action: string) => void;
}

export default function ProposedNodeCard({ node, onReviewed }: Props) {
  const [expanded, setExpanded] = useState(false);

  const evColor  = (EVIDENCE_COLORS as Record<string, string>)[node.evidenceLevel] ?? '#94a3b8';
  const catColor = (CATEGORY_COLORS as Record<string, string>)[node.category]      ?? '#94a3b8';

  return (
    <div className="rounded-xl border border-purple-900/30 bg-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-all"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: catColor + '22', color: catColor, border: `1px solid ${catColor}44` }}>
              {node.category}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: evColor + '22', color: evColor }}>
              {node.evidenceLevel.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-slate-500 ml-auto">
              {Math.round(node.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-sm font-bold text-white">{node.label}</p>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{node.description}</p>
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
                {node.submitter && (
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {node.submitter.name ?? 'Anonymous'}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(node.createdAt).toLocaleDateString()}
                </span>
                {(node.region || node.country) && (
                  <span>{[node.region, node.country].filter(Boolean).join(', ')}</span>
                )}
              </div>

              {/* Content sections */}
              {node.claims && (node.claims as string[]).length > 0 && (
                <Section label="Claims">
                  <ul className="flex flex-col gap-1">
                    {(node.claims as string[]).map((c, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-300">
                        <span className="text-purple-400 font-bold flex-shrink-0">{i + 1}.</span>{c}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {node.criticisms && (node.criticisms as string[]).length > 0 && (
                <Section label="Criticisms">
                  <ul className="flex flex-col gap-1">
                    {(node.criticisms as string[]).map((c, i) => (
                      <li key={i} className="flex gap-2 text-xs text-red-300">
                        <span className="flex-shrink-0">✗</span>{c}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {node.mainstreamView && (
                <Section label="Mainstream view">
                  <p className="text-xs text-slate-400">{node.mainstreamView}</p>
                </Section>
              )}

              {node.status === 'pending' && (
                <ReviewActions
                  endpoint={`/api/nodes/${node.id}/review`}
                  onDone={action => onReviewed(node.id, action)}
                />
              )}

              {node.reviewNotes && (
                <div className="p-3 rounded-xl bg-yellow-900/10 border border-yellow-500/20">
                  <p className="text-[10px] font-bold text-yellow-400 mb-1">Review notes</p>
                  <p className="text-xs text-slate-300">{node.reviewNotes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}
