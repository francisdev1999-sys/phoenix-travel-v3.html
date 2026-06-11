'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Zap, Network, BookOpen, CheckCircle2, Clock, AlertTriangle,
  XCircle, Loader2, RefreshCw, DollarSign, Key, Sparkles,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditItem {
  id: string; label: string; category: string; evidenceLevel: string;
  status: string; aiAuditedAt: string | null; submitterName: string | null;
  qualityScore: number | null; recommendation: string | null;
  flagCount: number; model: string | null; estimatedCost: number | null;
}
interface ReviewItem {
  id: string; createdAt: string; model: string;
  inputTokens: number; outputTokens: number; estimatedCost: number;
  nodeId: string; nodeTitle: string; createdBy: string | null;
}
interface SemanticItem {
  id: string; createdAt: string; status: string; relationshipType: string;
  confidenceScore: number; riskLevel: string; reason: string;
  fromTitle: string; toTitle: string;
}
interface NarrativeItem {
  nodeId: string; nodeTitle: string; model: string;
  cachedAt: string; preview: string;
}

interface FeatureData<T> {
  totalAllTime: number; thisMonth: number; costThisMonth?: number;
  pending?: number; model: string; trigger: string; recentItems: T[];
}

interface ActivityData {
  apiKeyConfigured: boolean; monthStart: string; totalCostThisMonth: number;
  features: {
    proposalAudit:       FeatureData<AuditItem>;
    deepResearchReview:  FeatureData<ReviewItem>;
    semanticSuggestions: FeatureData<SemanticItem>;
    rabbitHoleNarratives:FeatureData<NarrativeItem>;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtCost(n: number | null | undefined) {
  if (n == null) return '—';
  if (n < 0.001) return '<$0.001';
  return `$${n.toFixed(4)}`;
}

const RECOMMENDATION_STYLE: Record<string, string> = {
  approve:          'text-emerald-400',
  flag_for_review:  'text-amber-400',
  needs_revision:   'text-red-400',
};
const STATUS_STYLE: Record<string, string> = {
  pending:  'text-amber-400',
  approved: 'text-emerald-400',
  rejected: 'text-red-400',
  revised:  'text-blue-400',
};
const RISK_STYLE: Record<string, string> = {
  low:    'text-emerald-400',
  medium: 'text-amber-400',
  high:   'text-red-400',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function FeatureHeader({
  icon, label, model, trigger, totalAllTime, thisMonth, costThisMonth, pending,
}: {
  icon: React.ReactNode; label: string; model: string; trigger: string;
  totalAllTime: number; thisMonth: number; costThisMonth?: number; pending?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-purple-900/30 text-purple-400">{icon}</div>
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Model: <span className="text-purple-300">{model}</span></p>
          <p className="text-[10px] text-slate-500">{trigger}</p>
        </div>
      </div>
      <div className="flex gap-3 text-right flex-shrink-0">
        <div>
          <p className="text-lg font-bold text-white">{thisMonth}</p>
          <p className="text-[10px] text-slate-500">this month</p>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-300">{totalAllTime}</p>
          <p className="text-[10px] text-slate-500">all time</p>
        </div>
        {costThisMonth != null && (
          <div>
            <p className="text-lg font-bold text-emerald-400">{fmtCost(costThisMonth)}</p>
            <p className="text-[10px] text-slate-500">cost / mo</p>
          </div>
        )}
        {pending != null && (
          <div>
            <p className="text-lg font-bold text-amber-400">{pending}</p>
            <p className="text-[10px] text-slate-500">pending</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="text-xs text-slate-600 text-center py-4 italic">{label}</p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AiActivityDashboard() {
  const [data, setData]       = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    fetch('/api/admin/ai-activity')
      .then(r => r.json())
      .then((d: ActivityData) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load AI activity data.'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-400" size={22} /></div>;
  }
  if (error || !data) {
    return <p className="text-xs text-red-400 text-center py-8">{error ?? 'Unknown error'}</p>;
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Brain size={16} className="text-purple-400" /> AI Activity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Since {new Date(data.monthStart).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* API key status + total cost */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${data.apiKeyConfigured ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-red-500/30 bg-red-900/10'}`}>
          <Key size={16} className={data.apiKeyConfigured ? 'text-emerald-400' : 'text-red-400'} />
          <div>
            <p className="text-xs font-bold text-white">ANTHROPIC_API_KEY</p>
            <p className={`text-[10px] font-medium mt-0.5 ${data.apiKeyConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.apiKeyConfigured ? 'Configured — AI features active' : 'Not set — all AI features silent'}
            </p>
            {!data.apiKeyConfigured && (
              <p className="text-[10px] text-slate-500 mt-1">Add to Railway → Service → Variables</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border border-purple-900/30 bg-white/5">
          <DollarSign size={16} className="text-purple-400" />
          <div>
            <p className="text-xs font-bold text-white">Total Claude Cost</p>
            <p className="text-lg font-bold text-purple-300 mt-0.5">{fmtCost(data.totalCostThisMonth)}</p>
            <p className="text-[10px] text-slate-500">this month (tracked features)</p>
          </div>
        </div>
      </div>

      {/* ── Feature 1: Proposal Audit ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-purple-900/30 bg-white/5 p-5"
      >
        <FeatureHeader
          icon={<Zap size={16} />}
          label="Proposal Audit"
          model={data.features.proposalAudit.model}
          trigger={data.features.proposalAudit.trigger}
          totalAllTime={data.features.proposalAudit.totalAllTime}
          thisMonth={data.features.proposalAudit.thisMonth}
          costThisMonth={data.features.proposalAudit.costThisMonth}
        />
        {data.features.proposalAudit.recentItems.length === 0 ? (
          <EmptyRow label="No proposal audits yet — submit a node to trigger the first one." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {data.features.proposalAudit.recentItems.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-white truncate">{a.label}</span>
                  <span className="text-slate-500 ml-2">{a.category}</span>
                </div>
                {a.qualityScore != null && (
                  <span className="font-bold text-purple-300">{a.qualityScore}/100</span>
                )}
                {a.recommendation && (
                  <span className={`font-medium capitalize ${RECOMMENDATION_STYLE[a.recommendation] ?? 'text-slate-400'}`}>
                    {a.recommendation.replace(/_/g, ' ')}
                  </span>
                )}
                {a.flagCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle size={11} />{a.flagCount}
                  </span>
                )}
                <span className="text-slate-600">{fmtDate(a.aiAuditedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Feature 2: Deep Research Review ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
        className="rounded-xl border border-purple-900/30 bg-white/5 p-5"
      >
        <FeatureHeader
          icon={<BookOpen size={16} />}
          label="Deep Research Review"
          model={data.features.deepResearchReview.model}
          trigger={data.features.deepResearchReview.trigger}
          totalAllTime={data.features.deepResearchReview.totalAllTime}
          thisMonth={data.features.deepResearchReview.thisMonth}
          costThisMonth={data.features.deepResearchReview.costThisMonth}
        />
        {data.features.deepResearchReview.recentItems.length === 0 ? (
          <EmptyRow label="No deep reviews yet — trigger one from the Draft Queue on any node." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {data.features.deepResearchReview.recentItems.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-white truncate">{r.nodeTitle}</span>
                </div>
                <span className="text-slate-400">{r.inputTokens + r.outputTokens} tok</span>
                <span className="text-emerald-400 font-medium">{fmtCost(r.estimatedCost)}</span>
                {r.createdBy && <span className="text-slate-500">{r.createdBy}</span>}
                <span className="text-slate-600">{fmtDate(r.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Feature 3: Semantic Suggestions ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-xl border border-purple-900/30 bg-white/5 p-5"
      >
        <FeatureHeader
          icon={<Network size={16} />}
          label="AI Semantic Suggestions"
          model={data.features.semanticSuggestions.model}
          trigger={data.features.semanticSuggestions.trigger}
          totalAllTime={data.features.semanticSuggestions.totalAllTime}
          thisMonth={data.features.semanticSuggestions.thisMonth}
          pending={data.features.semanticSuggestions.pending}
        />
        {data.features.semanticSuggestions.recentItems.length === 0 ? (
          <EmptyRow label="No AI suggestions yet — publish a node to generate the first batch." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {data.features.semanticSuggestions.recentItems.map(s => (
              <div key={s.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-white/5 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-white">{s.fromTitle}</span>
                  <span className="text-slate-500 mx-1.5">→</span>
                  <span className="font-medium text-white">{s.toTitle}</span>
                  <p className="text-slate-500 mt-0.5 truncate">{s.reason}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`font-medium capitalize ${STATUS_STYLE[s.status] ?? 'text-slate-400'}`}>{s.status}</span>
                  <span className={`capitalize ${RISK_STYLE[s.riskLevel] ?? 'text-slate-400'}`}>{s.riskLevel} risk</span>
                  <span className="text-slate-600">{Math.round(s.confidenceScore * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Feature 4: Rabbit-hole Narratives ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}
        className="rounded-xl border border-purple-900/30 bg-white/5 p-5"
      >
        <FeatureHeader
          icon={<Sparkles size={16} />}
          label="Rabbit-hole Narratives"
          model={data.features.rabbitHoleNarratives.model}
          trigger={data.features.rabbitHoleNarratives.trigger}
          totalAllTime={data.features.rabbitHoleNarratives.totalAllTime}
          thisMonth={data.features.rabbitHoleNarratives.thisMonth}
        />
        {data.features.rabbitHoleNarratives.recentItems.length === 0 ? (
          <EmptyRow label="No narratives cached yet — explore a node's connections to generate the first one." />
        ) : (
          <div className="flex flex-col gap-2">
            {data.features.rabbitHoleNarratives.recentItems.map(n => (
              <div key={n.nodeId} className="px-3 py-2.5 rounded-lg bg-white/5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">{n.nodeTitle}</span>
                  <span className="text-slate-600">{fmtDate(n.cachedAt)}</span>
                </div>
                <p className="text-slate-400 line-clamp-2">{n.preview}…</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-slate-600 px-1">
        <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-500" />approve / active</span>
        <span className="flex items-center gap-1.5"><Clock       size={11} className="text-amber-500"   />pending review</span>
        <span className="flex items-center gap-1.5"><AlertTriangle size={11} className="text-amber-500" />flags raised</span>
        <span className="flex items-center gap-1.5"><XCircle     size={11} className="text-red-500"     />rejected / key missing</span>
      </div>

    </div>
  );
}
