'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, RefreshCw, CheckCircle, XCircle, Settings, AlertTriangle,
  ChevronDown, ChevronUp, Eye, RotateCcw, Wrench, Globe, Zap, Target, Search, X,
} from 'lucide-react';
import type {
  AuditRun, AuditFinding, AuditSettings, FindingType, FindingSeverity,
} from '@/lib/audit/types';
import { FINDING_LABELS, SEVERITY_COLOR, DEFAULT_AUDIT_SETTINGS } from '@/lib/audit/types';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const SEV_ORDER: Record<FindingSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

type AuditMode = 'complete' | 'quick' | 'node';

const AUDIT_MODES: { id: AuditMode; label: string; tag: string; desc: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  {
    id: 'complete',
    label: 'Complete Audit',
    tag: 'Full DB + AI',
    desc: 'All rule checks plus AI analysis across every published node. Most thorough — takes 30–90 s.',
    Icon: Globe,
  },
  {
    id: 'quick',
    label: 'Quick Audit',
    tag: 'Rules only',
    desc: 'Orphans, stale edges, missing fields, duplicates — no AI. Fast, good for routine checks.',
    Icon: Zap,
  },
  {
    id: 'node',
    label: 'Node Audit',
    tag: 'Single node',
    desc: 'Deep-audit one specific node: quality, sources, orphan status, duplicates, AI review.',
    Icon: Target,
  },
];

function SeverityBadge({ s }: { s: FindingSeverity }) {
  const c = SEVERITY_COLOR[s] ?? '#64748b';
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: c + '22', color: c, border: `1px solid ${c}55` }}
    >
      {s}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'bg-slate-700 text-slate-300',
    approved: 'bg-blue-900/50 text-blue-300',
    applied:  'bg-green-900/50 text-green-300',
    denied:   'bg-red-900/40 text-red-400',
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${map[status] ?? 'bg-slate-700 text-slate-400'}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ─── Finding card ─────────────────────────────────────────────────────────────

