'use client';
import { useEffect, useState } from 'react';
import { Loader2, BookMarked, Network, GitBranch, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Stats {
  pending:  { sources: number; nodes: number; edges: number };
  approved: { sources: number; nodes: number; edges: number };
  rejected: { sources: number; nodes: number; edges: number };
  total:    { sources: number; nodes: number; edges: number };
}

export default function AdminStats({ onTabSelect }: { onTabSelect: (tab: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400" size={20} /></div>;

  const totalPending = stats.pending.sources + stats.pending.nodes + stats.pending.edges;

  return (
    <div className="flex flex-col gap-6">
      {totalPending > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
          <Clock size={18} className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-yellow-300">{totalPending} item{totalPending !== 1 ? 's' : ''} awaiting review</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {stats.pending.sources > 0 && `${stats.pending.sources} source${stats.pending.sources !== 1 ? 's' : ''}`}
              {stats.pending.sources > 0 && (stats.pending.nodes > 0 || stats.pending.edges > 0) && ' · '}
              {stats.pending.nodes > 0 && `${stats.pending.nodes} node${stats.pending.nodes !== 1 ? 's' : ''}`}
              {stats.pending.nodes > 0 && stats.pending.edges > 0 && ' · '}
              {stats.pending.edges > 0 && `${stats.pending.edges} relationship${stats.pending.edges !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<BookMarked size={16} className="text-indigo-400" />}
          label="Sources"
          pending={stats.pending.sources}
          approved={stats.approved.sources}
          rejected={stats.rejected.sources}
          total={stats.total.sources}
          onClick={() => onTabSelect('sources')}
        />
        <StatCard
          icon={<Network size={16} className="text-cyan-400" />}
          label="Nodes"
          pending={stats.pending.nodes}
          approved={stats.approved.nodes}
          rejected={stats.rejected.nodes}
          total={stats.total.nodes}
          onClick={() => onTabSelect('nodes')}
        />
        <StatCard
          icon={<GitBranch size={16} className="text-purple-400" />}
          label="Relationships"
          pending={stats.pending.edges}
          approved={stats.approved.edges}
          rejected={stats.rejected.edges}
          total={stats.total.edges}
          onClick={() => onTabSelect('edges')}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={<Clock size={13} className="text-yellow-400" />} label="Total pending" value={totalPending} color="#eab308" />
        <MiniStat icon={<CheckCircle size={13} className="text-green-400" />} label="Total approved" value={stats.approved.sources + stats.approved.nodes + stats.approved.edges} color="#22c55e" />
        <MiniStat icon={<XCircle size={13} className="text-red-400" />} label="Total rejected" value={stats.rejected.sources + stats.rejected.nodes + stats.rejected.edges} color="#ef4444" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, pending, approved, rejected, total, onClick }: {
  icon: React.ReactNode; label: string;
  pending: number; approved: number; rejected: number; total: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-purple-900/30 hover:border-purple-500/40 hover:bg-white/8 transition-all text-left"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold text-white">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{total}</div>
      <div className="flex gap-2 text-[10px]">
        <span className="text-yellow-400">{pending} pending</span>
        <span className="text-slate-600">·</span>
        <span className="text-green-400">{approved} approved</span>
      </div>
    </button>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-purple-900/20">
      {icon}
      <div>
        <div className="text-sm font-bold" style={{ color }}>{value}</div>
        <div className="text-[10px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}
