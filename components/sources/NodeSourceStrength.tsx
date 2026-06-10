'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, BookMarked, Loader2 } from 'lucide-react';
import { CREDIBILITY_BAR_COLOR, CREDIBILITY_LABEL } from '@/lib/source-credibility';

interface SourceQuality {
  sourceCount:            number;
  approvedCount:          number;
  pendingCount:           number;
  strongCount:            number;
  hasPrimarySource:       boolean;
  hasContradictingSource: boolean;
  avgCredibility:         number;
  sourceQualityScore:     number;
  publicationRecommendation: 'ready' | 'needs_review' | 'not_ready';
  publicationReasons:     string[];
  reviewFlags:            string[];
}

interface Props {
  nodeId:   string;
  isAdmin?: boolean;
}

export default function NodeSourceStrength({ nodeId, isAdmin = false }: Props) {
  const [quality,  setQuality]  = useState<SourceQuality | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`/api/nodes/${nodeId}/source-quality`)
      .then(r => r.ok ? r.json() : null)
      .then(setQuality)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [nodeId]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 size={12} className="animate-spin" />Loading source quality…
      </div>
    );
  }

  if (!quality) return null;

  const { sourceQualityScore, avgCredibility, approvedCount, pendingCount, strongCount,
          hasPrimarySource, hasContradictingSource, publicationRecommendation,
          publicationReasons, reviewFlags } = quality;

  const pct     = Math.round(sourceQualityScore * 100);
  const credPct = Math.round(avgCredibility * 100);

  const RecommIcon =
    publicationRecommendation === 'ready'       ? ShieldCheck :
    publicationRecommendation === 'needs_review' ? ShieldAlert : ShieldX;

  const recommColor =
    publicationRecommendation === 'ready'       ? 'text-emerald-400' :
    publicationRecommendation === 'needs_review' ? 'text-amber-400'   : 'text-red-400';

  const barColor = CREDIBILITY_BAR_COLOR(sourceQualityScore);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          <BookMarked size={12} className="text-purple-400" />
          Source Strength
        </span>
        <span className={`text-xs font-medium flex items-center gap-1 ${recommColor}`}>
          <RecommIcon size={12} />
          {publicationRecommendation === 'ready'        ? 'Sources verified'  :
           publicationRecommendation === 'needs_review' ? 'Needs review'       : 'Insufficient sources'}
        </span>
      </div>

      {/* Quality bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Source quality score</span>
          <span className="font-mono font-medium text-white">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Sources" value={approvedCount} sub={pendingCount > 0 ? `+${pendingCount} pending` : undefined} />
        <Stat label="Avg credibility" value={`${credPct}%`} sub={CREDIBILITY_LABEL(avgCredibility)} />
        <Stat label="Strong sources" value={strongCount} sub={hasPrimarySource ? '· has primary' : undefined} />
      </div>

      {/* Flags */}
      {(isAdmin || publicationRecommendation !== 'ready') && publicationReasons.length > 0 && (
        <div className="flex flex-col gap-1">
          {publicationReasons.map((r, i) => (
            <p key={i} className="text-[10px] text-slate-400 flex items-start gap-1">
              <span className="text-amber-500 mt-px">·</span>{r}
            </p>
          ))}
        </div>
      )}

      {/* Contradiction notice — always visible */}
      {hasContradictingSource && (
        <p className="text-[10px] text-amber-400 flex items-center gap-1">
          <ShieldAlert size={10} />
          Contradicting sources are present — content reflects an active scholarly debate.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-slate-800/50 rounded-lg p-2">
      <span className="text-[9px] text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
      {sub && <span className="text-[9px] text-slate-500">{sub}</span>}
    </div>
  );
}
