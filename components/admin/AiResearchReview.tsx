'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, Loader2, RefreshCw, AlertTriangle, ShieldAlert, ShieldCheck,
  ShieldX, BookOpen, Search, FlaskConical, CheckCircle2, XCircle, Info,
  ChevronDown, ChevronUp, DollarSign, Clock,
} from 'lucide-react';
import type { AiReviewJson } from '@/lib/ai-review';

interface StoredReview {
  id:            string;
  model:         string;
  promptVersion: string;
  review:        AiReviewJson;
  inputTokens:   number;
  outputTokens:  number;
  estimatedCost: number;
  createdAt:     string;
  cached:        boolean;
}

interface Props { nodeId: string }

// ── Risk level helpers ────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  low:    'text-emerald-400 bg-emerald-900/20 border-emerald-700/30',
  medium: 'text-amber-400 bg-amber-900/20 border-amber-700/30',
  high:   'text-red-400 bg-red-900/20 border-red-700/30',
};
const RISK_ICON = (level: string) =>
  level === 'low' ? <ShieldCheck size={12} /> :
  level === 'medium' ? <ShieldAlert size={12} /> : <ShieldX size={12} />;

const RECOMMENDATION_STYLES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  approve_candidate: { color: 'text-emerald-400 border-emerald-700/40 bg-emerald-900/20', icon: <CheckCircle2 size={14} />, label: 'Approve Candidate' },
  needs_review:      { color: 'text-amber-400 border-amber-700/40 bg-amber-900/20',   icon: <AlertTriangle size={14} />, label: 'Needs Review' },
  high_risk_review:  { color: 'text-red-400 border-red-700/40 bg-red-900/20',         icon: <XCircle size={14} />,      label: 'High Risk — Review Carefully' },
};

const CONSENSUS_COLORS: Record<string, string> = {
  strong_support:   'text-emerald-400',
  moderate_support: 'text-blue-400',
  debated:          'text-amber-400',
  weak_support:     'text-orange-400',
  rejected:         'text-red-400',
  unknown:          'text-slate-400',
};

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-800/60 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900/60 hover:bg-slate-800/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          {icon}{title}
        </span>
        {open ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
      </button>
      {open && <div className="px-3 py-3">{children}</div>}
    </div>
  );
}

// ── Bullet list ───────────────────────────────────────────────────────────────

