'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, User, Calendar, Bot, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { EVIDENCE_COLORS, CATEGORY_COLORS } from '@/lib/graph';
import ReviewActions from './ReviewActions';
import type { NodeAuditResult, AuditFlag } from '@/lib/ai/node-auditor';

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
  aiAuditResult?: NodeAuditResult | null;
  aiAuditedAt?: string | null;
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

              {/* AI Audit result */}
              {node.aiAuditResult
                ? <AuditPanel audit={node.aiAuditResult} />
                : <div className="flex items-center gap-2 text-xs text-slate-600 py-1">
                    <Bot size={12} />
                    <span>AI audit pending…</span>
                  </div>
              }

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

// ── AI Audit Panel ────────────────────────────────────────────────────────────

const REC_CONFIG = {
  approve:         { label: 'Approve',          color: '#22c55e', icon: CheckCircle },
  flag_for_review: { label: 'Flag for Review',  color: '#f59e0b', icon: AlertTriangle },
  needs_revision:  { label: 'Needs Revision',   color: '#ef4444', icon: AlertTriangle },
} as const;

const SEV_COLOR: Record<AuditFlag['severity'], string> = {
  low:    '#64748b',
  medium: '#f59e0b',
  high:   '#ef4444',
};

const SIX_Q_LABELS: Record<string, string> = {
  supports:         'What supports this?',
  contradicts:      'What contradicts this?',
  mainstream_view:  'Mainstream perspective?',
  missing_evidence: 'Evidence missing?',
  assumptions:      'Underlying assumptions?',
  archive_bias:     'Archive bias risk?',
};

function AuditPanel({ audit }: { audit: NodeAuditResult }) {
  const [open, setOpen] = useState(false);
  const rec      = REC_CONFIG[audit.recommendation] ?? REC_CONFIG.flag_for_review;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RecIcon  = rec.icon as any;
  const scoreColor = audit.quality_score >= 70 ? '#22c55e'
                   : audit.quality_score >= 45 ? '#f59e0b'
                   : '#ef4444';

  return (
    <div className="rounded-xl border bg-white/3 overflow-hidden"
         style={{ borderColor: rec.color + '40' }}>

      {/* Summary row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-all"
      >
        <Bot size={13} className="text-purple-400 flex-shrink-0" />

        <span
          className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: rec.color + '20', color: rec.color, border: `1px solid ${rec.color}40` }}
        >
          <RecIcon size={9} />
          {rec.label}
        </span>

        <span className="text-xs font-bold flex-shrink-0" style={{ color: scoreColor }}>
          {audit.quality_score}/100
        </span>

        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${audit.quality_score}%`, background: scoreColor }}
          />
        </div>

        {audit.flags.length > 0 && (
          <span className="text-[10px] text-slate-500 flex-shrink-0">
            {audit.flags.length} flag{audit.flags.length !== 1 ? 's' : ''}
          </span>
        )}

        <span className="text-[10px] text-slate-600 flex-shrink-0">AI audit</span>
        {open ? <ChevronUp size={12} className="text-slate-500 flex-shrink-0" />
               : <ChevronDown size={12} className="text-slate-500 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 flex flex-col gap-3 border-t border-purple-900/20 pt-3">

              <p className="text-xs text-slate-300 leading-relaxed">{audit.summary}</p>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Clock size={10} />
                <span>Confidence: <span className="text-slate-400 font-medium">{audit.confidence}</span></span>
                <span className="ml-auto">${audit.estimated_cost_usd.toFixed(4)} · {audit.model.split('-').slice(0, 3).join('-')}</span>
              </div>

              {audit.flags.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Flags</p>
                  <ul className="flex flex-col gap-1.5">
                    {audit.flags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className="mt-0.5 flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ background: SEV_COLOR[f.severity] + '20', color: SEV_COLOR[f.severity] }}
                        >
                          {f.severity}
                        </span>
                        <span className="text-[11px] text-slate-300">
                          <span className="text-slate-500">{f.type.replace(/_/g, ' ')}: </span>
                          {f.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {audit.strengths.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Strengths</p>
                  <ul className="flex flex-col gap-1">
                    {audit.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-green-300">
                        <CheckCircle size={10} className="mt-0.5 flex-shrink-0 text-green-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Six balance questions from the anti-echo-chamber spec */}
              {audit.six_questions && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Research Balance Review</p>
                  <div className="flex flex-col gap-2">
                    {Object.entries(audit.six_questions).map(([k, v]) => (
                      <div key={k} className="px-2 py-1.5 rounded-lg bg-white/3">
                        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{SIX_Q_LABELS[k] ?? k}</p>
                        <p className="text-[10px] text-slate-300 leading-relaxed">{v as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[9px] text-slate-600 leading-relaxed border-t border-purple-900/10 pt-2">
                ⚠ AI audit evaluates internal consistency only — not factual accuracy.
                Human review is required before any approval decision.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