function FindingCard({
  finding,
  onAction,
}: {
  finding: AuditFinding;
  onAction: (id: string, action: 'approve' | 'deny') => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async (action: 'approve' | 'deny') => {
    setBusy(true);
    await onAction(finding.id, action);
    setBusy(false);
  };

  const afterState  = finding.afterState  as Record<string, unknown>;
  const beforeState = finding.beforeState as Record<string, unknown>;

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-800/60 overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-700/40 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <SeverityBadge s={finding.severity as FindingSeverity} />
            <span className="text-[10px] text-slate-400 font-medium bg-slate-700/60 px-1.5 py-0.5 rounded">
              {FINDING_LABELS[finding.type as FindingType] ?? finding.type}
            </span>
            <StatusBadge status={finding.status} />
            {finding.autoFixable && (
              <span className="text-[10px] text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Wrench size={9} /> AUTO-FIX
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-100 truncate">{finding.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{finding.description}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0 mt-1" />
               : <ChevronDown size={14} className="text-slate-400 flex-shrink-0 mt-1" />}
      </button>

      {open && (
        <div className="border-t border-slate-700 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-red-400 uppercase mb-1">Before</p>
              <pre className="text-[10px] text-slate-300 bg-slate-900/70 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {JSON.stringify(beforeState, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-green-400 uppercase mb-1">After (if approved)</p>
              <pre className="text-[10px] text-slate-300 bg-slate-900/70 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {JSON.stringify(afterState, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Reasoning</p>
            <p className="text-xs text-slate-300 bg-slate-900/50 rounded p-2">{finding.reasoning}</p>
          </div>

          {finding.applyError && (
            <p className="text-xs text-red-400 bg-red-900/20 rounded p-2">Apply error: {finding.applyError}</p>
          )}

          {finding.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handle('approve')}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700/40 hover:bg-green-700/70 text-green-300 text-xs font-semibold rounded transition-colors disabled:opacity-50"
              >
                <CheckCircle size={12} />
                {finding.autoFixable ? 'Approve & Apply Fix' : 'Approve'}
              </button>
              <button
                onClick={() => handle('deny')}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-800/40 hover:bg-red-800/70 text-red-300 text-xs font-semibold rounded transition-colors disabled:opacity-50"
              >
                <XCircle size={12} />
                Deny
              </button>
            </div>
          )}

          {finding.status === 'applied' && (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle size={12} />
              Fix applied to database
              {finding.appliedAt && <span className="text-slate-500">· {new Date(finding.appliedAt).toLocaleString()}</span>}
            </div>
          )}

          {finding.reviewedBy && finding.status !== 'applied' && (
            <p className="text-[10px] text-slate-500">
              Reviewed by {finding.reviewedBy}
              {finding.reviewedAt ? ` · ${new Date(finding.reviewedAt).toLocaleString()}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({
  settings,
  onSave,
}: {
  settings: AuditSettings;
  onSave: (s: AuditSettings) => Promise<void>;
}) {
  const [draft, setDraft]   = useState<AuditSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => { setDraft(settings); }, [settings]);

  const save = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const CHECK_LABELS: Record<keyof AuditSettings['checks'], string> = {
    orphans: 'Orphan nodes', staleEdges: 'Stale edges',
    weakEdges: 'Weak edges', missingFields: 'Incomplete nodes',
    duplicates: 'Possible duplicates', sourceQuality: 'Source quality',
    aiQuality: 'AI quality flags', categoryMismatch: 'Category mismatch (AI)',
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Checks to run</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(CHECK_LABELS) as (keyof AuditSettings['checks'])[]).map(key => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setDraft(d => ({ ...d, checks: { ...d.checks, [key]: !d.checks[key] } }))}
                className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${draft.checks[key] ? 'bg-cyan-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${draft.checks[key] ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-xs text-slate-300">{CHECK_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([
          ['weakEdgeThreshold',       'Weak edge threshold',       0.01, 1,   0.01],
          ['duplicateTitleThreshold', 'Duplicate title threshold',  0.3,  1,   0.01],
          ['maxNodesPerAiRun',        'Max nodes per AI run',       10,   500, 10  ],
          ['maxFindingsPerRun',       'Max findings per run',       10,   1000,10  ],
        ] as [keyof AuditSettings, string, number, number, number][]).map(([k, label, min, max, step]) => (
          <label key={String(k)} className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
            <input
              type="number" min={min} max={max} step={step}
              value={draft[k] as number}
              onChange={e => setDraft(d => ({ ...d, [k]: Number(e.target.value) }))}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </label>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Auto-approve on run</p>
        <div className="space-y-1.5">
          {([
            ['autoApproveOrphans',    'Orphan nodes'],
            ['autoApproveStaleEdges', 'Stale edges (unpublish automatically)'],
            ['autoApproveWeakEdges',  'Weak edges (very low < 15%)'],
          ] as [keyof AuditSettings, string][]).map(([k, label]) => (
            <label key={String(k)} className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setDraft(d => ({ ...d, [k]: !d[k] }))}
                className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${draft[k] ? 'bg-amber-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${draft[k] ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-xs text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-1.5 bg-cyan-700/50 hover:bg-cyan-700/80 text-cyan-300 text-xs font-semibold rounded transition-colors disabled:opacity-50"
      >
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function ArchiveAuditDashboard() {
  const [runs,      setRuns]     = useState<AuditRun[]>([]);
  const [activeRun, setActive]   = useState<AuditRun | null>(null);
  const [settings,  setSettings] = useState<AuditSettings>(DEFAULT_AUDIT_SETTINGS);
  const [tab,       setTab]      = useState<'findings' | 'settings'>('findings');
  const [running,   setRunning]  = useState(false);
  const [runError,  setRunError] = useState<string | null>(null);
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [sevFilter,   setSevFilter]   = useState('all');
  const [fixingAll,   setFixingAll]   = useState(false);
  const [fixAllResult, setFixAllResult] = useState<{ applied: number; failed: number } | null>(null);

  // ── Audit mode + node selector ──────────────────────────────────────────────
  const [auditMode,   setAuditMode]   = useState<AuditMode>('complete');
  const [nodeQuery,   setNodeQuery]   = useState('');
  const [nodeHits,    setNodeHits]    = useState<{ id: string; title: string }[]>([]);
  const [pickedNode,  setPickedNode]  = useState<{ id: string; title: string } | null>(null);
  const nodeInputRef = useRef<HTMLInputElement>(null);

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount    = useRef(0);
  const autoLoaded   = useRef(false);

  useEffect(() => {
    fetch('/api/admin/archive-audit/settings')
      .then(r => r.ok ? r.json() : null)
      .then((d: { settings?: AuditSettings } | null) => { if (d?.settings) setSettings(d.settings); })
      .catch(() => {});
    loadRuns();
  }, []);

  // Debounced node search
  useEffect(() => {
    if (auditMode !== 'node' || !nodeQuery.trim() || pickedNode) {
      setNodeHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search/quick?q=${encodeURIComponent(nodeQuery)}`).catch(() => null);
      if (r?.ok) {
        const d = await r.json() as { nodes: { id: string; title: string }[] };
        setNodeHits(d.nodes ?? []);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [nodeQuery, auditMode, pickedNode]);

  const loadRuns = useCallback(async () => {
    const r = await fetch('/api/admin/archive-audit/runs');
    if (!r.ok) return;
    const d = await r.json() as { runs?: AuditRun[] };
    const list = d.runs ?? [];
    setRuns(list);
    // Auto-load the most recent run on first visit so results are never blank
    if (!autoLoaded.current && list.length > 0) {
      autoLoaded.current = true;
      const recent = list[0];
      const res = await fetch(`/api/admin/archive-audit/${recent.id}`).catch(() => null);
      if (res?.ok) {
        const run = await res.json() as AuditRun;
        setActive(run);
      }
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollCount.current = 0;
    setRunning(false);
  }, []);

  const loadRun = useCallback(async (id: string) => {
    pollCount.current += 1;
    if (pollCount.current > 120) {
      stopPolling();
      setRunError('Audit timed out — the background worker may have been interrupted. Try again.');
      return;
    }
    const r = await fetch(`/api/admin/archive-audit/${id}`).catch(() => null);
    if (!r?.ok) return;
    const run = await r.json() as AuditRun;
    setActive(run);
    if (run.status !== 'running') {
      stopPolling();
    }
  }, [stopPolling]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, [stopPolling]);

  const startAudit = async () => {
    if (auditMode === 'node' && !pickedNode) return;
    setRunning(true);
    setActive(null);
    setRunError(null);

    const body: Record<string, unknown> = { mode: auditMode };
    if (auditMode === 'node' && pickedNode) {
      body.nodeId    = pickedNode.id;
      body.nodeTitle = pickedNode.title;
    }

    try {
      const r = await fetch('/api/admin/archive-audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({})) as { runId?: string; error?: string };

      if (!r.ok) {
        if (r.status === 409 && j.runId) {
          // Already running — poll it
          pollCount.current = 0;
          void loadRun(j.runId!);
          pollRef.current = setInterval(() => loadRun(j.runId!), 3000);
        } else {
          setRunError(j.error ?? `Server error ${r.status}`);
          stopPolling();
        }
        return;
      }

      // Run completed synchronously — load results
      if (j.runId) {
        pollCount.current = 0;
        await loadRun(j.runId);
      }
    } catch (err) {
      // Network error or connection dropped (e.g. proxy timeout) while audit was running.
      // The audit may have finished on the server — refresh the list and auto-display it.
      console.warn('[audit] POST connection error, checking for completed run:', err);
      await loadRuns();          // auto-loads most recent run via autoLoaded flag logic
    } finally {
      setRunning(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'deny') => {
    await fetch(`/api/admin/archive-audit/findings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (activeRun) await loadRun(activeRun.id);
  };

  const saveSettings = async (s: AuditSettings) => {
    await fetch('/api/admin/archive-audit/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    setSettings(s);
  };

  const fixAll = async () => {
    if (!activeRun) return;
    setFixingAll(true);
    setFixAllResult(null);
    try {
      const r = await fetch('/api/admin/archive-audit/fix-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: activeRun.id }),
      });
      const d = await r.json() as { applied: number; failed: number };
      setFixAllResult(d);
      await loadRun(activeRun.id);
    } finally {
      setFixingAll(false);
    }
  };

  const clearPickedNode = () => {
    setPickedNode(null);
    setNodeQuery('');
    setNodeHits([]);
    setTimeout(() => nodeInputRef.current?.focus(), 50);
  };

  const allTypes: FindingType[] = ['orphan','stale_edge','weak_edge','missing_fields','duplicate','source_quality','ai_quality','category_mismatch'];

  const findings = (activeRun?.findings ?? [])
    .filter(f => typeFilter === 'all' || f.type === typeFilter)
    .filter(f => sevFilter  === 'all' || f.severity === sevFilter)
    .sort((a, b) => SEV_ORDER[a.severity as FindingSeverity] - SEV_ORDER[b.severity as FindingSeverity]);

  const summary = activeRun?.summary as Record<string, unknown> | undefined;

  const runLabel = auditMode === 'complete' ? 'Complete Audit'
    : auditMode === 'quick' ? 'Quick Audit'
    : pickedNode ? `Node — ${pickedNode.title}` : 'Node Audit';

  const canRun = !running && (auditMode !== 'node' || !!pickedNode);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Archive Audit</h2>
          <p className="text-xs text-slate-400 mt-0.5">AI-powered consistency and quality analysis — approve changes before they apply</p>
        </div>
        <button onClick={loadRuns} className="p-1.5 hover:bg-slate-700 rounded transition-colors flex-shrink-0" title="Refresh">
          <RefreshCw size={13} className="text-slate-400" />
        </button>
      </div>

      {/* ── Audit Launcher ──────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 space-y-3">
        {/* Mode cards */}
        <div className="grid grid-cols-3 gap-2">
          {AUDIT_MODES.map(({ id, label, tag, desc, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setAuditMode(id);
                if (id !== 'node') { setPickedNode(null); setNodeQuery(''); setNodeHits([]); }
              }}
              className={`flex flex-col items-start gap-1.5 p-2.5 rounded-lg border text-left transition-all ${
                auditMode === id
                  ? 'border-cyan-500/60 bg-cyan-900/20'
                  : 'border-slate-600 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-700/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon size={14} className={auditMode === id ? 'text-cyan-400' : 'text-slate-500'} />
                <span className={`text-xs font-semibold ${auditMode === id ? 'text-cyan-200' : 'text-slate-300'}`}>{label}</span>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                auditMode === id ? 'bg-cyan-800/50 text-cyan-300' : 'bg-slate-700 text-slate-500'
              }`}>{tag}</span>
              <p className="text-[10px] text-slate-500 leading-snug">{desc}</p>
            </button>
          ))}
        </div>

        {/* Node search — only shown in node mode */}
        {auditMode === 'node' && (
          <div className="relative">
            {pickedNode ? (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-cyan-900/20 border border-cyan-500/40 rounded-lg">
                <Target size={13} className="text-cyan-400 flex-shrink-0" />
                <span className="text-xs text-cyan-200 flex-1 truncate font-medium">{pickedNode.title}</span>
                <button onClick={clearPickedNode} className="text-slate-400 hover:text-slate-200 flex-shrink-0">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus-within:border-cyan-500 transition-colors">
                  <Search size={13} className="text-slate-500 flex-shrink-0" />
                  <input
                    ref={nodeInputRef}
                    type="text"
                    value={nodeQuery}
                    onChange={e => setNodeQuery(e.target.value)}
                    placeholder="Search for a node to audit…"
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  {nodeQuery && (
                    <button onClick={() => { setNodeQuery(''); setNodeHits([]); }} className="text-slate-500 hover:text-slate-300">
                      <X size={12} />
                    </button>
                  )}
                </div>
                {nodeHits.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-20 overflow-hidden">
                    {nodeHits.map(n => (
                      <button
                        key={n.id}
                        onClick={() => { setPickedNode(n); setNodeHits([]); setNodeQuery(''); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Target size={11} className="text-slate-500 flex-shrink-0" />
                        {n.title}
                      </button>
                    ))}
                  </div>
                )}
                {nodeQuery.length >= 2 && nodeHits.length === 0 && (
                  <p className="text-[10px] text-slate-500 mt-1.5 pl-1">No nodes found for "{nodeQuery}"</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Run button */}
        <button
          onClick={startAudit}
          disabled={!canRun}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-700/50 hover:bg-cyan-700/80 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-200 text-sm font-semibold rounded-lg transition-colors"
        >
          {running
            ? <><RotateCcw size={14} className="animate-spin" /> Running…</>
            : <><Play size={14} /> Run {runLabel}</>
          }
        </button>

        {auditMode === 'node' && !pickedNode && !running && (
          <p className="text-[10px] text-slate-500 text-center -mt-1">Search for a node above to enable this button</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {(['findings', 'settings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'findings'
              ? <><Eye size={11} className="inline mr-1" />Findings</>
              : <><Settings size={11} className="inline mr-1" />Settings</>}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <SettingsPanel settings={settings} onSave={saveSettings} />
      )}

      {tab === 'findings' && (
        <div className="space-y-4">
          {/* Past runs */}
          {runs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Past runs:</span>
              {runs.slice(0, 6).map(run => (
                <button
                  key={run.id}
                  onClick={() => loadRun(run.id)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    activeRun?.id === run.id
                      ? 'border-cyan-500 text-cyan-300 bg-cyan-900/30'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {new Date(run.startedAt).toLocaleDateString()}&nbsp;
                  <span className={
                    run.status === 'running'  ? 'text-amber-400' :
                    run.status === 'complete' ? 'text-green-400' : 'text-red-400'
                  }>●</span>
                  &nbsp;{(run._count as {findings?:number})?.findings ?? 0} findings
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {runError && (
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
              <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-300 font-medium">Failed to start audit</p>
                <p className="text-[11px] text-red-400 mt-0.5 break-words">{runError}</p>
              </div>
            </div>
          )}

          {/* Running */}
          {running && !activeRun && (
            <div className="flex items-center justify-between gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
              <div className="flex items-center gap-2">
                <RotateCcw size={14} className="text-amber-400 animate-spin flex-shrink-0" />
                <p className="text-xs text-amber-300">Audit running… results will appear automatically.</p>
              </div>
              <button
                onClick={stopPolling}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline flex-shrink-0"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Summary */}
          {activeRun && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total',     value: (summary?.total as number) ?? 0,            color: 'text-slate-200' },
                { label: 'High+Crit', value: ((summary?.bySeverity as Record<string,number>)?.high ?? 0) + ((summary?.bySeverity as Record<string,number>)?.critical ?? 0), color: 'text-orange-400' },
                { label: 'Auto-fix',  value: (summary?.autoFixable as number) ?? 0,      color: 'text-cyan-400'  },
                { label: 'Status',    value: activeRun.status,                            color: activeRun.status === 'complete' ? 'text-green-400' : activeRun.status === 'failed' ? 'text-red-400' : 'text-amber-400' },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/60 border border-slate-700 rounded-lg p-2 text-center">
                  <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-semibold mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters + Fix All */}
          {activeRun && findings.length > 0 && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-600 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-cyan-500">
                  <option value="all">All types</option>
                  {allTypes.map(t => <option key={t} value={t}>{FINDING_LABELS[t]}</option>)}
                </select>
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-600 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-cyan-500">
                  <option value="all">All severities</option>
                  {(['critical','high','medium','low'] as FindingSeverity[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {(activeRun.findings ?? []).some(f => f.autoFixable && f.status === 'pending') && (
                <button
                  onClick={fixAll}
                  disabled={fixingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700/40 hover:bg-green-700/70 text-green-300 text-xs font-semibold rounded transition-colors disabled:opacity-50"
                >
                  {fixingAll ? <RotateCcw size={12} className="animate-spin" /> : <Wrench size={12} />}
                  {fixingAll ? 'Fixing…' : 'Fix All Auto-Fixable'}
                </button>
              )}
            </div>
          )}

          {/* Fix-all result banner */}
          {fixAllResult && (
            <div className="flex items-center gap-2 p-2 bg-green-900/20 border border-green-700/40 rounded text-xs text-green-300">
              <CheckCircle size={12} />
              Applied {fixAllResult.applied} fix{fixAllResult.applied !== 1 ? 'es' : ''}
              {fixAllResult.failed > 0 ? ` · ${fixAllResult.failed} failed` : ''}
            </div>
          )}

          {/* Archive healthy — completed run with zero total findings */}
          {activeRun?.status === 'complete' && ((summary?.total as number) ?? 0) === 0 && (() => {
            const checksRan = summary?.checksRan as Record<string, number> | undefined;
            const aiSkipped = summary?.aiSkipped as boolean | undefined;
            const CHECK_NAMES: Record<string, string> = {
              orphans: 'Orphan nodes', stale_edges: 'Stale edges', weak_edges: 'Weak edges',
              missing_fields: 'Incomplete nodes', duplicates: 'Duplicates',
              source_quality: 'Source quality', ai: 'AI analysis',
            };
            return (
              <div className="space-y-3 border border-green-700/30 rounded-lg bg-green-900/10 p-4">
                <div className="flex flex-col items-center text-center space-y-2">
                  <CheckCircle size={28} className="text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-300">All good — no major issues or findings</p>
                    <p className="text-xs text-slate-400 mt-0.5">All automated checks passed. The archive is in good shape.</p>
                  </div>
                  {activeRun.completedAt && (
                    <p className="text-[10px] text-slate-500">
                      {new Date(activeRun.completedAt).toLocaleString()} · {activeRun.triggeredBy}
                    </p>
                  )}
                </div>

                {/* Per-check breakdown */}
                {checksRan && Object.keys(checksRan).length > 0 && (
                  <div className="border-t border-green-800/40 pt-3">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Checks ran</p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(checksRan).map(([key, count]) => (
                        <div key={key} className="flex items-center justify-between gap-2 text-[11px] bg-slate-800/50 rounded px-2 py-1">
                          <span className="flex items-center gap-1 text-slate-400">
                            <CheckCircle size={9} className="text-green-500 flex-shrink-0" />
                            {CHECK_NAMES[key] ?? key}
                          </span>
                          <span className={count > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                            {count} found
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI skipped warning */}
                {aiSkipped && (
                  <div className="flex items-start gap-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-[11px] text-amber-300">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>AI checks were <strong>skipped</strong> — <code className="text-amber-200">ANTHROPIC_API_KEY</code> is not set in Railway.</span>
                  </div>
                )}

                {/* AI errors (key set but calls failed) */}
                {!aiSkipped && (summary?.aiErrors as number) > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-[11px] text-red-300">
                    <XCircle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>
                      AI analysis had <strong>{summary?.aiErrors as number} batch error{(summary?.aiErrors as number) > 1 ? 's' : ''}</strong> — API key may be invalid or the model returned an unexpected response.
                      {(summary?.aiLastError as string) && (
                        <code className="block mt-1 text-red-400 break-all">{summary?.aiLastError as string}</code>
                      )}
                    </span>
                  </div>
                )}

                {!checksRan && (
                  <p className="text-[10px] text-slate-500 text-center">Run a new audit to see a per-check breakdown.</p>
                )}
              </div>
            );
          })()}

          {/* Filter returned nothing, but findings do exist */}
          {activeRun?.status === 'complete' && ((summary?.total as number) ?? 0) > 0 && findings.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
              <Eye size={14} className="text-slate-400" />
              <p className="text-xs text-slate-400">No issues match the current filter. Clear filters to see all {(summary?.total as number)} findings.</p>
            </div>
          )}

          {/* Failed run */}
          {activeRun?.status === 'failed' && !runError && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
              <XCircle size={14} className="text-red-400" />
              <div>
                <p className="text-xs text-red-300 font-medium">Audit failed or was interrupted</p>
                <p className="text-[11px] text-red-400 mt-0.5">The background worker may have been restarted. Try running again.</p>
              </div>
            </div>
          )}

          {/* Findings list */}
          <div className="space-y-2">
            {findings.map(f => (
              <FindingCard key={f.id} finding={f} onAction={handleAction} />
            ))}
          </div>

          {/* No run selected yet */}
          {!activeRun && !running && !runError && runs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertTriangle size={22} className="text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">No audits run yet. Select a type above and click <strong className="text-slate-300">Run</strong>.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
