'use client';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Users, FileText, GitBranch, BookMarked, AlertTriangle, Bot, RefreshCw, TrendingUp, Shield } from 'lucide-react';

interface HealthData {
  users:     { total: number; dau: number; wau: number; mau: number; recentSignups: number; bannedUsers: number; byRole: {role:string;count:number}[] };
  content:   { nodes: {total:number;published:number;drafts:number}; edges: {total:number;published:number}; sources: {total:number;pending:number;approved:number} };
  queues:    { pendingNodes: number; pendingEdges: number; pendingSuggestions: number; openReports: number };
  moderation:{ actionsThisMonth: number };
  ai:        { reviewsThisMonth: number; inputTokens: number; outputTokens: number; estimatedCostUsd?: number };
  topNodes:  { id: string; title: string; evidenceLevel: string; _count: { sourceLinks: number } }[];
  generatedAt: string;
}

function StatCard({ label, value, sub, icon, color = 'text-slate-300' }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-purple-900/20 bg-black/20 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`opacity-60 ${color}`}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function PlatformHealthDashboard() {
  const [data, setData]       = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/platform-health')
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error); } else { setData(d); setError(''); } })
      .catch(() => setError('Failed to load platform metrics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-400" size={24} /></div>;
  if (error)   return <div className="p-4 text-sm text-red-400 rounded-xl border border-red-900/30 bg-red-900/10">{error}</div>;
  if (!data)   return null;

  const rejectionRate = data.content.nodes.total > 0
    ? Math.round(((data.content.nodes.total - data.content.nodes.published) / data.content.nodes.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Platform Health</h2>
          <p className="text-xs text-slate-500">Last updated: {new Date(data.generatedAt).toLocaleTimeString()}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-900/30 text-purple-300 hover:bg-purple-900/50">
          <RefreshCw size={12} />Refresh
        </button>
      </div>

      {/* Users */}
      <section>
        <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">Users</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Users"    value={data.users.total}         icon={<Users size={14} />}       color="text-cyan-400" />
          <StatCard label="DAU"            value={data.users.dau}           icon={<TrendingUp size={14} />}  color="text-emerald-400" />
          <StatCard label="WAU"            value={data.users.wau}           icon={<TrendingUp size={14} />}  color="text-emerald-400" />
          <StatCard label="MAU"            value={data.users.mau}           icon={<TrendingUp size={14} />}  color="text-emerald-400" />
          <StatCard label="New (7d)"       value={data.users.recentSignups} icon={<Users size={14} />}       color="text-cyan-400" />
          <StatCard label="Banned"         value={data.users.bannedUsers}   icon={<Shield size={14} />}      color="text-red-400" />
          <StatCard label="Mod Actions/mo" value={data.moderation.actionsThisMonth} icon={<Shield size={14} />} color="text-amber-400" />
          <StatCard label="Open Reports"   value={data.queues.openReports}  icon={<AlertTriangle size={14} />} color="text-red-400" />
        </div>

        {/* Role distribution */}
        <div className="mt-3 p-4 rounded-xl border border-purple-900/20 bg-black/20">
          <p className="text-xs text-slate-500 mb-2">Role distribution</p>
          <div className="flex flex-wrap gap-2">
            {data.users.byRole.map(r => (
              <span key={r.role} className="px-2 py-1 rounded-lg bg-purple-900/20 text-xs text-slate-300">
                {r.role}: <strong>{r.count}</strong>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section>
        <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">Content</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Nodes"     value={data.content.nodes.total}           icon={<FileText size={14} />}    color="text-purple-300" sub={`${data.content.nodes.published} published`} />
          <StatCard label="Draft Nodes"     value={data.content.nodes.drafts}          icon={<FileText size={14} />}    color="text-amber-400" />
          <StatCard label="Total Edges"     value={data.content.edges.total}           icon={<GitBranch size={14} />}   color="text-indigo-400" sub={`${data.content.edges.published} published`} />
          <StatCard label="Total Sources"   value={data.content.sources.total}         icon={<BookMarked size={14} />}  color="text-teal-400"  sub={`${data.content.sources.approved} approved`} />
          <StatCard label="Pending Nodes"   value={data.queues.pendingNodes}           icon={<FileText size={14} />}    color="text-amber-400" />
          <StatCard label="Pending Edges"   value={data.queues.pendingEdges}           icon={<GitBranch size={14} />}   color="text-amber-400" />
          <StatCard label="Pending Sources" value={data.content.sources.pending}       icon={<BookMarked size={14} />}  color="text-amber-400" />
          <StatCard label="AI Suggestions"  value={data.queues.pendingSuggestions}     icon={<Bot size={14} />}         color="text-cyan-400" />
        </div>
      </section>

      {/* AI Usage */}
      <section>
        <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">AI Research (This Month)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Reviews Run"    value={data.ai.reviewsThisMonth} icon={<Bot size={14} />} color="text-cyan-400" />
          <StatCard label="Input Tokens"   value={data.ai.inputTokens.toLocaleString()}  icon={<Bot size={14} />} color="text-slate-400" />
          <StatCard label="Output Tokens"  value={data.ai.outputTokens.toLocaleString()} icon={<Bot size={14} />} color="text-slate-400" />
          {data.ai.estimatedCostUsd !== undefined && (
            <StatCard label="Est. Cost USD"  value={`$${data.ai.estimatedCostUsd.toFixed(4)}`} icon={<Bot size={14} />} color="text-emerald-400" />
          )}
        </div>
      </section>

      {/* Top Nodes */}
      {data.topNodes.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">Top Nodes by Source Count</h3>
          <div className="divide-y divide-purple-900/20 rounded-xl border border-purple-900/20 overflow-hidden">
            {data.topNodes.map((n, i) => (
              <div key={n.id} className="flex items-center justify-between px-4 py-2 bg-black/20 hover:bg-purple-900/10">
                <span className="text-xs text-slate-500 w-5">{i + 1}</span>
                <span className="flex-1 text-xs text-slate-300 font-medium truncate">{n.title}</span>
                <span className="text-xs text-slate-500">{n._count.sourceLinks} sources</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
