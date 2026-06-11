'use client';
import { useState, useCallback } from 'react';
import {
  ClipboardList, Play, Loader2, ChevronDown, ChevronUp,
  Network, BookMarked, Clock, Globe2, BookOpen,
  ShieldAlert, Link2, Users, Zap, Compass, TrendingUp,
  Trophy, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── types ────────────────────────────────────────────────────────────────────

interface CROReport {
  generatedAt: string;
  durationMs:  number;
  part1:  Part1; part2:  Part2; part3:  Part3; part4:  Part4;
  part5:  Part5; part6:  Part6; part7:  Part7; part8:  Part8;
  part9:  Part9; part10: Part10; part11: Part11; part12: Part12;
}

interface ScoredPart   { score: number; findings: string[] }
interface Part1 extends ScoredPart {
  totalNodes: number; totalEdges: number; totalSources: number;
  graphDensity: number; orphanCount: number; deadEndCount: number;
  top20Strongest: { id: string; title: string; edgeCount: number }[];
  top20Weakest:   { id: string; title: string; edgeCount: number }[];
  top20StrongestEdges: { id: string; fromTitle: string; toTitle: string; confidence: number; type: string }[];
  top20WeakestEdges:   { id: string; fromTitle: string; toTitle: string; confidence: number; type: string }[];
}
interface Part2 extends ScoredPart {
  totalSources: number; avgCredibility: number;
  lowCredibilityCount: number; duplicateDois: number; nodesWithZeroSources: number;
  byType: Record<string,number>; byStatus: Record<string,number>;
  top20BestSourced:    { id: string; title: string; sourceCount: number }[];
  top20PoorestSourced: { id: string; title: string; sourceCount: number }[];
}
interface Part3 extends ScoredPart {
  withYear: number; withDateRange: number; withAnyDate: number;
  noDate: number; bceNodes: number; invalidDates: number;
  dateCoveragePct: number; totalNodes: number;
}
interface Part4 extends ScoredPart {
  withCoordinates: number; invalidCoordinates: number;
  duplicateCoordinates: number; noCoordinates: number;
  coordinateCoveragePct: number; totalNodes: number;
}
interface Part5 extends ScoredPart {
  withClaims: number; withCriticisms: number; withMainstream: number;
  claimsCoveragePct: number; criticismsCoveragePct: number; mainstreamCoveragePct: number;
  avgConfidence: number; totalNodes: number;
  byEvidenceLevel: Record<string,number>;
  top20MostComplete: { id: string; title: string; completenessScore: number }[];
  top20LeastComplete:{ id: string; title: string; completenessScore: number }[];
}
interface Part6 extends ScoredPart {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  sourceConcentrationPct: number; nodesWithoutCriticism: number;
  speculativeCount: number; confirmedCount: number; speculativePct: number;
}
interface Part7 extends ScoredPart {
  totalSimilarities: number; similaritiesAlsoHaveEdge: number;
  highSimilarityNoEdge: number; avgSimilarityScore: number;
  systemStatus: 'ADVISORY_ONLY';
}
interface Part8 {
  score: number; moderationScore: number; trustScore: number;
  totalUsers: number; activeUsers: number; bannedUsers: number;
  activeUsersPct: number; highRiskUsers: number;
  pendingNodes: number; pendingEdges: number;
  byRole: Record<string,number>; findings: string[];
}
interface Part9 extends ScoredPart {
  searchIndexPct: number; embeddingPct: number; adjCachePct: number;
  searchIndexedNodes: number; embeddingsCount: number; adjacencyCacheCount: number;
  currentNodes: number; bottlenecks: string[];
  scalabilityEstimate: { at1k: string; at5k: string; at10k: string };
}
interface Part10 extends ScoredPart {
  totalGalaxies: number; totalClusters: number;
  emptyClusters: number; thinClusters: number; emptyGalaxies: number;
  avgNodesPerCluster: number;
  top20BiggestClusters:  { id: string; name: string; nodeCount: number }[];
  top20SmallestClusters: { id: string; name: string; nodeCount: number }[];
  byGalaxy: { id: string; name: string; nodeCount: number }[];
}
interface Part11 {
  underdevelopedClusters: { id: string; name: string; nodeCount: number }[];
  missingGapAreas: string[];
  growthOpportunities: string[];
  weakEvidencePct: number;
  findings: string[];
}
interface Part12 {
  overallScore: number; grade: string;
  scores: Record<string,number>;
  top20Strengths:           string[];
  top20Weaknesses:          string[];
  top20Fixes:               string[];
  top20GrowthOpportunities: string[];
  top20CredibilityRisks:    string[];
  executiveSummary: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return '#22c55e';
  if (s >= 60) return '#eab308';
  if (s >= 40) return '#f97316';
  return '#ef4444';
}

function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const c = scoreColor(score);
  const cls = size === 'lg'
    ? 'text-3xl font-black w-16 h-16'
    : size === 'sm'
    ? 'text-xs font-bold w-9 h-9'
    : 'text-base font-bold w-11 h-11';
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ background: c + '18', border: `2px solid ${c}`, color: c }}
    >
      {score}
    </div>
  );
}

