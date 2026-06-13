'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trash2, RefreshCw, Play, CheckCircle, Clock, AlertTriangle, XCircle,
  Archive, Eye, Shield, Ban, ChevronDown, ChevronUp, Filter, Search,
  Plus, X, Zap, Database, BookOpen,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CleanupRun {
  id: string; mode: string; status: string; startedAt: string;
  completedAt: string | null; triggeredBy: string;
  candidatesScanned: number; candidatesSentToAI: number;
  keepCount: number; reviewCount: number;
  archiveCandidateCount: number; deleteCandidateCount: number;
  blacklistCandidateCount: number; estimatedCost: number;
  _count?: { findings: number };
}

interface Finding {
  id: string; auditRunId: string; itemType: string; itemId: string;
  title: string; classification: string; relevanceScore: number;
  confidence: number; reasons: string[]; risksIfKept: string[];
  risksIfDeleted: string[]; recommendedAction: string;
  blacklistSuggestion: string | null; status: string;
  createdAt: string; resolvedBy: string | null; resolvedAt: string | null;
}

interface ListEntry { id: string; type: string; value: string; reason: string; createdBy: string; createdAt: string; }

interface DeleteModalState {
  open: boolean; ids: string[]; confirmation: string; reason: string; loading: boolean;
}

type Tab = 'findings' | 'blacklist' | 'whitelist' | 'runs';
type FindingFilter = 'all' | 'node' | 'source' | 'archive' | 'delete' | 'blacklist_candidate';
type RunMode = 'quick' | 'full';

// ── Constants ─────────────────────────────────────────────────────────────────

const CLASS_COLOR: Record<string, string> = {
  KEEP:               'bg-green-900/30 text-green-400 border-green-500/30',
  REVIEW:             'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
  ARCHIVE_CANDIDATE:  'bg-orange-900/30 text-orange-400 border-orange-500/30',
  DELETE_CANDIDATE:   'bg-red-900/30 text-red-400 border-red-500/30',
  BLACKLIST_CANDIDATE:'bg-red-950/40 text-red-500 border-red-600/30',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle size={13} className="text-green-400" />,
  running:   <RefreshCw size={13} className="text-blue-400 animate-spin" />,
  pending:   <Clock size={13} className="text-yellow-400" />,
  failed:    <XCircle size={13} className="text-red-400" />,
};

const STATUS_LABEL: Record<string, string> = {
  completed: 'text-green-400',
  running:   'text-blue-400',
  pending:   'text-yellow-400',
  failed:    'text-red-400',
};

const BLACKLIST_TYPES = ['title', 'keyword', 'domain', 'category', 'entity_type'];

// ── Helper ────────────────────────────────────────────────────────────────────

