'use client';
import { useMemo } from 'react';
import { ShieldAlert, ShieldCheck, ShieldX, BookOpen, BarChart2 } from 'lucide-react';
import { edges } from '@/lib/graph/edges';
import {
  computeResearchCompleteness,
  computeSourceDiversity,
  computeEchoChamberRisk,
  EchoChamberRisk,
} from '@/lib/integrity/scores';
import type { GraphNode } from '@/lib/graph/types';

interface Props {
  node: GraphNode;
}

const RISK_CONFIG: Record<EchoChamberRisk, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  LOW:    { color: '#22c55e', bg: '#14532d22', icon: ShieldCheck, label: 'Low Echo-Chamber Risk' },
  MEDIUM: { color: '#eab308', bg: '#78350f22', icon: ShieldAlert, label: 'Medium Echo-Chamber Risk' },
  HIGH:   { color: '#ef4444', bg: '#7f1d1d22', icon: ShieldX,    label: 'High Echo-Chamber Risk' },
};

function ScoreBar({ score, color, label }: { score: number; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function IntegrityScores({ node }: Props) {
  const { completeness, diversity, echo } = useMemo(() => {
    const div = computeSourceDiversity(node.sources);
    const comp = computeResearchCompleteness(node, edges);
    const ech = computeEchoChamberRisk(node, edges, div);
    return { completeness: comp, diversity: div, echo: ech };
  }, [node]);

  const risk = RISK_CONFIG[echo.risk];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RiskIcon = risk.icon as any;

  const completenessColor = completeness.score >= 67 ? '#22c55e' : completeness.score >= 40 ? '#eab308' : '#ef4444';
  const diversityColor    = diversity.score   >= 50 ? '#22c55e' : diversity.score   >= 25 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col gap-3">
      {/* Echo-chamber risk badge */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
        style={{ background: risk.bg, borderColor: risk.color + '40' }}
      >
        <RiskIcon size={14} style={{ color: risk.color }} />
        <div className="flex-1">
          <p className="text-xs font-bold" style={{ color: risk.color }}>{risk.label}</p>
          {echo.riskScore > 0 && (
            <p className="text-[10px] text-slate-500 mt-0.5">
              {Object.entries(echo.factors)
                .filter(([, v]) => v)
                .map(([k]) => FACTOR_LABELS[k as keyof typeof echo.factors])
                .join(' · ')}
            </p>
          )}
        </div>
        <span className="text-xs font-black" style={{ color: risk.color }}>{echo.riskScore}/4</span>
      </div>

      {/* Debated topic label */}
      {(node.evidence_level === 'debated' || node.evidence_level === 'speculative') && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/10 border border-amber-500/20">
          <ShieldAlert size={12} className="text-amber-400 flex-shrink-0" />
          <p className="text-[10px] text-amber-400">This topic is actively debated. Verify claims independently.</p>
        </div>
      )}

      {/* Score bars */}
      <div className="p-3 rounded-xl bg-white/3 border border-purple-900/20 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 mb-1">
          <BookOpen size={11} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Research Balance</span>
        </div>

        <ScoreBar score={completeness.score} color={completenessColor} label="Completeness" />
        <ScoreBar score={diversity.score}    color={diversityColor}    label="Source Diversity" />

        {/* Missing factors */}
        {Object.entries(completeness.factors).some(([, v]) => !v) && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Missing</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(completeness.factors)
                .filter(([, v]) => !v)
                .map(([k]) => (
                  <span
                    key={k}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700"
                  >
                    {FACTOR_LABELS[k as keyof typeof completeness.factors]}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Source type breakdown */}
      {diversity.totalSources > 0 && (
        <div className="p-3 rounded-xl bg-white/3 border border-purple-900/20">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart2 size={11} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source Types</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(diversity.breakdown).map(([type, count]) => (
              <span
                key={type}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20"
              >
                {type} ×{count}
              </span>
            ))}
          </div>
          {diversity.isDominated && (
            <p className="text-[9px] text-amber-400/70 mt-1.5">
              ⚠ 90%+ from one source type — consider adding diverse sources.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const FACTOR_LABELS: Record<string, string> = {
  hasClaims:                    'Claims',
  hasCriticisms:                'Criticisms',
  hasMainstreamView:            'Mainstream View',
  hasSources:                   'Sources',
  hasOpenQuestions:             'Open Questions',
  hasContradictoryRelationships:'Contradictory Links',
  lowSourceDiversity:           'Low Source Diversity',
  missingCriticisms:            'No Criticisms',
  missingMainstreamView:        'No Mainstream View',
  noContradictoryRelationships: 'No Contradictory Links',
};
