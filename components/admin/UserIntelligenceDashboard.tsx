'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, TrendingUp, AlertTriangle, Bot, ShieldOff, Ban, Shield,
  RefreshCw, ChevronDown, ChevronUp, Eye, AlertOctagon,
  CheckCircle, Clock, Zap, Activity, Award, XCircle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'overview' | 'active' | 'contributors' | 'suspicious' | 'bots' | 'spam' | 'banned';
type ModerationStatus = 'active' | 'watched' | 'restricted' | 'suspended' | 'banned';
type RiskLevel = 'low' | 'watch' | 'suspicious' | 'high_risk' | 'unscored';

interface Alert { type: string; message: string; severity: 'info' | 'warning' | 'critical' }

interface OverviewData {
  alerts: Alert[];
  summary: {
    totalUsers: number; newSignups24h: number; bannedCount: number;
    suspendedCount: number; watchCount: number; highRiskCount: number; recentEvents1h: number;
  };
}

interface UserRow {
  id: string; name: string | null; email: string | null; image: string | null;
  role: string; createdAt: string; lastActiveAt: string | null;
  trustScore?: number; activityScore?: number;
  submissionCount?: number; approvedCount?: number; rejectedCount?: number;
  isBanned?: boolean; moderationStatus?: string;
  // Active fields
  pagesViewed?: number; connections?: number; totalEvents?: number;
  nodeSubmissions?: number; edgeSubmissions?: number; sourceSubmissions?: number;
  // Contributor fields
  approvedNodes?: number; approvedEdges?: number; approvedSources?: number;
  approvalRate?: number; avgSourceQuality?: number | null;
  // Risk fields
  riskScore?: number | null; riskLevel?: RiskLevel; spamScore?: number | null;
  botScore?: number | null; reasons?: { reason: string; delta: number }[];
  lastCalculatedAt?: string; recentEvents1h?: number | null;
  // Banned fields
  banReason?: string | null; banExpiresAt?: string | null;
  changedBy?: string | null; changedAt?: string; statusType?: string;
  detectionSource?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  low:        'text-emerald-400',
  watch:      'text-yellow-400',
  suspicious: 'text-orange-400',
  high_risk:  'text-red-400',
  unscored:   'text-slate-500',
};

const RISK_BG: Record<string, string> = {
  low:        'bg-emerald-900/20 border-emerald-500/30',
  watch:      'bg-yellow-900/20 border-yellow-500/30',
  suspicious: 'bg-orange-900/20 border-orange-500/30',
  high_risk:  'bg-red-900/20 border-red-500/30',
  unscored:   'bg-slate-800/20 border-slate-600/30',
};

const MOD_COLORS: Record<string, string> = {
  active:     'text-emerald-400',
  watched:    'text-yellow-400',
  restricted: 'text-orange-400',
  suspended:  'text-red-300',
  banned:     'text-red-500',
};

const ROLE_COLORS: Record<string, string> = {
  owner:       'text-amber-400',
  admin:       'text-purple-400',
  reviewer:    'text-blue-400',
  contributor: 'text-cyan-400',
  user:        'text-slate-400',
};

function ago(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 60_000)   return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function pct(a: number, b: number): string {
  if (!b) return '—';
  return `${Math.round((a / b) * 100)}%`;
}

// ── Action menu ───────────────────────────────────────────────────────────────