function badge(text: string, cls: string) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${cls}`}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

function toArr(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  return [];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ExpandRow({ finding, onAction, onSelect, selected }: {
  finding: Finding;
  onAction: (id: string, action: string, opts?: Record<string, string>) => void;
  onSelect: (id: string, checked: boolean) => void;
  selected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [blType, setBlType] = useState('title');
  const [applyLoading, setApplyLoading] = useState<string | null>(null);

  const act = async (action: string, opts?: Record<string, string>) => {
    setApplyLoading(action);
    await onAction(finding.id, action, opts);
    setApplyLoading(null);
  };

  const reasons     = toArr(finding.reasons);
  const risksKept   = toArr(finding.risksIfKept);
  const risksDelete = toArr(finding.risksIfDeleted);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect(finding.id, e.target.checked)}
          className="accent-purple-500"
        />
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
            finding.itemType === 'node' ? 'bg-blue-900/40 text-blue-400' : 'bg-teal-900/40 text-teal-400'
          }`}>
            {finding.itemType}
          </span>
          <span className="text-sm text-white truncate flex-1">{finding.title}</span>
          <span className="text-xs text-slate-500 shrink-0">{finding.relevanceScore}/100</span>
          {badge(finding.classification, CLASS_COLOR[finding.classification] ?? 'bg-slate-800 text-slate-400 border-slate-700')}
          <span className="text-xs text-slate-600">{Math.round(finding.confidence * 100)}%</span>
          {open ? <ChevronUp size={13} className="text-slate-500 shrink-0" /> : <ChevronDown size={13} className="text-slate-500 shrink-0" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-800 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {reasons.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Reasons Flagged</p>
                <ul className="space-y-0.5">
                  {reasons.map((r, i) => <li key={i} className="text-xs text-slate-400 flex gap-1.5"><span className="text-yellow-500 mt-0.5">•</span>{r}</li>)}
                </ul>
              </div>
            )}
            <div className="space-y-3">
              {risksKept.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Risks if Kept</p>
                  <ul className="space-y-0.5">
                    {risksKept.map((r, i) => <li key={i} className="text-xs text-red-400">{r}</li>)}
                  </ul>
                </div>
              )}
              {risksDelete.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Risks if Deleted</p>
                  <ul className="space-y-0.5">
                    {risksDelete.map((r, i) => <li key={i} className="text-xs text-orange-400">{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {finding.recommendedAction && (
            <p className="text-xs text-slate-400">
              <span className="text-slate-500 font-semibold">Recommended: </span>{finding.recommendedAction}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
            <button
              onClick={() => act('keep')}
              disabled={!!applyLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/30 hover:bg-green-800/40 text-green-400 text-xs font-semibold border border-green-600/20 disabled:opacity-40 transition-all"
            >
              <CheckCircle size={12} />
              {applyLoading === 'keep' ? '…' : 'Keep'}
            </button>
            <button
              onClick={() => act('archive')}
              disabled={!!applyLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-900/30 hover:bg-orange-800/40 text-orange-400 text-xs font-semibold border border-orange-600/20 disabled:opacity-40 transition-all"
            >
              <Archive size={12} />
              {applyLoading === 'archive' ? '…' : 'Archive'}
            </button>
            <button
              onClick={() => act('review')}
              disabled={!!applyLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-400 text-xs font-semibold border border-yellow-600/20 disabled:opacity-40 transition-all"
            >
              <Eye size={12} />
              {applyLoading === 'review' ? '…' : 'Send to Review'}
            </button>
            <div className="flex items-center gap-1">
              <select
                value={blType}
                onChange={e => setBlType(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5"
              >
                {BLACKLIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={() => act('blacklist', { blacklistType: blType })}
                disabled={!!applyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-600/30 disabled:opacity-40 transition-all"
              >
                <Ban size={12} />
                {applyLoading === 'blacklist' ? '…' : 'Blacklist'}
              </button>
            </div>
            <button
              onClick={() => act('ignore')}
              disabled={!!applyLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-500 text-xs font-semibold border border-slate-700 disabled:opacity-40 transition-all ml-auto"
            >
              {applyLoading === 'ignore' ? '…' : 'Ignore'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── List entry row (blacklist/whitelist) ──────────────────────────────────────

function ListEntryRow({ entry, onDelete }: { entry: ListEntry; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg">
      <span className="text-[10px] font-bold uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{entry.type}</span>
      <span className="text-sm text-white flex-1 truncate">{entry.value}</span>
      <span className="text-xs text-slate-500 truncate max-w-[200px]">{entry.reason}</span>
      <button onClick={onDelete} className="p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-all">
        <X size={13} />
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CleanupDashboard({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab]               = useState<Tab>('findings');
  const [findingFilter, setFF]      = useState<FindingFilter>('all');
  const [search, setSearch]         = useState('');
  const [findings, setFindings]     = useState<Finding[]>([]);
  const [runs, setRuns]             = useState<CleanupRun[]>([]);
  const [blacklist, setBlacklist]   = useState<ListEntry[]>([]);
  const [whitelist, setWhitelist]   = useState<ListEntry[]>([]);
  const [selectedIds, setSelected]  = useState<Set<string>>(new Set());
  const [triggerMode, setTrigMode]  = useState<'nodes' | 'sources'>('nodes');
  const [runMode, setRunMode]       = useState<RunMode>('quick');
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [dryRunData, setDryData]    = useState<{ candidatesScanned: number; candidatesSentToAI: number; estimatedCost: number; preview: {id:string;title:string;flagReasons:string[]}[] } | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [loadingFindings, setLF]    = useState(false);
  const [loadingRuns, setLR]        = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [expandedRun, setExpandRun] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    open: false, ids: [], confirmation: '', reason: '', loading: false,
  });
  const [newBl, setNewBl] = useState({ type: 'title', value: '', reason: '' });
  const [newWl, setNewWl] = useState({ type: 'keyword', value: '', reason: '' });

  // ── Load helpers ───────────────────────────────────────────────────────────

  const loadFindings = useCallback(async () => {
    setLF(true);
    try {
      const res = await fetch('/api/super-admin/cleanup-ai/findings?status=open');
      if (!res.ok) throw new Error(await res.text());
      setFindings(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load findings'); }
    finally { setLF(false); }
  }, []);

  const loadRuns = useCallback(async () => {
    setLR(true);
    try {
      const res = await fetch('/api/super-admin/cleanup-ai/runs');
      if (!res.ok) throw new Error(await res.text());
      setRuns(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load runs'); }
    finally { setLR(false); }
  }, []);

  const loadBlacklist = useCallback(async () => {
    const res = await fetch('/api/super-admin/discovery-blacklist');
    if (res.ok) setBlacklist(await res.json());
  }, []);

  const loadWhitelist = useCallback(async () => {
    const res = await fetch('/api/super-admin/discovery-whitelist');
    if (res.ok) setWhitelist(await res.json());
  }, []);

  useEffect(() => { loadFindings(); loadRuns(); loadBlacklist(); loadWhitelist(); }, [loadFindings, loadRuns, loadBlacklist, loadWhitelist]);

  // ── Derived findings ───────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    let list = findings;
    if (findingFilter === 'node')              list = list.filter(f => f.itemType === 'node');
    else if (findingFilter === 'source')       list = list.filter(f => f.itemType === 'source');
    else if (findingFilter === 'archive')      list = list.filter(f => f.classification === 'ARCHIVE_CANDIDATE');
    else if (findingFilter === 'delete')       list = list.filter(f => f.classification === 'DELETE_CANDIDATE');
    else if (findingFilter === 'blacklist_candidate') list = list.filter(f => f.classification === 'BLACKLIST_CANDIDATE');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.title.toLowerCase().includes(q) || f.recommendedAction.toLowerCase().includes(q));
    }
    return list;
  }, [findings, findingFilter, search]);

  const counts = useMemo(() => ({
    all:       findings.length,
    node:      findings.filter(f => f.itemType === 'node').length,
    source:    findings.filter(f => f.itemType === 'source').length,
    archive:   findings.filter(f => f.classification === 'ARCHIVE_CANDIDATE').length,
    delete:    findings.filter(f => f.classification === 'DELETE_CANDIDATE').length,
    blacklist: findings.filter(f => f.classification === 'BLACKLIST_CANDIDATE').length,
  }), [findings]);

  // ── Trigger run ────────────────────────────────────────────────────────────

  const triggerDryRun = async () => {
    setTriggering(true); setError(null);
    try {
      const ep = triggerMode === 'nodes'
        ? '/api/super-admin/cleanup-ai/analyze-nodes'
        : '/api/super-admin/cleanup-ai/analyze-sources';
      const res = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: runMode, dryRun: true }) });
      if (!res.ok) throw new Error(await res.text());
      setDryData(await res.json());
      setDryRunOpen(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setTriggering(false); }
  };

  const triggerRun = async () => {
    setTriggering(true); setError(null); setDryRunOpen(false);
    try {
      const ep = triggerMode === 'nodes'
        ? '/api/super-admin/cleanup-ai/analyze-nodes'
        : '/api/super-admin/cleanup-ai/analyze-sources';
      const res = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: runMode }) });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
      }
      await loadRuns(); await loadFindings();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to trigger run'); }
    finally { setTriggering(false); }
  };

  // ── Per-finding action ─────────────────────────────────────────────────────

  const applyAction = useCallback(async (findingId: string, action: string, opts?: Record<string, string>) => {
    if (action === 'ignore') {
      await fetch(`/api/super-admin/cleanup-ai/findings/${findingId}/ignore`, { method: 'POST' });
      setFindings(prev => prev.filter(f => f.id !== findingId));
      return;
    }
    const res = await fetch(`/api/super-admin/cleanup-ai/findings/${findingId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...opts }),
    });
    if (!res.ok) {
      const txt = await res.text();
      setError(`Action failed: ${txt}`);
      return;
    }
    setFindings(prev => prev.filter(f => f.id !== findingId));
    if (action === 'blacklist') await loadBlacklist();
  }, [loadBlacklist]);

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const bulkAction = async (action: string) => {
    if (action === 'delete') {
      setDeleteModal({ open: true, ids: [...selectedIds], confirmation: '', reason: '', loading: false });
      return;
    }
    const res = await fetch('/api/super-admin/cleanup-ai/findings/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds], action }),
    });
    if (!res.ok) { setError(`Bulk action failed: ${await res.text()}`); return; }
    setSelected(new Set());
    await loadFindings();
    if (action === 'blacklist') await loadBlacklist();
  };

  const confirmDelete = async () => {
    setDeleteModal(m => ({ ...m, loading: true }));
    const res = await fetch('/api/super-admin/cleanup-ai/findings/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: deleteModal.ids,
        action: 'delete',
        confirmation: deleteModal.confirmation.trim().toUpperCase(),
        reason: deleteModal.reason,
      }),
    });
    if (!res.ok) {
      setError(`Delete failed: ${await res.text()}`);
      setDeleteModal(m => ({ ...m, loading: false }));
      return;
    }
    setDeleteModal({ open: false, ids: [], confirmation: '', reason: '', loading: false });
    setSelected(new Set());
    await loadFindings();
  };

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === displayed.length) { setSelected(new Set()); }
    else { setSelected(new Set(displayed.map(f => f.id))); }
  };

  // ── Blacklist/Whitelist CRUD ───────────────────────────────────────────────

  const addToList = async (isBlacklist: boolean) => {
    const entry = isBlacklist ? newBl : newWl;
    if (!entry.value.trim() || !entry.reason.trim()) return;
    const ep = isBlacklist ? '/api/super-admin/discovery-blacklist' : '/api/super-admin/discovery-whitelist';
    const res = await fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      isBlacklist ? setNewBl({ type: 'title', value: '', reason: '' }) : setNewWl({ type: 'keyword', value: '', reason: '' });
      isBlacklist ? await loadBlacklist() : await loadWhitelist();
    }
  };

  const removeFromList = async (isBlacklist: boolean, id: string) => {
    const ep = isBlacklist ? `/api/super-admin/discovery-blacklist/${id}` : `/api/super-admin/discovery-whitelist/${id}`;
    const res = await fetch(ep, { method: 'DELETE' });
    if (res.ok) { isBlacklist ? await loadBlacklist() : await loadWhitelist(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
      tab === t ? 'bg-purple-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">AI Cleanup Intelligence</h1>
          <p className="text-xs text-slate-500 mt-0.5">Signed in as {adminEmail}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <select
              value={triggerMode}
              onChange={e => setTrigMode(e.target.value as 'nodes' | 'sources')}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
            >
              <option value="nodes">Analyze Nodes</option>
              <option value="sources">Analyze Sources</option>
            </select>
            <select
              value={runMode}
              onChange={e => setRunMode(e.target.value as RunMode)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
            >
              <option value="quick">Quick (top 20)</option>
              <option value="full">Full (max 50/100)</option>
            </select>
            <button
              onClick={triggerDryRun}
              disabled={triggering}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold transition-all"
            >
              <Zap size={12} />
              {triggering ? '…' : 'Dry Run'}
            </button>
            <button
              onClick={triggerRun}
              disabled={triggering}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-bold transition-all"
            >
              <Play size={12} />
              {triggering ? 'Running…' : 'Run Audit'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-xs">
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={13} /></button>
        </div>
      )}

      {/* ── Dry Run Preview Modal ── */}
      {dryRunOpen && dryRunData && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Dry Run Preview</h2>
            <button onClick={() => setDryRunOpen(false)}><X size={14} className="text-slate-500" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-center">
            <div className="bg-slate-800 rounded-lg p-3"><div className="text-lg font-bold text-white">{dryRunData.candidatesScanned}</div><div className="text-slate-500">Candidates Scanned</div></div>
            <div className="bg-slate-800 rounded-lg p-3"><div className="text-lg font-bold text-yellow-400">{dryRunData.candidatesSentToAI}</div><div className="text-slate-500">Sent to Claude</div></div>
            <div className="bg-slate-800 rounded-lg p-3"><div className="text-lg font-bold text-green-400">${dryRunData.estimatedCost.toFixed(4)}</div><div className="text-slate-500">Est. Cost</div></div>
          </div>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {dryRunData.preview.map(p => (
              <div key={p.id} className="px-3 py-1.5 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-white">{p.title}</p>
                <p className="text-[10px] text-slate-500">{p.flagReasons.join(' · ')}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setDryRunOpen(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
            <button
              onClick={triggerRun}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-bold"
            >
              <Play size={12} />
              {triggering ? 'Running…' : 'Confirm & Run'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-3">
        <button onClick={() => setTab('findings')} className={tabCls('findings')}>
          Findings <span className="ml-1 text-slate-500">{counts.all}</span>
        </button>
        <button onClick={() => setTab('blacklist')} className={tabCls('blacklist')}>
          Blacklist <span className="ml-1 text-slate-500">{blacklist.length}</span>
        </button>
        <button onClick={() => setTab('whitelist')} className={tabCls('whitelist')}>
          Whitelist <span className="ml-1 text-slate-500">{whitelist.length}</span>
        </button>
        <button onClick={() => setTab('runs')} className={tabCls('runs')}>
          Past Runs <span className="ml-1 text-slate-500">{runs.length}</span>
        </button>
        <button onClick={() => { loadFindings(); loadRuns(); }} className="ml-auto p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all">
          <RefreshCw size={13} className={loadingFindings || loadingRuns ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ═══════════════════ FINDINGS TAB ═══════════════════ */}
      {tab === 'findings' && (
        <div className="space-y-4">
          {/* Sub-filters */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all',       label: 'All',       count: counts.all },
              { id: 'node',      label: 'Nodes',     count: counts.node },
              { id: 'source',    label: 'Sources',   count: counts.source },
              { id: 'archive',   label: 'Archive',   count: counts.archive },
              { id: 'delete',    label: 'Delete',    count: counts.delete },
              { id: 'blacklist_candidate', label: 'Blacklist', count: counts.blacklist },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFF(f.id as FindingFilter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  findingFilter === f.id
                    ? 'bg-purple-700/50 text-purple-300 border border-purple-600/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {f.label} <span className="ml-1 opacity-60">{f.count}</span>
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-auto bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <Search size={12} className="text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search findings…"
                className="bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none w-36"
              />
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/20 border border-purple-600/30 rounded-xl">
              <span className="text-xs text-purple-300 font-semibold">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => bulkAction('archive')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-900/30 hover:bg-orange-800/40 text-orange-400 text-xs font-semibold border border-orange-600/20">
                  <Archive size={11} /> Archive
                </button>
                <button onClick={() => bulkAction('review')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-400 text-xs font-semibold border border-yellow-600/20">
                  <Eye size={11} /> Send to Review
                </button>
                <button onClick={() => bulkAction('blacklist')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-600/30">
                  <Ban size={11} /> Blacklist
                </button>
                <button onClick={() => bulkAction('ignore')} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-500 text-xs font-semibold border border-slate-700">
                  Ignore
                </button>
                <button
                  onClick={() => bulkAction('delete')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-800/40 text-red-400 text-xs font-bold border border-red-600/20 ml-2"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 hover:text-white">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Select-all row */}
          {displayed.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1">
              <input
                type="checkbox"
                checked={selectedIds.size === displayed.length && displayed.length > 0}
                onChange={selectAll}
                className="accent-purple-500"
              />
              <span className="text-[10px] text-slate-500">Select all {displayed.length} visible findings</span>
            </div>
          )}

          {/* Findings list */}
          <div className="space-y-2">
            {loadingFindings && <p className="text-xs text-slate-500 text-center py-8">Loading findings…</p>}
            {!loadingFindings && displayed.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-8">No open findings. Run an audit above to scan the archive.</p>
            )}
            {displayed.map(f => (
              <ExpandRow
                key={f.id}
                finding={f}
                onAction={applyAction}
                onSelect={toggleSelect}
                selected={selectedIds.has(f.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════ BLACKLIST TAB ═══════════════════ */}
      {tab === 'blacklist' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase">Add to Blacklist</h3>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">Type</label>
                <select
                  value={newBl.type}
                  onChange={e => setNewBl(b => ({ ...b, type: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
                >
                  {BLACKLIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-slate-500">Value</label>
                <input
                  value={newBl.value}
                  onChange={e => setNewBl(b => ({ ...b, value: e.target.value }))}
                  placeholder="e.g. cartoon character"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 placeholder-slate-600"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-slate-500">Reason</label>
                <input
                  value={newBl.reason}
                  onChange={e => setNewBl(b => ({ ...b, reason: e.target.value }))}
                  placeholder="Why block this?"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 placeholder-slate-600"
                />
              </div>
              <button
                onClick={() => addToList(true)}
                disabled={!newBl.value.trim() || !newBl.reason.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-900/40 hover:bg-red-800/50 disabled:opacity-40 text-red-300 text-xs font-bold border border-red-700/30"
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {blacklist.length === 0 && <p className="text-xs text-slate-600 text-center py-6">No blacklist entries yet.</p>}
            {blacklist.map(e => (
              <ListEntryRow key={e.id} entry={e} onDelete={() => removeFromList(true, e.id)} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════ WHITELIST TAB ═══════════════════ */}
      {tab === 'whitelist' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase">Add to Whitelist</h3>
            <p className="text-[10px] text-slate-600">Whitelisted keywords protect valid unusual topics (mythology, folklore, cryptids) from false-positive flagging.</p>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">Type</label>
                <select
                  value={newWl.type}
                  onChange={e => setNewWl(w => ({ ...w, type: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
                >
                  {BLACKLIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-slate-500">Value</label>
                <input
                  value={newWl.value}
                  onChange={e => setNewWl(w => ({ ...w, value: e.target.value }))}
                  placeholder="e.g. mythology"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 placeholder-slate-600"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-slate-500">Reason</label>
                <input
                  value={newWl.reason}
                  onChange={e => setNewWl(w => ({ ...w, reason: e.target.value }))}
                  placeholder="Why protect this?"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 placeholder-slate-600"
                />
              </div>
              <button
                onClick={() => addToList(false)}
                disabled={!newWl.value.trim() || !newWl.reason.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-900/40 hover:bg-green-800/50 disabled:opacity-40 text-green-300 text-xs font-bold border border-green-700/30"
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {whitelist.length === 0 && <p className="text-xs text-slate-600 text-center py-6">No whitelist entries yet.</p>}
            {whitelist.map(e => (
              <ListEntryRow key={e.id} entry={e} onDelete={() => removeFromList(false, e.id)} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════ RUNS TAB ═══════════════════ */}
      {tab === 'runs' && (
        <div className="space-y-2">
          {runs.length === 0 && !loadingRuns && (
            <p className="text-xs text-slate-600 text-center py-8">No audit runs yet. Trigger one above.</p>
          )}
          {runs.map(run => (
            <div key={run.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandRun(expandedRun === run.id ? null : run.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  {STATUS_ICON[run.status] ?? <Clock size={13} className="text-slate-500" />}
                  <div className="text-left">
                    <span className="text-sm text-white font-medium capitalize">{run.mode} audit</span>
                    <span className={`ml-2 text-xs font-semibold ${STATUS_LABEL[run.status] ?? 'text-slate-500'}`}>
                      {run.status}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500">{run.candidatesScanned} scanned</span>
                  <span className="text-green-400">{run.keepCount} keep</span>
                  <span className="text-yellow-400">{run.reviewCount} review</span>
                  <span className="text-orange-400">{run.archiveCandidateCount} archive</span>
                  <span className="text-red-400">{run.deleteCandidateCount} delete</span>
                  <span className="text-slate-600">${run.estimatedCost.toFixed(3)}</span>
                  {expandedRun === run.id ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                </div>
              </button>
              {expandedRun === run.id && (
                <div className="border-t border-slate-800 px-4 py-3 space-y-3">
                  {run.status === 'failed' && (
                    <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-xs text-red-300">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Run failed — all AI analyses errored</p>
                        <p className="text-red-400">Most likely cause: <span className="font-mono">ANTHROPIC_API_KEY</span> is not set in Railway environment variables. Go to Railway → your service → Variables and add it.</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-2 text-xs text-center">
                    {[
                      { label: 'Keep',      value: run.keepCount,               color: 'text-green-400' },
                      { label: 'Review',    value: run.reviewCount,             color: 'text-yellow-400' },
                      { label: 'Archive',   value: run.archiveCandidateCount,   color: 'text-orange-400' },
                      { label: 'Delete',    value: run.deleteCandidateCount,    color: 'text-red-400' },
                      { label: 'Blacklist', value: run.blacklistCandidateCount, color: 'text-red-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-slate-800 rounded-lg p-2">
                        <div className={`text-base font-bold ${color}`}>{value}</div>
                        <div className="text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-600 text-right">
                    {run.completedAt && `Completed ${new Date(run.completedAt).toLocaleString()}`}
                    {' · '}{run._count?.findings ?? 0} findings stored
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ DELETE CONFIRMATION MODAL ═══════════════════ */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 border border-red-800/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-900/40 border border-red-600/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Confirm Hard Delete</h2>
                <p className="text-xs text-slate-500">{deleteModal.ids.length} item(s) will be permanently deleted</p>
              </div>
            </div>

            <div className="bg-red-950/30 border border-red-700/30 rounded-lg p-3 text-xs text-red-300 space-y-1">
              <p className="font-semibold">This is irreversible.</p>
              <p>All related edges, source links, tags, and embeddings will also be deleted via cascade.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Reason for deletion</label>
              <textarea
                value={deleteModal.reason}
                onChange={e => setDeleteModal(m => ({ ...m, reason: e.target.value }))}
                placeholder="Explain why these items are being deleted…"
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 placeholder-slate-600 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm
              </label>
              <input
                value={deleteModal.confirmation}
                onChange={e => setDeleteModal(m => ({ ...m, confirmation: e.target.value }))}
                placeholder="DELETE"
                autoComplete="off"
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono placeholder-slate-600"
              />
              {deleteModal.reason.trim().length < 5 && deleteModal.confirmation.trim().toUpperCase() === 'DELETE' && (
                <p className="text-[10px] text-yellow-500 mt-1">Fill in the reason above (min 5 chars) to enable the button.</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setDeleteModal(m => ({ ...m, open: false }))}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteModal.confirmation.trim().toUpperCase() !== 'DELETE' || deleteModal.reason.trim().length < 5 || deleteModal.loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all"
              >
                <Trash2 size={12} />
                {deleteModal.loading ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
