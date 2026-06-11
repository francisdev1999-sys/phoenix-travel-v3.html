'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, ShieldX, RefreshCw, BookOpen, BarChart2, AlertTriangle } from 'lucide-react';
import type { ArchiveAuditResult } from '@/lib/integrity/archive-audit';
import type { EchoChamberRisk } from '@/lib/integrity/scores';

const RISK_CONFIG: Record<EchoChamberRisk, { color: string; bg: string; icon: React.ElementType }> = {
  LOW:    { color: '#22c55e', bg: '#14532d22', icon: ShieldCheck },
  MEDIUM: { color: '#eab308', bg: '#78350f22', icon: ShieldAlert },
  HIGH:   { color: '#ef4444', bg: '#7f1d1d22', icon: ShieldX },
};

function CoverageBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function coverageColor(pct: number) {
  return pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';
}

export default function ArchiveBiasAudit() {
  const [audit, setAudit] = useState<ArchiveAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrity/archive-audit');
      if (!res.ok) throw new Error(`${res.status}`);
      setAudit(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <ShieldAlert size={32} className="text-purple-400" />
        <p className="text-sm font-bold text-white">Archive Bias Audit</p>
        <p className="text-xs text-slate-400 text-center max-w-xs">
          Measures echo-chamber risk, source diversity, and research balance across all archive nodes.
        </p>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <BarChart2 size={14} />}
          {loading ? 'Running audit…' : 'Run Archive Audit'}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  const risk = RISK_CONFIG[audit.archiveEchoChamberRisk];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RiskIcon = risk.icon as any;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">Archive Bias Audit</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Generated {new Date(audit.generatedAt).toLocaleString()} · {audit.totalNodes} nodes analysed
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Archive risk score */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl border"
        style={{ background: risk.bg, borderColor: risk.color + '50' }}
      >
        <RiskIcon size={22} style={{ color: risk.color }} />
        <div>
          <p className="text-sm font-bold" style={{ color: risk.color }}>
            Archive Echo-Chamber Risk: {audit.archiveEchoChamberRisk}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {audit.echoChamberDistribution.HIGH} high-risk · {audit.echoChamberDistribution.MEDIUM} medium-risk · {audit.echoChamberDistribution.LOW} low-risk nodes
          </p>
        </div>
      </div>

      {/* Coverage breakdown */}
      <div className="p-4 rounded-xl bg-white/3 border border-purple-900/20 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={12} className="text-slate-500" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Balance Coverage</p>
        </div>
        <CoverageBar label="Nodes with criticisms"            value={audit.coveragePercent.criticisms}         color={coverageColor(audit.coveragePercent.criticisms)} />
        <CoverageBar label="Nodes with mainstream view"       value={audit.coveragePercent.mainstreamView}     color={coverageColor(audit.coveragePercent.mainstreamView)} />
        <CoverageBar label="Nodes with sources"               value={audit.coveragePercent.sources}            color={coverageColor(audit.coveragePercent.sources)} />
        <CoverageBar label="Nodes with contradictory edges"   value={audit.coveragePercent.contradictoryEdges} color={coverageColor(audit.coveragePercent.contradictoryEdges)} />
      </div>

      {/* Completeness distribution */}
      <div className="p-4 rounded-xl bg-white/3 border border-purple-900/20">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Completeness Distribution</p>
        <div className="flex gap-3">
          {[
            { label: 'High', value: audit.completenessDistribution.high,   color: '#22c55e' },
            { label: 'Medium', value: audit.completenessDistribution.medium, color: '#eab308' },
            { label: 'Low',    value: audit.completenessDistribution.low,    color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-900/40 border border-white/5">
              <span className="text-lg font-black" style={{ color }}>{value}</span>
              <span className="text-[9px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-2">Average completeness: {audit.avgCompletenessScore}%</p>
      </div>

      {/* Source type coverage */}
      <div className="p-4 rounded-xl bg-white/3 border border-purple-900/20">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Source Type Coverage</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(audit.sourceTypeCoverage).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <span
              key={type}
              className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-500/20"
            >
              {type} ×{count}
            </span>
          ))}
        </div>
        {Object.keys(audit.sourceTypeCoverage).length === 0 && (
          <p className="text-xs text-slate-600 italic">No sources catalogued in static nodes.</p>
        )}
      </div>

      {/* High-risk nodes */}
      {audit.highRiskNodes.length > 0 && (
        <div className="p-4 rounded-xl bg-red-900/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={12} className="text-red-400" />
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              Nodes Needing Attention ({audit.highRiskNodes.length})
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {audit.highRiskNodes.slice(0, 15).map(n => (
              <div key={n.id} className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg bg-white/3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{n.title}</p>
                  <p className="text-[9px] text-slate-500">{n.missingFactors.join(' · ')}</p>
                </div>
                <span
                  className="text-[10px] font-bold flex-shrink-0"
                  style={{ color: n.riskScore >= 3 ? '#ef4444' : '#eab308' }}
                >
                  {n.riskScore}/4
                </span>
              </div>
            ))}
            {audit.highRiskNodes.length > 15 && (
              <p className="text-[10px] text-slate-500 text-center">
                +{audit.highRiskNodes.length - 15} more nodes
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
