'use client';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Shield, ShieldOff, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { trustColor } from '@/lib/trust-utils';

interface UserRow {
  id: string; name: string | null; email: string | null; image: string | null;
  role: string; trustScore: number; activityScore: number; rank: string;
  isBanned: boolean; warningCount: number;
  submissionCount: number; approvedCount: number; rejectedCount: number;
  createdAt: string; lastActiveAt: string;
  _count: { earnedBadges: number };
}

const ROLE_OPTIONS = [
  'admin', 'moderation_admin', 'reviewer', 'source_verifier',
  'verified_contributor', 'contributor', 'user', 'banned',
];

const ROLE_COLOR: Record<string, string> = {
  owner:                'text-yellow-400',
  admin:                'text-purple-400',
  moderation_admin:     'text-orange-400',
  reviewer:             'text-cyan-400',
  source_verifier:      'text-teal-400',
  verified_contributor: 'text-emerald-400',
  contributor:          'text-slate-300',
  user:                 'text-slate-500',
  banned:               'text-red-400',
};

export default function UserManagement() {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [sortBy, setSortBy]       = useState('createdAt');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError]         = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), sortBy });
    if (search)      q.set('search', search);
    if (roleFilter)  q.set('role', roleFilter);
    if (bannedFilter) q.set('banned', bannedFilter);
    fetch(`/api/admin/users?${q}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setError(''); })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter, bannedFilter, sortBy]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (userId: string, role: string) => {
    setActionLoading(userId + '_role');
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); } else { load(); }
    setActionLoading('');
  };

  const toggleBan = async (user: UserRow) => {
    setActionLoading(user.id + '_ban');
    const res = await fetch(`/api/admin/users/${user.id}/ban`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ban: !user.isBanned, reason: user.isBanned ? 'Ban lifted' : 'Policy violation' }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); } else { load(); }
    setActionLoading('');
  };

  return (
    <div className="space-y-4">
      {error && <div className="text-xs text-red-400 p-3 bg-red-900/10 rounded-lg border border-red-900/30">{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-black/30 border border-purple-900/30 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <select
          value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs rounded-lg bg-black/30 border border-purple-900/30 text-slate-300"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={bannedFilter} onChange={e => { setBannedFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs rounded-lg bg-black/30 border border-purple-900/30 text-slate-300"
        >
          <option value="">All users</option>
          <option value="true">Banned only</option>
          <option value="false">Active only</option>
        </select>
        <select
          value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-black/30 border border-purple-900/30 text-slate-300"
        >
          <option value="createdAt">Newest</option>
          <option value="trustScore">Trust Score</option>
          <option value="activityScore">Activity</option>
          <option value="approvedCount">Approved Count</option>
          <option value="lastActiveAt">Last Active</option>
        </select>
      </div>

      {/* Total */}
      <div className="text-xs text-slate-500">{total.toLocaleString()} users</div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
      ) : (
        <div className="divide-y divide-purple-900/20 rounded-xl border border-purple-900/20 overflow-hidden">
          {users.map(u => (
            <div key={u.id}>
              {/* Row */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-black/20 hover:bg-purple-900/10 cursor-pointer"
                onClick={() => setExpanded(expanded === u.id ? null : u.id)}
              >
                {u.image
                  ? <img src={u.image} className="w-7 h-7 rounded-full" />
                  : <div className="w-7 h-7 rounded-full bg-purple-900/50 flex items-center justify-center text-xs text-purple-300">{(u.name ?? u.email ?? '?')[0]?.toUpperCase()}</div>
                }
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{u.name ?? 'Unnamed'}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                </div>
                <span className={`text-xs font-medium ${ROLE_COLOR[u.role] ?? 'text-slate-400'}`}>{u.role}</span>
                <span className={`text-xs font-bold ${trustColor(u.trustScore)}`}>{Math.round(u.trustScore)}</span>
                {u.isBanned && <span className="text-xs text-red-400 font-bold">BANNED</span>}
                <span className="text-xs text-slate-600">↑ {u.approvedCount}/{u.submissionCount}</span>
                <span className="text-xs text-slate-600">🏅 {u._count.earnedBadges}</span>
              </div>

              {/* Expanded panel */}
              {expanded === u.id && (
                <div className="px-4 py-3 bg-purple-950/20 border-t border-purple-900/20 space-y-3">
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>Rank: <strong className="text-slate-200">{u.rank}</strong></span>
                    <span>Trust: <strong className={trustColor(u.trustScore)}>{Math.round(u.trustScore)}</strong></span>
                    <span>Activity: <strong className="text-slate-200">{Math.round(u.activityScore)}</strong></span>
                    <span>Warnings: <strong className="text-amber-400">{u.warningCount}</strong></span>
                    <span>Joined: <strong className="text-slate-200">{new Date(u.createdAt).toLocaleDateString()}</strong></span>
                    <span>Last active: <strong className="text-slate-200">{new Date(u.lastActiveAt).toLocaleDateString()}</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Role change */}
                    <select
                      defaultValue={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      disabled={!!actionLoading}
                      className="px-2 py-1 text-xs rounded-lg bg-black/40 border border-purple-900/30 text-slate-300"
                    >
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {/* Ban toggle */}
                    <button
                      onClick={() => toggleBan(u)}
                      disabled={!!actionLoading}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        u.isBanned
                          ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                          : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                      }`}
                    >
                      {u.isBanned ? <><ShieldOff size={11} /> Unban</> : <><Shield size={11} /> Ban</>}
                    </button>
                    {/* View trust history link */}
                    <button
                      onClick={() => window.open(`/api/admin/users/${u.id}/trust`, '_blank')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-purple-900/30 text-purple-300 hover:bg-purple-900/50"
                    >
                      <Star size={11} /> Trust history
                    </button>
                  </div>
                  {actionLoading.startsWith(u.id) && (
                    <div className="text-xs text-slate-500">Processing…</div>
                  )}
                </div>
              )}
            </div>
          ))}

          {users.length === 0 && (
            <div className="px-4 py-8 text-xs text-slate-500 text-center">No users found.</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded-lg border border-purple-900/30 text-slate-400 hover:text-white disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-slate-500">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-1.5 rounded-lg border border-purple-900/30 text-slate-400 hover:text-white disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