function BulletList({ items, color = 'text-slate-400' }: { items: string[]; color?: string }) {
  if (!items?.length) return <p className="text-[10px] text-slate-600 italic">None identified.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={i} className={`text-xs ${color} flex items-start gap-1.5`}>
          <span className="text-slate-600 mt-0.5 flex-shrink-0">·</span>{item}
        </li>
      ))}
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AiResearchReview({ nodeId }: Props) {
  const [stored,   setStored]   = useState<StoredReview | null | undefined>(undefined); // undefined = loading
  const [running,  setRunning]  = useState(false);
  const [error,    setError]    = useState('');
  const [warning,  setWarning]  = useState('');

  const loadExisting = useCallback(() => {
    fetch(`/api/admin/ai-review?nodeId=${nodeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setStored(d))
      .catch(() => setStored(null));
  }, [nodeId]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const runReview = async (forceRerun = false) => {
    setRunning(true); setError(''); setWarning('');
    try {
      const res = await fetch('/api/admin/ai-review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nodeId, forceRerun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Review failed');
        return;
      }
      if (data.budgetWarning) setWarning(data.budgetWarning);
      setStored({ ...data, createdAt: data.createdAt ?? new Date().toISOString() });
    } finally {
      setRunning(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (stored === undefined) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-500">
        <Loader2 size={13} className="animate-spin" />Loading…
      </div>
    );
  }

  // ── Empty state (no review yet) ───────────────────────────────────────────

  if (stored === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
        <Sparkles size={20} className="text-purple-400" />
        <div>
          <p className="text-sm font-semibold text-white">AI Deep Research Review</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Claude will analyze this node's evidence, sources, and archive context without modifying any data.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2 w-full text-left">
            {error}
          </p>
        )}
        <button
          onClick={() => runReview(false)}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 transition-colors disabled:opacity-40"
        >
          {running
            ? <><Loader2 size={12} className="animate-spin" />Analyzing…</>
            : <><Sparkles size={12} />Run AI Deep Research Review</>}
        </button>
        <p className="text-[9px] text-slate-600">~$0.02 per review · manual only · results are advisory</p>
      </div>
    );
  }

  // ── Review display ────────────────────────────────────────────────────────

  const r   = stored.review;
  const rec = RECOMMENDATION_STYLES[r.review_recommendation?.status] ?? RECOMMENDATION_STYLES.needs_review;
  const ts  = stored.createdAt ? new Date(stored.createdAt).toLocaleString() : '—';

  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-purple-400" />
          <span className="text-xs font-semibold text-white">AI Research Review</span>
          <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
            <Clock size={9} />{ts}
          </span>
          {stored.cached && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">cached</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-600 flex items-center gap-0.5">
            <DollarSign size={9} />${stored.estimatedCost?.toFixed(4) ?? '?'} · {stored.inputTokens + stored.outputTokens} tokens
          </span>
          <button
            onClick={() => runReview(true)}
            disabled={running}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors disabled:opacity-40"
            title="Rerun — costs ~$0.02"
          >
            {running ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Rerun
          </button>
        </div>
      </div>

      {/* Budget warning */}
      {warning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30 text-xs text-amber-300">
          <AlertTriangle size={11} />{warning}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-700/30 text-xs text-red-400">
          <AlertTriangle size={11} />{error}
        </div>
      )}

      {/* RECOMMENDATION — most prominent */}
      <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${rec.color}`}>
        <span className="flex-shrink-0 mt-0.5">{rec.icon}</span>
        <div>
          <p className="text-sm font-bold">{rec.label}</p>
          <p className="text-xs mt-0.5 opacity-80">{r.review_recommendation?.reason}</p>
        </div>
      </div>

      {/* DISCLAIMER */}
      <p className="text-[9px] text-slate-600 italic px-1">
        AI analysis is advisory only. Human reviewers make all final decisions. No data has been modified.
      </p>

      {/* Research Summary */}
      <Section title="Research Summary" icon={<BookOpen size={12} />}>
        <p className="text-xs text-slate-300 leading-relaxed">{r.research_summary}</p>
      </Section>

      {/* Academic Consensus */}
      <Section title="Academic Consensus" icon={<Search size={12} />}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 uppercase tracking-wide">Consensus level</span>
            <span className={`text-xs font-bold capitalize ${CONSENSUS_COLORS[r.academic_consensus?.level] ?? 'text-slate-400'}`}>
              {r.academic_consensus?.level?.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-400">{r.academic_consensus?.summary}</p>
          <div className="grid grid-cols-1 gap-1.5 mt-1">
            {[
              { label: 'Mainstream', value: r.academic_consensus?.mainstream_position },
              { label: 'Minority scholarly', value: r.academic_consensus?.minority_position },
              { label: 'Alternative/fringe', value: r.academic_consensus?.alternative_position },
            ].filter(p => p.value).map(p => (
              <div key={p.label} className="px-2.5 py-2 rounded-lg bg-slate-900/50">
                <span className="text-[9px] text-slate-500 uppercase tracking-wide">{p.label}</span>
                <p className="text-xs text-slate-300 mt-0.5">{p.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Supporting + Contradictory Evidence */}
      <Section title="Evidence" icon={<FlaskConical size={12} />}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[9px] text-emerald-500 uppercase tracking-wide mb-1">Supporting</p>
            <BulletList items={r.supporting_evidence} color="text-slate-300" />
          </div>
          <div>
            <p className="text-[9px] text-red-400 uppercase tracking-wide mb-1">Contradictory</p>
            <BulletList items={r.contradictory_evidence} color="text-slate-300" />
          </div>
        </div>
      </Section>

      {/* Source Analysis */}
      <Section title="Source Analysis" icon={<Info size={12} />}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">Strength</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${(r.source_analysis?.strength ?? 0) >= 0.65 ? 'bg-emerald-500' : (r.source_analysis?.strength ?? 0) >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${(r.source_analysis?.strength ?? 0) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-white">{Math.round((r.source_analysis?.strength ?? 0) * 100)}%</span>
          </div>
          <BulletList items={r.source_analysis?.notes ?? []} />
        </div>
      </Section>

      {/* Risk levels */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`flex flex-col gap-1 px-3 py-2 rounded-xl border text-xs ${RISK_COLOR[r.extraordinary_claim_risk?.level ?? 'low']}`}>
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-bold">
            {RISK_ICON(r.extraordinary_claim_risk?.level ?? 'low')}Extraordinary Claim
          </span>
          <span className="capitalize font-bold">{r.extraordinary_claim_risk?.level}</span>
          <span className="text-[10px] opacity-80">{r.extraordinary_claim_risk?.reason}</span>
        </div>
        <div className={`flex flex-col gap-1 px-3 py-2 rounded-xl border text-xs ${RISK_COLOR[r.hallucination_risk?.level ?? 'low']}`}>
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-bold">
            {RISK_ICON(r.hallucination_risk?.level ?? 'low')}Hallucination Risk
          </span>
          <span className="capitalize font-bold">{r.hallucination_risk?.level}</span>
          <span className="text-[10px] opacity-80">{r.hallucination_risk?.reason}</span>
        </div>
      </div>

      {/* Suggestions */}
      <Section title="Suggested Evidence & Confidence" icon={<Sparkles size={12} />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          <div className="px-3 py-2 rounded-lg bg-slate-900/50">
            <p className="text-[9px] text-slate-500 uppercase tracking-wide">Suggested evidence level</p>
            <p className="text-xs font-bold text-purple-300 mt-0.5 capitalize">
              {r.suggested_evidence_level?.replace(/_/g, ' ') ?? '—'}
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5">Current: admin decides</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-900/50">
            <p className="text-[9px] text-slate-500 uppercase tracking-wide">Suggested confidence</p>
            <p className="text-xs font-bold text-purple-300 mt-0.5">
              {r.suggested_confidence_score != null ? `${Math.round(r.suggested_confidence_score * 100)}%` : '—'}
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5">Current: admin decides</p>
          </div>
        </div>
        <p className="text-[9px] text-slate-600 mt-2">Suggestions only. Admin sets final values.</p>
      </Section>

      {/* Red flags */}
      {r.red_flags?.length > 0 && (
        <Section title="Red Flags" icon={<AlertTriangle size={12} />} defaultOpen={true}>
          <BulletList items={r.red_flags} color="text-red-300" />
        </Section>
      )}

      {/* Missing information */}
      {r.missing_information?.length > 0 && (
        <Section title="Missing Information" icon={<AlertTriangle size={12} />} defaultOpen={true}>
          <BulletList items={r.missing_information} color="text-amber-300" />
        </Section>
      )}

      {/* Archive relationships */}
      {r.archive_relationships?.length > 0 && (
        <Section title="Suggested Archive Relationships" icon={<Search size={12} />} defaultOpen={false}>
          <div className="flex flex-col gap-2">
            {r.archive_relationships.map((rel, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-white">{rel.nodeTitle}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 capitalize">
                    {rel.relationshipType?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">{rel.reason}</p>
              </div>
            ))}
            <p className="text-[9px] text-slate-600">Suggestions only. Relationships require human approval.</p>
          </div>
        </Section>
      )}

      {/* Recommended actions */}
      {r.recommended_actions?.length > 0 && (
        <Section title="Recommended Actions" icon={<CheckCircle2 size={12} />} defaultOpen={true}>
          <BulletList items={r.recommended_actions} color="text-blue-300" />
        </Section>
      )}

    </div>
  );
}