function ActionMenu({ user, onAction }: {
  user: UserRow;
  onAction: (userId: string, action: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [open,   setOpen]   = useState(false);
  const [dialog, setDialog] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [days,   setDays]   = useState('');
  const [busy,   setBusy]   = useState(false);

  const submit = async (action: string) => {
    if (!reason.trim() && action !== 'unban') return;
    setBusy(true);
    await onAction(user.id, action, { reason: reason.trim(), durationDays: days ? Number(days) : undefined });
    setBusy(false);
    setDialog(null);
    setReason('');
    setDays('');
    setOpen(false);
  };

  const actions = [
    { key: 'warn',     label: 'Warn user',         show: !user.isBanned },
    { key: 'restrict', label: 'Restrict submissions', show: !user.isBanned },
    { key: 'suspend',  label: 'Suspend user',       show: !user.isBanned },
    { key: 'ban',      label: 'Ban user',            show: !user.isBanned },
    { key: 'unban',    label: 'Unban user',          show: !!user.isBanned },
  ].filter(a => a.show);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
        Actions {open ? <ChevronUp size={10} className="inline" /> : <ChevronDown size={10} className="inline" />}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          {actions.map(a => (
            <button key={a.key} onClick={() => { setDialog(a.key); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition-colors ${
                a.key === 'ban' ? 'text-red-400' : 'text-slate-300'
              }`}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDialog(null)}>
          <div className="w-80 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-3 capitalize">{dialog} user</h3>
            {dialog !== 'unban' && (
              <textarea
                value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Reason (required)"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 mb-2 h-16 resize-none"
              />
            )}
            {dialog === 'suspend' && (
              <input type="number" value={days} onChange={e => setDays(e.target.value)}
                placeholder="Duration in days (optional)"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 mb-2"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDialog(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800">Cancel</button>
              <button onClick={() => submit(dialog)} disabled={busy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors ${
                  dialog === 'ban' ? 'bg-red-700 hover:bg-red-600' : 'bg-purple-700 hover:bg-purple-600'
                } disabled:opacity-50`}>
                {busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserTableRow({ user, section, onAction }: {
  user: UserRow;
  section: Section;
  onAction: (userId: string, action: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${
        user.riskLevel === 'high_risk' ? 'bg-red-900/5' :
        user.riskLevel === 'suspicious' ? 'bg-orange-900/5' : ''
      }`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {user.image
              ? <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
              : <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                  {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                </div>
            }
            <div>
              <p className="text-xs font-medium text-white">{user.name ?? '—'}</p>
              <p className="text-[10px] text-slate-500">{user.email}</p>
            </div>
          </div>
        </td>

        <td className="px-3 py-3">
          <span className={`text-xs font-medium ${ROLE_COLORS[user.role] ?? 'text-slate-400'}`}>{user.role}</span>
        </td>

        {section === 'active' && <>
          <td className="px-3 py-3 text-xs text-slate-300">{user.activityScore?.toFixed(0) ?? '—'}</td>
          <td className="px-3 py-3 text-xs text-slate-400">{ago(user.lastActiveAt)}</td>
          <td className="px-3 py-3 text-xs text-slate-400">{user.pagesViewed ?? '—'}</td>
          <td className="px-3 py-3 text-xs text-slate-400">{user.submissionCount ?? '—'}</td>
          <td className="px-3 py-3 text-xs text-slate-400">{user.approvedCount ?? '—'}</td>
        </>}

        {section === 'contributors' && <>
          <td className="px-3 py-3 text-xs text-emerald-400 font-medium">{user.approvedCount ?? '—'}</td>
          <td className="px-3 py-3 text-xs text-slate-400">{user.approvedNodes ?? 0} / {user.approvedEdges ?? 0} / {user.approvedSources ?? 0}</td>
          <td className="px-3 py-3 text-xs text-slate-300">{user.approvalRate != null ? `${user.approvalRate}%` : '—'}</td>
          <td className="px-3 py-3 text-xs text-blue-400">{user.trustScore?.toFixed(0) ?? '—'}</td>
        </>}

        {(section === 'suspicious' || section === 'spam' || section === 'bots') && <>
          <td className="px-3 py-3">
            {user.riskLevel && user.riskLevel !== 'unscored' ? (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${RISK_BG[user.riskLevel]}`}>
                <span className={RISK_COLORS[user.riskLevel]}>{user.riskLevel.replace('_', ' ').toUpperCase()}</span>
              </span>
            ) : <span className="text-xs text-slate-600">unscored</span>}
          </td>
          <td className="px-3 py-3 text-xs text-slate-300">
            {section === 'bots'     ? (user.botScore?.toFixed(0) ?? '—') :
             section === 'spam'     ? (user.spamScore?.toFixed(0) ?? '—') :
             (user.riskScore?.toFixed(0) ?? '—')}
          </td>
          <td className="px-3 py-3 text-xs text-slate-400">
            {user.submissionCount ? pct(user.rejectedCount ?? 0, user.submissionCount) : '—'}
          </td>
          <td className="px-3 py-3 text-xs text-slate-400">{ago(user.createdAt)}</td>
        </>}

        {section === 'banned' && <>
          <td className="px-3 py-3">
            <span className={`text-xs font-medium ${MOD_COLORS[user.moderationStatus ?? 'banned'] ?? 'text-red-400'}`}>
              {user.statusType ?? user.moderationStatus ?? 'banned'}
            </span>
          </td>
          <td className="px-3 py-3 text-xs text-slate-400 max-w-[160px] truncate">{user.banReason ?? '—'}</td>
          <td className="px-3 py-3 text-xs text-slate-500">{ago(user.changedAt ?? null)}</td>
        </>}

        <td className="px-3 py-3">
          {user.moderationStatus && user.moderationStatus !== 'active' && (
            <span className={`text-[10px] font-medium ${MOD_COLORS[user.moderationStatus] ?? 'text-slate-400'}`}>
              {user.moderationStatus}
            </span>
          )}
        </td>

        <td className="px-3 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(!expanded)}
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700">
              <Eye size={13} />
            </button>
            <ActionMenu user={user} onAction={onAction} />
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-800/20">
          <td colSpan={9} className="px-6 py-3">
            <div className="flex gap-6 flex-wrap text-xs text-slate-400">
              <span>ID: <code className="text-slate-300">{user.id}</code></span>
              <span>Joined: <span className="text-slate-300">{new Date(user.createdAt).toLocaleDateString()}</span></span>
              <span>Submissions: <span className="text-slate-300">{user.submissionCount ?? 0}</span></span>
              <span>Approved: <span className="text-emerald-400">{user.approvedCount ?? 0}</span></span>
              <span>Rejected: <span className="text-red-400">{user.rejectedCount ?? 0}</span></span>
              <span>Trust: <span className="text-blue-400">{user.trustScore?.toFixed(1) ?? '—'}</span></span>
              {user.banReason && <span>Ban reason: <span className="text-red-300">{user.banReason}</span></span>}
            </div>
            {user.reasons && user.reasons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {user.reasons.map((r, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded text-[10px] border ${
                    r.delta > 0 ? 'border-red-500/30 text-red-300 bg-red-900/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-900/10'
                  }`}>
                    {r.delta > 0 ? '+' : ''}{r.delta} {r.reason}
                  </span>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Section table ─────────────────────────────────────────────────────────────

const HEADERS: Record<Section, string[]> = {
  overview:     [],
  active:       ['User', 'Role', 'Activity', 'Last Active', 'Pages', 'Submissions', 'Approved', 'Status', ''],
  contributors: ['User', 'Role', 'Approved', 'Nodes/Edges/Sources', 'Approval %', 'Trust', 'Status', ''],
  suspicious:   ['User', 'Role', 'Risk Level', 'Score', 'Rejection %', 'Account Age', 'Status', ''],
  bots:         ['User', 'Role', 'Risk Level', 'Bot Score', 'Rejection %', 'Account Age', 'Status', ''],
  spam:         ['User', 'Role', 'Risk Level', 'Spam Score', 'Rejection %', 'Account Age', 'Status', ''],
  banned:       ['User', 'Role', 'Status', 'Reason', 'Action Date', 'Mod Status', ''],
};

function SectionTable({ section, users, onAction, loading }: {
  section: Section;
  users: UserRow[];
  onAction: (userId: string, action: string, payload: Record<string, unknown>) => Promise<void>;
  loading: boolean;
}) {
  if (loading) return (
    <div className="flex justify-center py-12">
      <RefreshCw size={20} className="animate-spin text-purple-400" />
    </div>
  );

  if (!users.length) return (
    <p className="text-xs text-slate-500 text-center py-12">No users in this category.</p>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/50">
            {HEADERS[section].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <UserTableRow key={u.id} user={u} section={section} onAction={onAction} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function UserIntelligenceDashboard() {
  const [section,    setSection]   = useState<Section>('overview');
  const [overview,   setOverview]  = useState<OverviewData | null>(null);
  const [users,      setUsers]     = useState<UserRow[]>([]);
  const [loading,    setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]      = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const ENDPOINT: Record<Section, string> = {
    overview:     '/api/super-admin/user-intelligence',
    active:       '/api/super-admin/user-intelligence/active',
    contributors: '/api/super-admin/user-intelligence/contributors',
    suspicious:   '/api/super-admin/user-intelligence/suspicious',
    bots:         '/api/super-admin/user-intelligence/bots',
    spam:         '/api/super-admin/user-intelligence/spam',
    banned:       '/api/super-admin/user-intelligence/banned',
  };

  const load = useCallback(async (sec: Section, pg = 1, refresh = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '50' });
      if (refresh && sec === 'suspicious') params.set('refresh', 'true');
      const url = sec === 'overview' ? ENDPOINT[sec] : `${ENDPOINT[sec]}?${params}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (sec === 'overview') {
        setOverview(data);
      } else {
        setUsers(Array.isArray(data) ? data : []);
        setTotalCount(Number(res.headers.get('X-Total-Count') ?? data.length));
        setTotalPages(Number(res.headers.get('X-Total-Pages') ?? 1));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setUsers([]);
    setPage(1);
    setTotalPages(1);
    setTotalCount(0);
    load(section, 1);
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(section, page, true);
    setRefreshing(false);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    load(section, newPage);
  };

  const handleAction = async (userId: string, action: string, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/super-admin/users/${userId}/${action}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (res.ok) await load(section);
  };

  const tabs: { id: Section; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'overview',     label: 'Overview',      icon: <Shield size={12} />,        color: 'text-purple-400' },
    { id: 'active',       label: 'Most Active',   icon: <Activity size={12} />,      color: 'text-cyan-400' },
    { id: 'contributors', label: 'Contributors',  icon: <Award size={12} />,         color: 'text-emerald-400' },
    { id: 'suspicious',   label: 'Suspicious',    icon: <AlertTriangle size={12} />, color: 'text-orange-400' },
    { id: 'bots',         label: 'Possible Bots', icon: <Bot size={12} />,           color: 'text-red-400' },
    { id: 'spam',         label: 'Spam Users',    icon: <ShieldOff size={12} />,     color: 'text-red-400' },
    { id: 'banned',       label: 'Banned',        icon: <Ban size={12} />,           color: 'text-red-500' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
              section === t.id
                ? 'bg-purple-900/40 border-purple-500/40 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
            }`}>
            <span className={section === t.id ? t.color : ''}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button onClick={handleRefresh} disabled={refreshing}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 transition-all">
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={section}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}>

          {/* ── Overview ── */}
          {section === 'overview' && (
            <div className="flex flex-col gap-4">
              {/* Alerts */}
              {overview?.alerts && overview.alerts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {overview.alerts.map((a, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                      a.severity === 'critical' ? 'bg-red-900/20 border-red-500/30 text-red-300' :
                      a.severity === 'warning'  ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' :
                      'bg-blue-900/20 border-blue-500/30 text-blue-300'
                    }`}>
                      <AlertOctagon size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{a.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!overview || !overview.alerts || overview.alerts.length === 0) && !loading && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-900/10 text-xs text-emerald-400">
                  <CheckCircle size={14} /> No active alerts — platform looks healthy.
                </div>
              )}

              {/* Summary grid */}
              {overview?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Users',     value: overview.summary.totalUsers,     icon: <Users size={14} />,         color: 'text-white' },
                    { label: 'New (24h)',        value: overview.summary.newSignups24h,  icon: <TrendingUp size={14} />,    color: 'text-cyan-400' },
                    { label: 'Banned',           value: overview.summary.bannedCount,    icon: <Ban size={14} />,           color: 'text-red-400' },
                    { label: 'Suspended',        value: overview.summary.suspendedCount, icon: <Clock size={14} />,         color: 'text-orange-400' },
                    { label: 'Watched',          value: overview.summary.watchCount,     icon: <Eye size={14} />,           color: 'text-yellow-400' },
                    { label: 'High Risk',        value: overview.summary.highRiskCount,  icon: <AlertTriangle size={14} />, color: 'text-red-400' },
                    { label: 'Events / hour',    value: overview.summary.recentEvents1h, icon: <Zap size={14} />,           color: 'text-purple-400' },
                    { label: 'Alerts',           value: overview.alerts?.length ?? 0,    icon: <AlertOctagon size={14} />,  color: overview.alerts?.length ? 'text-yellow-400' : 'text-emerald-400' },
                  ].map(card => (
                    <div key={card.label} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                      <div className={`flex items-center gap-1.5 mb-2 text-xs text-slate-500`}>
                        <span className={card.color}>{card.icon}</span>
                        {card.label}
                      </div>
                      <p className={`text-2xl font-bold ${card.color}`}>{card.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex justify-center py-8">
                  <RefreshCw size={20} className="animate-spin text-purple-400" />
                </div>
              )}

              {/* Quick actions to jump to sections */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'suspicious' as Section, label: 'Review Suspicious', icon: <AlertTriangle size={12} />, color: 'text-orange-400' },
                  { id: 'bots'       as Section, label: 'Check Bot Activity', icon: <Bot size={12} />,          color: 'text-red-400' },
                  { id: 'banned'     as Section, label: 'Manage Bans',        icon: <Ban size={12} />,          color: 'text-red-500' },
                ].map(a => (
                  <button key={a.id} onClick={() => setSection(a.id)}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition-all">
                    <span className={a.color}>{a.icon}</span> {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Data sections ── */}
          {section !== 'overview' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">
                  {users.length} user{users.length !== 1 ? 's' : ''} shown
                  {(section === 'suspicious' || section === 'bots' || section === 'spam') &&
                    ' · Scores are calculated on demand and cached for 30 minutes'}
                </p>
                {section === 'suspicious' && (
                  <button onClick={() => load(section, page, true)} disabled={loading}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                    <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Recalculate all scores
                  </button>
                )}
              </div>
              <SectionTable section={section} users={users} onAction={handleAction} loading={loading} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-purple-900/20">
                  <p className="text-[10px] text-slate-500">
                    {totalCount} total · page {page} of {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1 || loading}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-purple-900/20 hover:border-purple-500/30 transition-all"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages || loading}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-purple-900/20 hover:border-purple-500/30 transition-all"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
