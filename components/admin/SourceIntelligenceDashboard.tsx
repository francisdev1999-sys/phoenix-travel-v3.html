'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Globe, CheckCircle2, Clock, XCircle, AlertTriangle,
  ExternalLink, RefreshCw, Play, Shield, TrendingUp, Database,
  BookOpen, FlaskConical, Zap, ChevronRight, Filter, Network,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface DiscoveredSource {
  id: string;
  nodeId: string;
  title: string;
  url: string;
  sourceType: string;
  author: string | null;
  publicationYear: number | null;
  journal: string | null;
  doi: string | null;
  domain: string;
  credibilityScore: number;
  relevanceScore: number;
  riskScore: number;
  credibilityClass: string;
  autoApprove: boolean;
  status: string;
  discoveryApi: string;
  fetchedAt: string;
  node: { id: string; title: string };
}

interface DiscoveryRun {
  id: string; mode: string; status: string;
  nodesChecked: number; sourcesFound: number;
  autoApproved: number; pendingReview: number; skipped: number;
  startedAt: string; completedAt: string | null;
}

interface MaturityStats {
  total: number; avg: number; high: number; medium: number; low: number;
  top5: Array<{ nodeId: string; title: string; score: number }>;
  bottom5: Array<{ nodeId: string; title: string; score: number }>;
}

interface BudgetStatus {
  daily:   { spent: number; limit: number; stop: boolean };
  monthly: { spent: number; limit: number; stop: boolean };
}

interface DiscoveredNode {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  mainstreamView: string | null;
  evidenceLevel: string;
  confidenceScore: number;
  color: string | null;
  icon: string | null;
  year: number | null;
  tags: string[];
  claims: string[];
  criticisms: string[];
  openQuestions: string[];
  sourceUrl: string | null;
  discoveryQuery: string | null;
  relevanceScore: number;
  qualityScore: number;
  noveltyScore: number;
  status: string;
  discoveredAt: string;
}

type InnerTab = 'queue' | 'runs' | 'maturity' | 'domains' | 'nodes';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CLASS_COLOR: Record<string, string> = {
  trusted: '#22c55e', likely_trusted: '#86efac',
  uncertain: '#facc15', weak: '#f97316', suspicious: '#ef4444',
};

const STATUS_COLOR: Record<string, string> = {
  pending_review: '#facc15', auto_approved: '#22c55e',
  approved: '#4ade80', rejected: '#ef4444',
};

