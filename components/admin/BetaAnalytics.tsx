'use client';
import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2, TrendingUp, Search, Globe, Network, BookMarked, Clock, Activity } from 'lucide-react';

interface AnalyticsData {
  period: { days: number; since: string };
  usage: {
    byEventType: Record<string, number>;
    totalEvents: number;
    graph: number; timeline: number; globe: number; sources: number;
    nodeViews: number; universe: number; evidence: number; rabbitHole: number;
  };
  search: { total: number; clicks: number; successRate: number | null; zeroResults: number };
  feedback: { byStatus: Record<string, number>; total: number; open: number; reviewing: number };
  invites: { total: number; maxUses: number; usedSlots: number };
  moderation: { pendingNodes: number; pendingEdges: number; totalPending: number };
  sourceQuality: {
    byStatus: Record<string, number>;
    total: number;
    approvalRate: number | null;
    rejectionRate: number | null;
  };
}

function StatCard({ label, value, sub, color = 'purple', icon }: {
  label: string; value: string | number; sub?: string;
  color?: 'purple' | 'amber' | 'green' | 'blue' | 'red' | 'cyan';
  icon?: React.ReactNode;
}) {
  const COLORS: Record<string, string> = {
    purple: 'border-purple-900/30 bg-purple-900/10',
    amber:  'border-amber-900/30 bg-amber-900/10',
    green:  'border-green-900/30 bg-green-900/10',
    blue:   'border-blue-900/30 bg-blue-900/10',
    red:    'border-red-900/30 bg-red-900/10',
    cyan:   'border-cyan-900/30 bg-cyan-900/10',
  };
  const TEXT: Record<string, string> = {
    purple: 'text-purple-300', amber: 'text-amber-300', green: 'text-green-300',
    blue: 'text-blue-300', red: 'text-red-400', cyan: 'text-cyan-300',
  };

  return (
    <div className={`rounded-xl border p-3 ${COLORS[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className={TEXT[color]}>{icon}</span>}
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${TEXT[color]}`}>{value}</p>
      {sub && <p className="text-[9px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function UsageBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="text-[10px] font-bold text-white">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function BetaAnalytics() {
  const [data, setData]   = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]   = useState(30);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/beta/analytics?days=${days}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(load, [load]);

  const maxUsage = data ? Math.max(
    data.usage.graph, data.usage.timeline, data.usage.globe,
    data.usage.sources, data.usage.nodeViews, data.usage.universe,
    data.usage.evidence, data.usage.rabbitHole, 1,
  ) : 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" /> Beta Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Usage metrics for the private beta program</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[7, 14, 30, 60].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  days === d ? 'bg-cyan-900/40 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={load} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-cyan-400" size={20} /></div>
      ) : !data ? (
        <p className="text-xs text-red-400">Failed to load analytics.</p>
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="Total Events"   value={data.usage.totalEvents.toLocaleString()} color="cyan"   icon={<Activity size={12} />} />
            <StatCard label="Search Success" value={data.search.successRate !== null ? `${data.search.successRate}%` : '—'} color="green" icon={<Search size={12} />}
              sub={`${data.search.total} searches · ${data.search.clicks} clicks`} />
            <StatCard label="Pending Review" value={data.moderation.totalPending} color="amber" icon={<TrendingUp size={12} />}
              sub={`${data.moderation.pendingNodes} nodes · ${data.moderation.pendingEdges} edges`} />
            <StatCard label="Open Feedback"  value={data.feedback.open} color="red" icon={<BarChart3 size={12} />}
              sub={`${data.feedback.total} total · ${data.feedback.reviewing} reviewing`} />
          </div>

          {/* Usage breakdown */}
          <div className="rounded-xl border border-purple-900/20 p-4 space-y-3">
            <p className="text-xs font-bold text-white">Feature Usage</p>
            <UsageBar label="Knowledge Graph"  value={data.usage.graph}     max={maxUsage} color="#a855f7" />
            <UsageBar label="Node Views"       value={data.usage.nodeViews} max={maxUsage} color="#8b5cf6" />
            <UsageBar label="Timeline"         value={data.usage.timeline}  max={maxUsage} color="#3b82f6" />
            <UsageBar label="Ancient Globe"    value={data.usage.globe}     max={maxUsage} color="#06b6d4" />
            <UsageBar label="Evidence Board"   value={data.usage.evidence}  max={maxUsage} color="#10b981" />
            <UsageBar label="Universe View"    value={data.usage.universe}  max={maxUsage} color="#6366f1" />
            <UsageBar label="Sources"          value={data.usage.sources}   max={maxUsage} color="#f59e0b" />
            <UsageBar label="Rabbit Hole Mode" value={data.usage.rabbitHole}max={maxUsage} color="#ec4899" />
          </div>

          {/* Search + Source Quality side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-purple-900/20 p-4 space-y-2">
              <p className="text-xs font-bold text-white flex items-center gap-1.5"><Search size={12} className="text-purple-400" />Search Quality</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]"><span className="text-slate-400">Total searches</span><span className="text-white">{data.search.total}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-400">Click-throughs</span><span className="text-green-400">{data.search.clicks}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-400">Success rate</span><span className="text-white">{data.search.successRate !== null ? `${data.search.successRate}%` : '—'}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-400">Zero-result searches</span><span className="text-red-400">{data.search.zeroResults}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-purple-900/20 p-4 space-y-2">
              <p className="text-xs font-bold text-white flex items-center gap-1.5"><BookMarked size={12} className="text-purple-400" />Source Submission Quality</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]"><span className="text-slate-400">Total submissions</span><span className="text-white">{data.sourceQuality.total}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-400">Approval rate</span><span className="text-green-400">{data.sourceQuality.approvalRate !== null ? `${data.sourceQuality.approvalRate}%` : '—'}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-400">Rejection rate</span><span className="text-red-400">{data.sourceQuality.rejectionRate !== null ? `${data.sourceQuality.rejectionRate}%` : '—'}</span></div>
                {Object.entries(data.sourceQuality.byStatus).map(([s, c]) => (
                  <div key={s} className="flex justify-between text-[10px]">
                    <span className="text-slate-500 capitalize">{s}</span>
                    <span className="text-slate-300">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Invites summary */}
          <div className="rounded-xl border border-purple-900/20 p-4">
            <p className="text-xs font-bold text-white mb-2">Invite Usage</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-purple-300">{data.invites.total}</p>
                <p className="text-[9px] text-slate-500">Total Invites</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-300">{data.invites.usedSlots}</p>
                <p className="text-[9px] text-slate-500">Redeemed Slots</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-300">{data.invites.maxUses - data.invites.usedSlots}</p>
                <p className="text-[9px] text-slate-500">Remaining Capacity</p>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-slate-600 text-center">
            Showing data for last {days} days (since {new Date(data.period.since).toLocaleDateString()})
          </p>
        </div>
      )}
    </div>
  );
}
