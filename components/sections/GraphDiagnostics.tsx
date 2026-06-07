'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, GitBranch, Activity, Layers, Search, BarChart3 } from 'lucide-react';
import { runDiagnostics, EVIDENCE_COLORS, CATEGORY_COLORS, GraphDiagnostics as DiagType } from '@/lib/graph';
import EvidenceBadge from '@/components/research/EvidenceBadge';
import ConfidenceMeter from '@/components/research/ConfidenceMeter';

type Tab = 'health' | 'orphans' | 'ghosts' | 'low-confidence' | 'clusters';

export default function GraphDiagnostics() {
  const diag: DiagType = useMemo(() => runDiagnostics(), []);
  const [activeTab, setActiveTab] = useState<Tab>('health');

  const healthScore = Math.round(
    (1 - (diag.orphan_nodes.length / Math.max(1, diag.node_count))) * 40 +
    (1 - (diag.ghost_node_ids.length / Math.max(1, diag.node_count))) * 30 +
    (1 - (diag.low_confidence_edges.length / Math.max(1, diag.edge_count))) * 30
  );

  const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#eab308' : '#ef4444';

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'health', label: 'Health', icon: Activity },
    { id: 'orphans', label: 'Orphans', icon: Search, count: diag.orphan_nodes.length },
    { id: 'ghosts', label: 'Ghosts', icon: AlertTriangle, count: diag.ghost_node_ids.length },
    { id: 'low-confidence', label: 'Low Confidence', icon: BarChart3, count: diag.low_confidence_edges.length },
    { id: 'clusters', label: 'Clusters', icon: Layers },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-b border-purple-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-500/30 flex items-center justify-center">
            <Activity size={18} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Graph Diagnostics</h2>
            <p className="text-xs text-slate-500 mt-0.5">Admin-only — knowledge graph quality tools</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-purple-900/20">
        <div className="flex overflow-x-auto scrollbar-hide px-2 pt-2 gap-0.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-purple-300 border-purple-500 bg-purple-900/20'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {/* @ts-expect-error lucide size */}
                <Icon size={10} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1 py-0.5 rounded-full text-[9px] font-bold bg-red-900/50 text-red-400">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

        {activeTab === 'health' && (
          <>
            {/* Overall health score */}
            <div className="rounded-2xl p-5 border relative overflow-hidden"
              style={{ background: healthColor + '10', borderColor: healthColor + '30' }}>
              <div className="text-xs text-slate-500 tracking-widest uppercase mb-1">Graph Health Score</div>
              <div className="text-4xl font-black" style={{ color: healthColor }}>{healthScore}/100</div>
              <div className="mt-3 h-2 rounded-full bg-slate-900 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healthScore}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: healthColor }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Nodes', value: diag.node_count, icon: '◈', color: '#7c3aed' },
                { label: 'Total Edges', value: diag.edge_count, icon: '—', color: '#06b6d4' },
                { label: 'Avg Degree', value: diag.avg_degree, icon: '⋈', color: '#22c55e' },
                { label: 'Avg Confidence', value: `${Math.round(diag.avg_confidence * 100)}%`, icon: '⚖', color: '#eab308' },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-4">
                  <div className="text-slate-500 text-xs mb-1">{s.label}</div>
                  <div className="text-2xl font-black text-white">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Research score distribution */}
            <div className="glass rounded-xl p-4">
              <div className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <BarChart3 size={14} className="text-purple-400" /> Research Score Distribution
              </div>
              {[
                { label: 'High (67–100)', count: diag.research_score_distribution.high, color: '#22c55e' },
                { label: 'Medium (34–66)', count: diag.research_score_distribution.medium, color: '#eab308' },
                { label: 'Low (0–33)', count: diag.research_score_distribution.low, color: '#ef4444' },
              ].map(b => (
                <div key={b.label} className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{b.label}</span>
                    <span style={{ color: b.color }}>{b.count} nodes</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(b.count / diag.node_count) * 100}%`, background: b.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Issues summary */}
            <div className="glass rounded-xl p-4">
              <div className="text-sm font-bold text-white mb-3">Issues Summary</div>
              {[
                { label: 'Duplicate Node IDs', count: diag.duplicate_ids.length, ok: diag.duplicate_ids.length === 0 },
                { label: 'Ghost Node References', count: diag.ghost_node_ids.length, ok: diag.ghost_node_ids.length === 0 },
                { label: 'Orphan Nodes (degree < 2)', count: diag.orphan_nodes.length, ok: diag.orphan_nodes.length === 0 },
                { label: 'Low-Confidence Edges (< 40%)', count: diag.low_confidence_edges.length, ok: diag.low_confidence_edges.length === 0 },
              ].map(issue => (
                <div key={issue.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {issue.ok
                      ? <CheckCircle size={12} className="text-green-500" />
                      : <AlertTriangle size={12} className="text-amber-400" />
                    }
                    {issue.label}
                  </div>
                  <span className={`text-xs font-bold ${issue.ok ? 'text-green-400' : 'text-amber-400'}`}>
                    {issue.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'orphans' && (
          <>
            <p className="text-xs text-slate-500">
              Nodes with fewer than 2 connections — potential isolation from the main graph.
            </p>
            {diag.orphan_nodes.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-900/10 border border-green-500/20 text-green-400 text-sm">
                <CheckCircle size={14} /> No orphan nodes detected.
              </div>
            ) : (
              <div className="space-y-2">
                {diag.orphan_nodes.map(n => (
                  <div key={n.id} className="p-3 rounded-lg bg-slate-900/40 border border-amber-500/20 flex items-start gap-3">
                    <span className="text-lg">{n.icon ?? '◈'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">{n.title}</div>
                      <div className="text-xs text-slate-500">{n.category}</div>
                      <EvidenceBadge level={n.evidence_level} size="sm" />
                    </div>
                    <span className="text-xs text-amber-400 font-bold flex-shrink-0">
                      {/* degree handled in index.ts */}
                      Low degree
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'ghosts' && (
          <>
            <p className="text-xs text-slate-500">
              Node IDs referenced by edges that do not exist in the node list.
            </p>
            {diag.ghost_node_ids.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-900/10 border border-green-500/20 text-green-400 text-sm">
                <CheckCircle size={14} /> No ghost references detected.
              </div>
            ) : (
              <div className="space-y-2">
                {diag.ghost_node_ids.map(id => (
                  <div key={id} className="p-3 rounded-lg bg-red-900/10 border border-red-500/20 flex items-center gap-3">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-mono text-red-300">{id}</div>
                      <div className="text-xs text-slate-600">Referenced in edges but no matching node exists</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'low-confidence' && (
          <>
            <p className="text-xs text-slate-500">
              Edges with confidence score below 40% — connections that may need stronger evidence.
            </p>
            {diag.low_confidence_edges.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-900/10 border border-green-500/20 text-green-400 text-sm">
                <CheckCircle size={14} /> No low-confidence edges detected.
              </div>
            ) : (
              <div className="space-y-3">
                {diag.low_confidence_edges.map(edge => (
                  <div key={edge.id} className="p-3 rounded-lg bg-slate-900/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-slate-500">{edge.id}</div>
                      <span className="text-xs font-bold text-red-400">
                        {Math.round(edge.confidence_score * 100)}% confidence
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      {edge.from} → {edge.to}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">{edge.relationship_type} · {edge.source_type.replace('_', ' ')}</div>
                    <ConfidenceMeter score={edge.confidence_score} />
                    <p className="text-xs text-slate-600 leading-relaxed">{edge.explanation.slice(0, 120)}…</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'clusters' && (
          <>
            <p className="text-xs text-slate-500">
              Internal connectivity analysis by category. Density = internal edges / possible internal edges.
            </p>
            <div className="space-y-3">
              {diag.cluster_report.map(cluster => {
                const catColor = CATEGORY_COLORS[cluster.category] ?? '#7c3aed';
                return (
                  <div key={cluster.category} className="rounded-lg border border-white/5 bg-slate-900/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ color: catColor, background: catColor + '20' }}
                      >
                        {cluster.category}
                      </div>
                      <div className="text-xs text-slate-500">
                        {cluster.node_count} nodes · {cluster.internal_edges} edges
                      </div>
                    </div>
                    <ConfidenceMeter
                      score={cluster.density}
                      label={`Density (${Math.round(cluster.density * 100)}%)`}
                      showValue={false}
                    />
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Avg confidence: {Math.round(cluster.avg_confidence * 100)}%</span>
                      {cluster.internal_edges === 0 && (
                        <span className="text-amber-400">⚠ Isolated cluster</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