function pct(v: number) { return `${Math.round(v * 100)}%`; }
function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)   return `${Math.round(d)}s ago`;
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SourceIntelligenceDashboard() {
  const [tab,        setTab]        = useState<InnerTab>('queue');
  const [sources,    setSources]    = useState<DiscoveredSource[]>([]);
  const [total,      setTotal]      = useState(0);
  const [counts,     setCounts]     = useState<Record<string, number>>({});
  const [runs,       setRuns]       = useState<DiscoveryRun[]>([]);
  const [maturity,   setMaturity]   = useState<MaturityStats | null>(null);
  const [budget,     setBudget]     = useState<BudgetStatus | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [offset,     setOffset]     = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [running,    setRunning]    = useState(false);
  const [runError,   setRunError]   = useState<string | null>(null);
  const [selected,   setSelected]   = useState<DiscoveredSource | null>(null);

  // Node discovery state
  const [discoveredNodes,  setDiscoveredNodes]  = useState<DiscoveredNode[]>([]);
  const [nodeCounts,       setNodeCounts]       = useState<Record<string, number>>({});
  const [nodeTotal,        setNodeTotal]        = useState(0);
  const [nodeStatusFilter, setNodeStatusFilter] = useState('pending_review');
  const [nodeLoading,      setNodeLoading]      = useState(false);
  const [nodeRunning,      setNodeRunning]      = useState(false);
  const [nodeRunError,     setNodeRunError]     = useState<string | null>(null);
  const [selectedNode,     setSelectedNode]     = useState<DiscoveredNode | null>(null);

  const loadSources = useCallback(async (st = statusFilter, off = 0) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/discovered-sources?status=${st}&limit=30&offset=${off}`);
      if (!r.ok) return;
      const d = await r.json() as { items: DiscoveredSource[]; total: number; counts: Record<string, number> };
      setSources(d.items); setTotal(d.total); setCounts(d.counts); setOffset(off);
    } finally { setLoading(false); }
  }, [statusFilter]);

  const loadRuns = useCallback(async () => {
    const r = await fetch('/api/admin/discovery-runs');
    if (!r.ok) return;
    const d = await r.json() as { runs: DiscoveryRun[]; budget: BudgetStatus };
    setRuns(d.runs); setBudget(d.budget);
  }, []);

  const loadMaturity = useCallback(async () => {
    const r = await fetch('/api/admin/research-maturity');
    if (!r.ok) return;
    setMaturity(await r.json());
  }, []);

  useEffect(() => {
    loadSources(); loadRuns(); loadMaturity(); loadDiscoveredNodes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerDiscovery = async () => {
    setRunning(true); setRunError(null);
    try {
      const r = await fetch('/api/admin/discovery-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', maxNodes: 20 }),
      });
      const d = await r.json() as { error?: string };
      if (!r.ok) { setRunError(d.error ?? `Server error ${r.status}`); return; }
      await Promise.all([loadRuns(), loadSources()]);
    } catch (e) { setRunError(String(e)); }
    finally { setRunning(false); }
  };

  const recalcMaturity = async () => {
    setRunning(true);
    try {
      await fetch('/api/cron/research-maturity', { method: 'POST' });
      await loadMaturity();
    } finally { setRunning(false); }
  };

  const reviewSource = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    await fetch(`/api/admin/discovered-sources/${id}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    setSelected(null);
    await loadSources(statusFilter, offset);
  };

  const handleStatusFilter = (s: string) => { setStatusFilter(s); loadSources(s, 0); };

  const loadDiscoveredNodes = useCallback(async (st = nodeStatusFilter, off = 0) => {
    setNodeLoading(true);
    try {
      const r = await fetch(`/api/admin/discovered-nodes?status=${st}&limit=30&offset=${off}`);
      if (!r.ok) return;
      const d = await r.json() as { nodes: DiscoveredNode[]; total: number; counts: Record<string, number> };
      setDiscoveredNodes(d.nodes); setNodeTotal(d.total); setNodeCounts(d.counts);
    } finally { setNodeLoading(false); }
  }, [nodeStatusFilter]);

  const triggerNodeDiscovery = async () => {
    setNodeRunning(true); setNodeRunError(null);
    try {
      const r = await fetch('/api/admin/discovered-nodes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxNodes: 10 }),
      });
      const d = await r.json() as { error?: string; nodesProposed?: number };
      if (!r.ok) { setNodeRunError(d.error ?? `Server error ${r.status}`); return; }
      await loadDiscoveredNodes();
    } catch (e) { setNodeRunError(String(e)); }
    finally { setNodeRunning(false); }
  };

  const reviewDiscoveredNode = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    await fetch(`/api/admin/discovered-nodes/${id}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    setSelectedNode(null);
    await loadDiscoveredNodes(nodeStatusFilter);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Budget banner */}
      {budget && (budget.daily.stop || budget.monthly.stop) && (
        <div className="p-3 rounded-xl bg-red-900/30 border border-red-700/40 flex items-center gap-2 text-sm text-red-300">
          <AlertTriangle size={14} /> Emergency stop active — AI discovery paused
        </div>
      )}

      {/* Header stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Review',  value: counts.pending_review ?? 0,  color: '#facc15', icon: Clock },
          { label: 'Auto-Approved',   value: counts.auto_approved  ?? 0,  color: '#22c55e', icon: CheckCircle2 },
          { label: 'Manual Approved', value: counts.approved        ?? 0,  color: '#4ade80', icon: Shield },
          { label: 'Rejected',        value: counts.rejected        ?? 0,  color: '#ef4444', icon: XCircle },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/6">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={12} style={{ color: s.color }} />
                <span className="text-[10px] text-slate-500">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{s.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Budget display */}
      {budget && (
        <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex flex-wrap gap-6 text-xs">
          <div>
            <span className="text-slate-500">Today AI cost </span>
            <span className="text-white font-semibold">${budget.daily.spent.toFixed(3)}</span>
            <span className="text-slate-600"> / ${budget.daily.limit.toFixed(2)}</span>
            <div className="mt-1 h-1 w-32 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (budget.daily.spent / budget.daily.limit) * 100)}%` }} />
            </div>
          </div>
          <div>
            <span className="text-slate-500">Monthly AI cost </span>
            <span className="text-white font-semibold">${budget.monthly.spent.toFixed(3)}</span>
            <span className="text-slate-600"> / ${budget.monthly.limit.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Inner tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { id: 'queue',    label: 'Discovery Queue', icon: Search },
          { id: 'runs',     label: 'Discovery Runs',  icon: Play },
          { id: 'maturity', label: 'Research Maturity', icon: TrendingUp },
          { id: 'domains',  label: 'Domain Reputation', icon: Globe },
          { id: 'nodes',    label: 'Node Discovery',    icon: Network },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${
                tab === t.id ? 'bg-purple-900/40 border-purple-700/50 text-white' : 'bg-white/3 border-white/6 text-slate-500 hover:text-white'
              }`}>
              <Icon size={11} /> {t.label}
            </button>
          );
        })}
        <button onClick={triggerDiscovery} disabled={running}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-purple-700/40 border border-purple-600/50 text-purple-200 hover:bg-purple-700/60 disabled:opacity-50 transition-all">
          {running ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
          Run Discovery
        </button>
      </div>
      {runError && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 p-2 rounded-lg">{runError}</p>}

      {/* ── QUEUE TAB ── */}
      {tab === 'queue' && (
        <div>
          {/* Status filters */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {['pending_review', 'auto_approved', 'approved', 'rejected', 'all'].map(s => (
              <button key={s} onClick={() => handleStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all ${
                  statusFilter === s ? 'bg-white/10 border-white/20 text-white' : 'bg-white/3 border-white/6 text-slate-600 hover:text-white'
                }`}>
                {s.replace(/_/g, ' ')} {s !== 'all' && (counts[s] ?? 0) > 0 && `(${counts[s]})`}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-slate-600 self-center">{total} total</span>
          </div>

          {loading && sources.length === 0 && (
            <div className="py-12 text-center text-slate-600 text-sm">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
              Loading discovered sources…
            </div>
          )}

          <div className="space-y-2">
            {sources.map(src => (
              <motion.div key={src.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-white/3 border border-white/6 hover:border-purple-800/40 transition-all cursor-pointer"
                onClick={() => setSelected(src)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase"
                        style={{ color: STATUS_COLOR[src.status] ?? '#aaa', backgroundColor: `${STATUS_COLOR[src.status]}18` }}>
                        {src.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/6 text-slate-500">{src.sourceType.replace(/_/g, ' ')}</span>
                      <span className="text-[9px] text-slate-600">{src.discoveryApi}</span>
                      <span className="ml-auto text-[9px] text-slate-700">{ago(src.fetchedAt)}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 line-clamp-1">{src.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {src.node.title} · {src.domain}
                      {src.publicationYear && ` · ${src.publicationYear}`}
                    </p>
                  </div>
                  <div className="flex-none text-right space-y-0.5">
                    <div className="text-[10px]" style={{ color: CLASS_COLOR[src.credibilityClass] ?? '#aaa' }}>
                      {pct(src.credibilityScore)} cred
                    </div>
                    <div className="text-[10px] text-slate-600">{pct(src.relevanceScore)} rel</div>
                  </div>
                  <ChevronRight size={12} className="text-slate-700 flex-none self-center" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {total > 30 && (
            <div className="flex gap-2 mt-3 justify-center">
              <button disabled={offset === 0} onClick={() => loadSources(statusFilter, offset - 30)}
                className="px-3 py-1 rounded text-xs bg-white/4 border border-white/8 disabled:opacity-40">← Prev</button>
              <span className="text-xs text-slate-600 self-center">{offset + 1}–{Math.min(offset + 30, total)} of {total}</span>
              <button disabled={offset + 30 >= total} onClick={() => loadSources(statusFilter, offset + 30)}
                className="px-3 py-1 rounded text-xs bg-white/4 border border-white/8 disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── RUNS TAB ── */}
      {tab === 'runs' && (
        <div className="space-y-2">
          {runs.length === 0 && <p className="text-sm text-slate-600 text-center py-8">No discovery runs yet. Click "Run Discovery" to start.</p>}
          {runs.map(run => (
            <div key={run.id} className="p-3 rounded-xl bg-white/3 border border-white/6">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                  run.status === 'complete' ? 'bg-green-900/40 text-green-400'
                  : run.status === 'failed' ? 'bg-red-900/40 text-red-400'
                  : 'bg-yellow-900/40 text-yellow-400'
                }`}>{run.status}</span>
                <span className="text-[10px] text-slate-500 capitalize">{run.mode}</span>
                <span className="ml-auto text-[10px] text-slate-700">{ago(run.startedAt)}</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  ['Nodes', run.nodesChecked], ['Found', run.sourcesFound],
                  ['Auto ✓', run.autoApproved], ['Review', run.pendingReview],
                ].map(([l, v]) => (
                  <div key={String(l)}>
                    <p className="text-lg font-bold text-white">{v}</p>
                    <p className="text-[9px] text-slate-600">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MATURITY TAB ── */}
      {tab === 'maturity' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={recalcMaturity} disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-white/4 border border-white/8 text-slate-400 hover:text-white disabled:opacity-50">
              {running ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />} Recalculate
            </button>
          </div>
          {maturity ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Nodes Scored', value: maturity.total,  color: '#a78bfa' },
                  { label: 'Avg Score',    value: maturity.avg,    color: '#38bdf8' },
                  { label: 'High (≥67)',   value: maturity.high,   color: '#4ade80' },
                  { label: 'Low (<34)',    value: maturity.low,    color: '#f87171' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/6">
                    <p className="text-[10px] text-slate-500 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {/* Top / Bottom */}
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Most Researched', nodes: maturity.top5,    color: '#4ade80' },
                  { label: 'Needs Research',  nodes: maturity.bottom5, color: '#f87171' },
                ].map(section => (
                  <div key={section.label} className="p-3 rounded-xl bg-white/3 border border-white/6">
                    <p className="text-xs font-semibold text-slate-400 mb-2">{section.label}</p>
                    {section.nodes.map(n => (
                      <div key={n.nodeId} className="flex items-center gap-2 py-1.5 border-b border-white/4 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center text-xs font-bold"
                          style={{ color: section.color }}>{n.score}</div>
                        <span className="text-xs text-slate-300 line-clamp-1">{n.title}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 text-center py-8">No maturity scores yet. Click Recalculate.</p>
          )}
        </div>
      )}

      {/* ── DOMAINS TAB ── */}
      {tab === 'domains' && <DomainReputationTab />}

      {/* ── NODE DISCOVERY TAB ── */}
      {tab === 'nodes' && (
        <div className="space-y-3">
          {/* Node counts */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Pending', value: nodeCounts.pending_review ?? 0, color: '#facc15' },
              { label: 'Approved', value: nodeCounts.approved ?? 0, color: '#4ade80' },
              { label: 'Rejected', value: nodeCounts.rejected ?? 0, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="p-2.5 rounded-xl bg-white/3 border border-white/6">
                <p className="text-[10px] text-slate-500 mb-1">{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex gap-1.5">
              {(['pending_review', 'approved', 'rejected', 'all'] as const).map(s => (
                <button key={s} onClick={() => { setNodeStatusFilter(s); loadDiscoveredNodes(s); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all ${
                    nodeStatusFilter === s ? 'bg-white/10 border-white/20 text-white' : 'bg-white/3 border-white/6 text-slate-600 hover:text-white'
                  }`}>
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <button onClick={triggerNodeDiscovery} disabled={nodeRunning}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-blue-700/40 border border-blue-600/50 text-blue-200 hover:bg-blue-700/60 disabled:opacity-50 transition-all">
              {nodeRunning ? <RefreshCw size={11} className="animate-spin" /> : <Network size={11} />}
              {nodeRunning ? 'Discovering…' : 'Discover Nodes'}
            </button>
          </div>
          {nodeRunError && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 p-2 rounded-lg">{nodeRunError}</p>}

          {nodeLoading && discoveredNodes.length === 0 && (
            <div className="py-8 text-center text-slate-600 text-sm">
              <RefreshCw size={18} className="animate-spin mx-auto mb-2" /> Loading…
            </div>
          )}

          <div className="space-y-2">
            {discoveredNodes.map(dn => (
              <button key={dn.id} onClick={() => setSelectedNode(dn)}
                className="w-full text-left p-3 rounded-xl bg-white/3 border border-white/6 hover:border-blue-700/40 hover:bg-blue-900/10 transition-all group">
                <div className="flex items-start gap-2">
                  <span className="text-xl leading-none mt-0.5">{dn.icon ?? '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white group-hover:text-blue-200 truncate">{dn.title}</p>
                      <span className="flex-none text-[9px] px-1.5 py-0.5 rounded-full border"
                        style={{ color: dn.status === 'pending_review' ? '#facc15' : dn.status === 'approved' ? '#4ade80' : '#ef4444',
                                 borderColor: dn.status === 'pending_review' ? '#854d0e' : dn.status === 'approved' ? '#166534' : '#7f1d1d' }}>
                        {dn.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-1">{dn.category} {dn.year ? `· ${dn.year}` : ''}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{dn.description}</p>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-slate-600">
                      <span>Relevance {Math.round(dn.relevanceScore * 100)}%</span>
                      <span>Quality {Math.round(dn.qualityScore * 100)}%</span>
                      <span>Novelty {Math.round(dn.noveltyScore * 100)}%</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {!nodeLoading && discoveredNodes.length === 0 && (
              <p className="text-sm text-slate-600 text-center py-8">
                No discovered nodes yet. Click &quot;Discover Nodes&quot; to start.
              </p>
            )}
          </div>

          <p className="text-[10px] text-slate-600">{nodeTotal} total nodes in this status</p>
        </div>
      )}

      {/* ── Node Detail Modal ── */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setSelectedNode(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-2xl">{selectedNode.icon ?? '📌'}</span>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedNode.title}</h3>
                  <p className="text-[11px] text-slate-500">{selectedNode.category} · <code className="text-blue-400">{selectedNode.slug}</code></p>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-3 leading-relaxed">{selectedNode.description}</p>

              {selectedNode.claims.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Claims</p>
                  <ul className="space-y-1">
                    {selectedNode.claims.map((c, i) => <li key={i} className="text-[11px] text-slate-400 flex gap-1.5"><span className="text-green-500 flex-none">✓</span>{c}</li>)}
                  </ul>
                </div>
              )}

              {selectedNode.criticisms.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Criticisms</p>
                  <ul className="space-y-1">
                    {selectedNode.criticisms.map((c, i) => <li key={i} className="text-[11px] text-slate-400 flex gap-1.5"><span className="text-red-400 flex-none">⚠</span>{c}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 text-[10px] text-slate-500 mb-3 flex-wrap">
                <span>Evidence: <span className="text-white">{selectedNode.evidenceLevel.replace(/_/g, ' ')}</span></span>
                <span>Confidence: <span className="text-white">{Math.round(selectedNode.confidenceScore * 100)}%</span></span>
                {selectedNode.year && <span>Year: <span className="text-white">{selectedNode.year}</span></span>}
              </div>

              {selectedNode.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {selectedNode.tags.map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px] bg-white/5 border border-white/10 text-slate-400">{t}</span>
                  ))}
                </div>
              )}

              {selectedNode.sourceUrl && (
                <a href={selectedNode.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mb-4">
                  <ExternalLink size={10} /> Wikipedia source
                </a>
              )}

              {selectedNode.status === 'pending_review' && (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => reviewDiscoveredNode(selectedNode.id, 'approve')}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-green-800/50 border border-green-700/50 text-green-300 hover:bg-green-800/70 transition-colors">
                    ✓ Approve → Add to Graph
                  </button>
                  <button onClick={() => reviewDiscoveredNode(selectedNode.id, 'reject')}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-900/40 border border-red-800/40 text-red-400 hover:bg-red-900/60 transition-colors">
                    ✗ Reject
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Source Detail Modal ── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">{selected.title}</h3>
              <p className="text-[10px] text-slate-500 mb-3">{selected.node.title}</p>

              <div className="space-y-1.5 mb-4 text-[11px]">
                {[
                  ['Source Type', selected.sourceType.replace(/_/g,' ')],
                  ['Domain', selected.domain],
                  ['API', selected.discoveryApi],
                  ['Year', selected.publicationYear ?? '—'],
                  ['Author', selected.author ?? '—'],
                  ['Journal', selected.journal ?? '—'],
                  ['DOI', selected.doi ?? '—'],
                  ['Credibility', `${pct(selected.credibilityScore)} (${selected.credibilityClass.replace(/_/,' ')})`],
                  ['Relevance', pct(selected.relevanceScore)],
                  ['Risk', pct(selected.riskScore)],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex gap-2">
                    <span className="text-slate-600 w-24 flex-none">{k}</span>
                    <span className="text-slate-300">{String(v)}</span>
                  </div>
                ))}
              </div>

              <a href={selected.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 mb-4">
                <ExternalLink size={10} /> {selected.url.slice(0, 60)}…
              </a>

              {selected.status === 'pending_review' && (
                <div className="flex gap-2">
                  <button onClick={() => reviewSource(selected.id, 'approve')}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-green-800/50 border border-green-700/50 text-green-300 hover:bg-green-800/70 transition-colors">
                    ✓ Approve
                  </button>
                  <button onClick={() => reviewSource(selected.id, 'reject')}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-900/40 border border-red-800/40 text-red-400 hover:bg-red-900/60 transition-colors">
                    ✗ Reject
                  </button>
                </div>
              )}
              {selected.status === 'auto_approved' && (
                <div className="flex gap-2">
                  <button onClick={() => reviewSource(selected.id, 'approve')}
                    className="flex-1 py-2 rounded-lg text-xs bg-green-800/50 border border-green-700/50 text-green-300">
                    ✓ Confirm
                  </button>
                  <button onClick={() => reviewSource(selected.id, 'reject')}
                    className="flex-1 py-2 rounded-lg text-xs bg-red-900/40 border border-red-800/40 text-red-400">
                    ✗ Reverse
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Domain Reputation Tab ────────────────────────────────────────────────────

function DomainReputationTab() {
  const [domains,  setDomains]  = useState<Array<{id:string;domain:string;institutionType:string|null;reputationScore:number;status:string;approvalCount:number;rejectionCount:number}>>([]);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async (f = 'all') => {
    setLoading(true);
    const r = await fetch(`/api/admin/domain-reputation?status=${f}&limit=100`);
    if (r.ok) {
      const d = await r.json() as { domains: typeof domains };
      setDomains(d.domains);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (domain: string, status: string) => {
    await fetch('/api/admin/domain-reputation', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, status }),
    });
    load(filter);
  };

  const STATUS_LABELS = ['all', 'trusted', 'normal', 'watch', 'blocked'];

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {STATUS_LABELS.map(s => (
          <button key={s} onClick={() => { setFilter(s); load(s); }}
            className={`px-2.5 py-1 rounded text-[10px] border transition-all ${filter === s ? 'bg-white/10 border-white/20 text-white' : 'bg-white/3 border-white/6 text-slate-600 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>
      {loading && <p className="text-xs text-slate-600 py-4 text-center">Loading…</p>}
      <div className="space-y-1.5">
        {domains.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/6 text-xs">
            <div className="flex-1 min-w-0">
              <span className="text-slate-300 font-mono">{d.domain}</span>
              {d.institutionType && <span className="ml-2 text-slate-600">{d.institutionType}</span>}
            </div>
            <span className="text-white font-semibold">{Math.round(d.reputationScore * 100)}</span>
            <span className="text-green-500 text-[10px]">✓{d.approvalCount}</span>
            <span className="text-red-500 text-[10px]">✗{d.rejectionCount}</span>
            <select value={d.status} onChange={e => updateStatus(d.domain, e.target.value)}
              className="bg-white/8 border border-white/10 rounded px-1 py-0.5 text-[10px] text-slate-300">
              {['trusted', 'normal', 'watch', 'blocked'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