function RiskBadge({ risk }: { risk: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const map = {
    LOW:    'bg-green-900/30 text-green-300 border-green-700/40',
    MEDIUM: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40',
    HIGH:   'bg-red-900/30 text-red-300 border-red-700/40',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${map[risk]}`}>{risk}</span>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  );
}

function FindingsList({ findings }: { findings: string[] }) {
  return (
    <ul className="space-y-1">
      {findings.map((f, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
          <span className="text-slate-600 flex-shrink-0 mt-0.5">•</span>
          {f}
        </li>
      ))}
    </ul>
  );
}

function Top20Table({ rows, columns }: {
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; format?: (v: unknown) => string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className="text-left text-slate-500 font-medium pb-1 pr-3">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-white/5">
              {columns.map(c => (
                <td key={c.key} className="py-1 pr-3 text-slate-300">
                  {c.format ? c.format(row[c.key]) : String(row[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, icon, score, riskBadge, open, onToggle, children,
}: {
  title: string;
  icon: React.ReactNode;
  score?: number;
  riskBadge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const c = score !== undefined ? scoreColor(score) : '#7c3aed';
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: c + '30' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-shrink-0 text-slate-400">{icon}</div>
        <span className="flex-1 text-sm font-semibold text-white">{title}</span>
        {riskBadge}
        {score !== undefined && <ScoreBadge score={score} size="sm" />}
        <div className="text-slate-600 flex-shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CROAuditDashboard() {
  const [report, setReport]   = useState<CROReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [open, setOpen]       = useState<Record<string, boolean>>({ part12: true });

  const toggle = useCallback((k: string) => {
    setOpen(prev => ({ ...prev, [k]: !prev[k] }));
  }, []);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/cro-audit');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CROReport = await res.json();
      setReport(data);
      setOpen({ part12: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={16} className="text-purple-400" />
            <h2 className="text-base font-bold text-white">Chief Research Officer Audit</h2>
          </div>
          <p className="text-xs text-slate-500">
            Read-only 12-part audit of the entire Nexus Archive.
            No data is modified. Generates recommendations only.
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {loading ? 'Running audit…' : report ? 'Re-run Audit' : 'Run Full Audit'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
          Audit failed: {error}
        </p>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 size={32} className="animate-spin text-purple-400" />
          <p className="text-sm text-slate-400">Running 12-part audit — this may take up to 30 seconds…</p>
        </div>
      )}

      {!loading && report && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-600">
            Generated {new Date(report.generatedAt).toLocaleString()} · {report.durationMs}ms
          </p>

          {/* ── PART 12: Final Report (shown first, expanded) ─────────────── */}
          <Section
            title="Final Report — Overall Score"
            icon={<Trophy size={14} />}
            score={report.part12.overallScore}
            open={!!open['part12']}
            onToggle={() => toggle('part12')}
          >
            <div className="flex items-center gap-6 pt-2 flex-wrap">
              <ScoreBadge score={report.part12.overallScore} size="lg" />
              <div>
                <p className="text-2xl font-black text-white">Grade: {report.part12.grade}</p>
                <p className="text-xs text-slate-500 mt-0.5">out of 100 — average of 10 scored parts</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-white/5 rounded-lg p-3 leading-relaxed">
              {report.part12.executiveSummary}
            </p>

            {/* Score breakdown */}
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Score Breakdown</p>
              <div className="grid grid-cols-2 gap-x-6">
                {Object.entries(report.part12.scores).map(([label, score]) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs font-bold" style={{ color: scoreColor(score) }}>{score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Strengths
                </p>
                <ul className="space-y-1">
                  {report.part12.top20Strengths.map((s,i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-green-700 flex-shrink-0">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                  <XCircle size={11} /> Weaknesses
                </p>
                <ul className="space-y-1">
                  {report.part12.top20Weaknesses.map((s,i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-red-700 flex-shrink-0">✗</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
                  <AlertTriangle size={11} /> Priority Fixes
                </p>
                <ol className="space-y-1">
                  {report.part12.top20Fixes.map((s,i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-blue-700 flex-shrink-0 font-mono">{i+1}.</span>{s}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1">
                  <AlertTriangle size={11} /> Credibility Risks
                </p>
                <ul className="space-y-1">
                  {report.part12.top20CredibilityRisks.map((s,i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-orange-700 flex-shrink-0">⚠</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                <TrendingUp size={11} /> Growth Opportunities
              </p>
              <ol className="space-y-1 columns-1 sm:columns-2">
                {report.part12.top20GrowthOpportunities.map((s,i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5 break-inside-avoid">
                    <span className="text-purple-700 flex-shrink-0 font-mono">{i+1}.</span>{s}
                  </li>
                ))}
              </ol>
            </div>
          </Section>

          {/* ── PART 1: Knowledge Graph ─────────────────────────────────────── */}
          <Section title="Part 1 — Knowledge Graph" icon={<Network size={14} />}
            score={report.part1.score} open={!!open['p1']} onToggle={() => toggle('p1')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Total Nodes"  value={report.part1.totalNodes.toLocaleString()} />
              <StatRow label="Total Edges"  value={report.part1.totalEdges.toLocaleString()} />
              <StatRow label="Total Sources" value={report.part1.totalSources.toLocaleString()} />
              <StatRow label="Orphan Nodes"  value={report.part1.orphanCount} />
              <StatRow label="Dead-end Nodes" value={report.part1.deadEndCount} />
              <StatRow label="Graph Density %" value={`${report.part1.graphDensity}%`} />
            </div>
            <FindingsList findings={report.part1.findings} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Most Connected Nodes</p>
                <Top20Table rows={report.part1.top20Strongest as unknown as Record<string,unknown>[]}
                  columns={[{ key: 'title', label: 'Node' }, { key: 'edgeCount', label: 'Edges' }]} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Least Connected Nodes</p>
                <Top20Table rows={report.part1.top20Weakest as unknown as Record<string,unknown>[]}
                  columns={[{ key: 'title', label: 'Node' }, { key: 'edgeCount', label: 'Edges' }]} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Strongest Relationships</p>
                <Top20Table rows={report.part1.top20StrongestEdges as unknown as Record<string,unknown>[]}
                  columns={[
                    { key: 'fromTitle', label: 'From' }, { key: 'toTitle', label: 'To' },
                    { key: 'confidence', label: 'Conf', format: v => Number(v).toFixed(2) },
                  ]} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Weakest Relationships</p>
                <Top20Table rows={report.part1.top20WeakestEdges as unknown as Record<string,unknown>[]}
                  columns={[
                    { key: 'fromTitle', label: 'From' }, { key: 'toTitle', label: 'To' },
                    { key: 'confidence', label: 'Conf', format: v => Number(v).toFixed(2) },
                  ]} />
              </div>
            </div>
          </Section>

          {/* ── PART 2: Source Quality ──────────────────────────────────────── */}
          <Section title="Part 2 — Source Quality" icon={<BookMarked size={14} />}
            score={report.part2.score} open={!!open['p2']} onToggle={() => toggle('p2')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Total Sources"      value={report.part2.totalSources.toLocaleString()} />
              <StatRow label="Avg Credibility"    value={report.part2.avgCredibility.toFixed(2)} />
              <StatRow label="Low Cred. (< 0.3)"  value={report.part2.lowCredibilityCount} />
              <StatRow label="Duplicate DOIs"     value={report.part2.duplicateDois} />
              <StatRow label="Nodes w/ 0 Sources" value={report.part2.nodesWithZeroSources} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1">By Type</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.part2.byType).map(([t, cnt]) => (
                  <span key={t} className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400">
                    {t}: {cnt}
                  </span>
                ))}
              </div>
            </div>
            <FindingsList findings={report.part2.findings} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Best Sourced Nodes</p>
                <Top20Table rows={report.part2.top20BestSourced as unknown as Record<string,unknown>[]}
                  columns={[{ key: 'title', label: 'Node' }, { key: 'sourceCount', label: 'Sources' }]} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Poorest Sourced Nodes</p>
                <Top20Table rows={report.part2.top20PoorestSourced as unknown as Record<string,unknown>[]}
                  columns={[{ key: 'title', label: 'Node' }, { key: 'sourceCount', label: 'Sources' }]} />
              </div>
            </div>
          </Section>

          {/* ── PART 3: Timeline ────────────────────────────────────────────── */}
          <Section title="Part 3 — Timeline Coverage" icon={<Clock size={14} />}
            score={report.part3.score} open={!!open['p3']} onToggle={() => toggle('p3')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Date Coverage" value={`${report.part3.dateCoveragePct}%`} />
              <StatRow label="With Year"     value={report.part3.withYear.toLocaleString()} />
              <StatRow label="With Date Range" value={report.part3.withDateRange.toLocaleString()} />
              <StatRow label="No Date"       value={report.part3.noDate.toLocaleString()} />
              <StatRow label="BCE Nodes"     value={report.part3.bceNodes.toLocaleString()} />
              <StatRow label="Invalid Dates" value={report.part3.invalidDates} />
            </div>
            <FindingsList findings={report.part3.findings} />
          </Section>

          {/* ── PART 4: Globe ───────────────────────────────────────────────── */}
          <Section title="Part 4 — Globe & Geography" icon={<Globe2 size={14} />}
            score={report.part4.score} open={!!open['p4']} onToggle={() => toggle('p4')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Coord Coverage"   value={`${report.part4.coordinateCoveragePct}%`} />
              <StatRow label="With Coordinates" value={report.part4.withCoordinates.toLocaleString()} />
              <StatRow label="No Coordinates"   value={report.part4.noCoordinates.toLocaleString()} />
              <StatRow label="Invalid Coords"   value={report.part4.invalidCoordinates} />
              <StatRow label="Duplicate Coords" value={report.part4.duplicateCoordinates} />
            </div>
            <FindingsList findings={report.part4.findings} />
          </Section>

          {/* ── PART 5: Research Completeness ───────────────────────────────── */}
          <Section title="Part 5 — Research Completeness" icon={<BookOpen size={14} />}
            score={report.part5.score} open={!!open['p5']} onToggle={() => toggle('p5')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Claims Coverage"    value={`${report.part5.claimsCoveragePct}%`} />
              <StatRow label="Criticism Coverage" value={`${report.part5.criticismsCoveragePct}%`} />
              <StatRow label="Mainstream Coverage" value={`${report.part5.mainstreamCoveragePct}%`} />
              <StatRow label="Avg Confidence"     value={report.part5.avgConfidence.toFixed(3)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1">Evidence Level Distribution</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.part5.byEvidenceLevel).map(([lvl, cnt]) => (
                  <span key={lvl} className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 capitalize">
                    {lvl}: {cnt}
                  </span>
                ))}
              </div>
            </div>
            <FindingsList findings={report.part5.findings} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Most Complete Nodes</p>
                <Top20Table rows={report.part5.top20MostComplete as unknown as Record<string,unknown>[]}
                  columns={[
                    { key: 'title', label: 'Node' },
                    { key: 'completenessScore', label: 'Score', format: v => `${v}%` },
                  ]} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Least Complete Nodes</p>
                <Top20Table rows={report.part5.top20LeastComplete as unknown as Record<string,unknown>[]}
                  columns={[
                    { key: 'title', label: 'Node' },
                    { key: 'completenessScore', label: 'Score', format: v => `${v}%` },
                  ]} />
              </div>
            </div>
          </Section>

          {/* ── PART 6: Echo Chamber ────────────────────────────────────────── */}
          <Section title="Part 6 — Echo Chamber Audit" icon={<ShieldAlert size={14} />}
            score={report.part6.score}
            riskBadge={<RiskBadge risk={report.part6.riskLevel} />}
            open={!!open['p6']} onToggle={() => toggle('p6')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Source Concentration" value={`${report.part6.sourceConcentrationPct}%`} />
              <StatRow label="No Criticism"  value={report.part6.nodesWithoutCriticism.toLocaleString()} />
              <StatRow label="Speculative %"  value={`${report.part6.speculativePct}%`} />
              <StatRow label="Confirmed Count" value={report.part6.confirmedCount.toLocaleString()} />
              <StatRow label="Risk Level"     value={<RiskBadge risk={report.part6.riskLevel} />} />
            </div>
            <FindingsList findings={report.part6.findings} />
          </Section>

          {/* ── PART 7: Similarity System ────────────────────────────────────── */}
          <Section title="Part 7 — Similarity System Audit" icon={<Link2 size={14} />}
            score={report.part7.score} open={!!open['p7']} onToggle={() => toggle('p7')}>
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="text-green-400" />
                <span className="text-xs font-semibold text-green-400">
                  System Status: {report.part7.systemStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6">
                <StatRow label="Total Similarities" value={report.part7.totalSimilarities.toLocaleString()} />
                <StatRow label="Also Have Edge"     value={report.part7.similaritiesAlsoHaveEdge.toLocaleString()} />
                <StatRow label="High Sim No Edge"   value={report.part7.highSimilarityNoEdge.toLocaleString()} />
                <StatRow label="Avg Similarity"     value={report.part7.avgSimilarityScore.toFixed(3)} />
              </div>
            </div>
            <FindingsList findings={report.part7.findings} />
          </Section>

          {/* ── PART 8: User & Moderation ───────────────────────────────────── */}
          <Section title="Part 8 — Users & Moderation" icon={<Users size={14} />}
            score={report.part8.score} open={!!open['p8']} onToggle={() => toggle('p8')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Moderation Score" value={<span style={{ color: scoreColor(report.part8.moderationScore) }}>{report.part8.moderationScore}</span>} />
              <StatRow label="Trust Score"   value={<span style={{ color: scoreColor(report.part8.trustScore) }}>{report.part8.trustScore}</span>} />
              <StatRow label="Total Users"   value={report.part8.totalUsers.toLocaleString()} />
              <StatRow label="Active (30d)"  value={`${report.part8.activeUsers} (${report.part8.activeUsersPct}%)`} />
              <StatRow label="Banned"        value={report.part8.bannedUsers} />
              <StatRow label="High Risk"     value={report.part8.highRiskUsers} />
              <StatRow label="Pending Nodes" value={report.part8.pendingNodes} />
              <StatRow label="Pending Edges" value={report.part8.pendingEdges} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1">Users by Role</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.part8.byRole).map(([role, cnt]) => (
                  <span key={role} className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400">
                    {role}: {cnt}
                  </span>
                ))}
              </div>
            </div>
            <FindingsList findings={report.part8.findings} />
          </Section>

          {/* ── PART 9: Performance ─────────────────────────────────────────── */}
          <Section title="Part 9 — Performance & Scalability" icon={<Zap size={14} />}
            score={report.part9.score} open={!!open['p9']} onToggle={() => toggle('p9')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Search Index" value={`${report.part9.searchIndexPct}% (${report.part9.searchIndexedNodes})`} />
              <StatRow label="Embeddings"   value={`${report.part9.embeddingPct}% (${report.part9.embeddingsCount})`} />
              <StatRow label="Adj. Cache"   value={`${report.part9.adjCachePct}% (${report.part9.adjacencyCacheCount})`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Scalability Estimates</p>
              <div className="space-y-1">
                {Object.entries(report.part9.scalabilityEstimate).map(([k, v]) => (
                  <div key={k} className="flex gap-3 text-xs">
                    <span className="text-slate-500 flex-shrink-0 w-12">{k.replace('at', 'At ')}</span>
                    <span className="text-slate-400">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <FindingsList findings={report.part9.findings} />
          </Section>

          {/* ── PART 10: Universe Navigation ────────────────────────────────── */}
          <Section title="Part 10 — Universe Navigation" icon={<Compass size={14} />}
            score={report.part10.score} open={!!open['p10']} onToggle={() => toggle('p10')}>
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <StatRow label="Galaxies"          value={report.part10.totalGalaxies} />
              <StatRow label="Clusters"          value={report.part10.totalClusters} />
              <StatRow label="Avg Nodes/Cluster" value={report.part10.avgNodesPerCluster} />
              <StatRow label="Empty Clusters"    value={report.part10.emptyClusters} />
              <StatRow label="Thin Clusters (<5)"value={report.part10.thinClusters} />
              <StatRow label="Empty Galaxies"    value={report.part10.emptyGalaxies} />
            </div>
            <FindingsList findings={report.part10.findings} />
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Nodes by Galaxy</p>
              <div className="space-y-1">
                {report.part10.byGalaxy.map(g => (
                  <div key={g.id} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 flex-1 truncate">{g.name}</span>
                    <span className="text-slate-500">{g.nodeCount} nodes</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Biggest Clusters</p>
                <Top20Table rows={report.part10.top20BiggestClusters as unknown as Record<string,unknown>[]}
                  columns={[{ key: 'name', label: 'Cluster' }, { key: 'nodeCount', label: 'Nodes' }]} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top 20 Smallest Clusters</p>
                <Top20Table rows={report.part10.top20SmallestClusters as unknown as Record<string,unknown>[]}
                  columns={[{ key: 'name', label: 'Cluster' }, { key: 'nodeCount', label: 'Nodes' }]} />
              </div>
            </div>
          </Section>

          {/* ── PART 11: Strategic Growth ────────────────────────────────────── */}
          <Section title="Part 11 — Strategic Growth" icon={<TrendingUp size={14} />}
            open={!!open['p11']} onToggle={() => toggle('p11')}>
            <div className="pt-2">
              <StatRow label="Weak/Speculative Evidence" value={`${report.part11.weakEvidencePct}%`} />
            </div>
            <FindingsList findings={report.part11.findings.length > 0 ? report.part11.findings : ['No critical growth gaps detected']} />
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Underdeveloped Clusters ({"<"}10 nodes)</p>
              <Top20Table rows={report.part11.underdevelopedClusters as unknown as Record<string,unknown>[]}
                columns={[{ key: 'name', label: 'Cluster' }, { key: 'nodeCount', label: 'Nodes' }]} />
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-400 mb-2">Growth Opportunities</p>
              <ol className="space-y-1">
                {report.part11.growthOpportunities.map((s,i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-purple-700 flex-shrink-0 font-mono">{i+1}.</span>{s}
                  </li>
                ))}
              </ol>
            </div>
          </Section>
        </div>
      )}

      {!loading && !report && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ClipboardList size={36} className="text-slate-700" />
          <p className="text-sm font-semibold text-slate-400">No audit data yet</p>
          <p className="text-xs text-slate-600 max-w-xs">
            Click "Run Full Audit" to generate a comprehensive 12-part analysis of the entire archive.
            Read-only — no data will be modified.
          </p>
        </div>
      )}
    </div>
  );
}
