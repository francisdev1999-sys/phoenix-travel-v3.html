'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, BarChart3, CheckCircle, Loader2, RefreshCw, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import type { SimilarityAuditResult } from '@/lib/similarity/retroactive';
import type { ContradictionPair } from '@/lib/similarity/engine';

const SEV_COLOR: Record<ContradictionPair['severity'], string> = {
  minor:       '#64748b',
  moderate:    '#f59e0b',
  significant: '#ef4444',
};

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-purple-900/20 text-center">
      <p className="text-xl font-black text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

interface RebuildStatus {
  status:        'idle' | 'running' | 'complete' | 'failed';
  totalNodes?:   number;
  totalPairs?:   number;
  upsertedPairs?:number;
  message?:      string;
}

export default function SimilarityAudit() {
  const [audit, setAudit]         = useState<SimilarityAuditResult | null>(null);
  const [loading, setLoading]     = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<RebuildStatus | null>(null);

  const loadAudit = () => {
    setLoading(true);
    fetch('/api/admin/similarity/audit')
      .then(r => r.json())
      .then((d: SimilarityAuditResult) => setAudit(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadRebuildStatus = () => {
    fetch('/api/admin/similarity/rebuild')
      .then(r => r.json())
      .then((d: { rebuildStatus: RebuildStatus }) => setRebuildStatus(d.rebuildStatus))
      .catch(() => {});
  };

  useEffect(() => {
    loadAudit();
    loadRebuildStatus();
  }, []);

  const triggerRebuild = () => {
    setRebuilding(true);
    fetch('/api/admin/similarity/rebuild', { method: 'POST' })
      .then(r => r.json())
      .then((d: { rebuildStatus?: RebuildStatus }) => {
        if (d.rebuildStatus) setRebuildStatus(d.rebuildStatus);
      })
      .catch(console.error)
      .finally(() => setRebuilding(false));
  };

  if (loading) return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="animate-spin text-purple-400" size={20} />
    </div>
  );

  if (!audit) return <p className="text-xs text-red-400">Failed to load audit.</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-400" /> Similarity Engine Audit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Advisory analysis only — no graph edges are created from similarity data.
          </p>
        </div>
        <button
          onClick={triggerRebuild}
          disabled={rebuilding || rebuildStatus?.status === 'running'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-50 transition-all"
        >
          <RefreshCw size={11} className={(rebuilding || rebuildStatus?.status === 'running') ? 'animate-spin' : ''} />
          {rebuilding || rebuildStatus?.status === 'running' ? 'Rebuilding…' : 'Rebuild Cache'}
        </button>
      </div>

      {/* Rebuild status banner */}
      {rebuildStatus && (
        <div className={`p-3 rounded-xl border text-[10px] flex items-center gap-2
          ${rebuildStatus.status === 'complete' ? 'border-green-500/20 bg-green-900/5 text-green-400' :
            rebuildStatus.status === 'running'  ? 'border-purple-500/20 bg-purple-900/5 text-purple-400' :
            rebuildStatus.status === 'failed'   ? 'border-red-500/20 bg-red-900/5 text-red-400' :
            'border-slate-700/30 bg-white/2 text-slate-500'}`}>
          {rebuildStatus.status === 'complete' && <CheckCircle size={11} />}
          {rebuildStatus.status === 'running'  && <Loader2 size={11} className="animate-spin" />}
          {rebuildStatus.status === 'failed'   && <AlertTriangle size={11} />}
          <span className="font-bold capitalize">{rebuildStatus.status}</span>
          {rebuildStatus.upsertedPairs != null && rebuildStatus.totalPairs != null && (
            <span className="text-slate-400">
              — {rebuildStatus.upsertedPairs.toLocaleString()} / {rebuildStatus.totalPairs.toLocaleString()} pairs
            </span>
          )}
          {rebuildStatus.message && <span className="text-slate-500">{rebuildStatus.message}</span>}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Nodes" value={audit.node_count} />
        <Stat label="Graph Edges" value={audit.edge_count} />
        <Stat label="Computed Pairs" value={audit.computed_pairs} />
        <Stat label="Cache Coverage" value={`${audit.coverage_pct}%`} sub="of all possible pairs" />
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-xl border border-red-500/20 bg-red-900/5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs font-bold text-red-400">Research Integrity Notice</p>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">{audit.disclaimer}</p>
      </div>

      {/* Relationship inflation risk */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-900/5">
        <p className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-2">
          <AlertTriangle size={12} /> Relationship Inflation Risk
        </p>
        <p className="text-[10px] text-slate-400 mb-2">{audit.relationship_inflation_risk.description}</p>
        <div className="flex gap-4 text-[10px]">
          <span className="text-amber-400">High-sim pairs with no edge: <span className="font-bold">{audit.relationship_inflation_risk.high_sim_no_edge}</span></span>
        </div>
      </div>

      {/* Echo chamber clusters */}
      {audit.echo_chamber_clusters.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users size={10} /> Echo Chamber Risk Clusters
          </p>
          <div className="flex flex-col gap-2">
            {audit.echo_chamber_clusters.map(c => (
              <div key={c.nodeId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-purple-900/20">
                <span className="flex-1 text-xs text-slate-400 font-mono truncate">{c.nodeId}</span>
                <span className="text-[10px] text-amber-400 font-bold flex-shrink-0">{c.similar_count} similar nodes</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-600 mt-2 italic">
            Nodes with many similar neighbors may indicate an over-represented perspective. Review for source diversity.
          </p>
        </div>
      )}

      {/* Duplicate concept risk */}
      {audit.duplicate_concept_risk.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Possible Duplicate Concepts (≥ 85%)
          </p>
          <div className="flex flex-col gap-1.5">
            {audit.duplicate_concept_risk.slice(0, 10).map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/3 text-[10px]">
                <span className="text-slate-500 flex-shrink-0">{Math.round(p.score * 100)}%</span>
                <span className="text-slate-400 truncate">{p.nodeAId}</span>
                <span className="text-slate-600">↔</span>
                <span className="text-slate-400 truncate">{p.nodeBId}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-600 mt-2 italic">
            These pairs may represent the same concept. Do NOT merge without independent editorial review.
          </p>
        </div>
      )}

      {/* Top research potential */}
      {audit.top_research_potential.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp size={10} className="text-purple-400" /> Top Research Potential Pairs
          </p>
          <div className="flex flex-col gap-1.5">
            {audit.top_research_potential.slice(0, 10).map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/3 text-[10px]">
                <span className="text-purple-400 font-bold flex-shrink-0">{Math.round(p.potential * 100)}%</span>
                <span className="text-slate-400 truncate">{p.nodeAId}</span>
                <span className="text-slate-600">↔</span>
                <span className="text-slate-400 truncate">{p.nodeBId}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contradictions */}
      {audit.contradictions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Detected Contradictions / Evidence Conflicts
          </p>
          <div className="flex flex-col gap-2">
            {audit.contradictions.slice(0, 10).map((c, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-white/3 border border-purple-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                    style={{ background: SEV_COLOR[c.severity] + '25', color: SEV_COLOR[c.severity] }}>
                    {c.severity}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">{c.nodeAId} ↔ {c.nodeBId}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{c.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
