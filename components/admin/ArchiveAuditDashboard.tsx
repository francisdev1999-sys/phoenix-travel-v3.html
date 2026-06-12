'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, RefreshCw, CheckCircle, XCircle, Settings, AlertTriangle,
  ChevronDown, ChevronUp, Eye, RotateCcw, Wrench,
} from 'lucide-react';
import type {
  AuditRun, AuditFinding, AuditSettings, FindingType, FindingSeverity,
} from '@/lib/audit/types';
import { FINDING_LABELS, SEVERITY_COLOR, DEFAULT_AUDIT_SETTINGS } from '@/lib/audit/types';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const SEV_ORDER: Record<FindingSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

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

  const afterState = finding.afterState as Record<string, unknown>;
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
          {/* Before / After */}
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

          {/* Reasoning */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Reasoning</p>
            <p className="text-xs text-slate-300 bg-slate-900/50 rounded p-2">{finding.reasoning}</p>
          </div>

          {finding.applyError && (
            <p className="text-xs text-red-400 bg-red-900/20 rounded p-2">Apply error: {finding.applyError}</p>
          )}

          {/* Actions */}
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
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount   = useRef(0);

  useEffect(() => {
    fetch('/api/admin/archive-audit/settings')
      .then(r => r.ok ? r.json() : null)
      .then((d: { settings?: AuditSettings } | null) => { if (d?.settings) setSettings(d.settings); })
      .catch(() => {});
    loadRuns();
  }, []);

  const loadRuns = async () => {
    const r = await fetch('/api/admin/archive-audit/runs');
    if (r.ok) {
      const d = await r.json() as { runs?: AuditRun[] };
      setRuns(d.runs ?? []);
    }
  };

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollCount.current = 0;
    setRunning(false);
  }, []);

  const loadRun = useCallback(async (id: string) => {
    pollCount.current += 1;
    // Stop after 120 polls (~6 min) so the spinner doesn't run forever
    if (pollCount.current > 120) {
      stopPolling();
      setRunError('Audit timed out — the background worker may have been interrupted. Try again.');
      return;
    }
    const r = await fetch(`/api/admin/archive-audit/${id}`);
    if (!r.ok) return;
    const run = await r.json() as AuditRun;
    setActive(run);
    if (run.status !== 'running') {
      stopPolling();
      loadRuns();
    }
  }, [stopPolling]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, [stopPolling]);

  const startAudit = async () => {
    setRunning(true);
    setActive(null);
    setRunError(null);
    // POST now runs the audit synchronously — it returns only when complete (30-90s).
    // Show "Audit running…" while waiting, then load results immediately on return.
    const r = await fetch('/api/admin/archive-audit/run', { method: 'POST' });
    const j = await r.json().catch(() => ({})) as { runId?: string; error?: string };
    if (!r.ok) {
      if (r.status === 409 && j.runId) {
        // Already running — poll the existing run
        pollCount.current = 0;
        void loadRun(j.runId!);
        pollRef.current = setInterval(() => loadRun(j.runId!), 3000);
      } else {
        setRunError(j.error ?? `Server error ${r.status}`);
        stopPolling();
      }
      return;
    }
    // Run completed — load results immediately, no polling needed
    if (j.runId) {
      await loadRun(j.runId);
    }
    setRunning(false);
    loadRuns();
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

  const allTypes: FindingType[] = ['orphan','stale_edge','weak_edge','missing_fields','duplicate','source_quality','ai_quality','category_mismatch'];

  const findings = (activeRun?.findings ?? [])
    .filter(f => typeFilter === 'all' || f.type === typeFilter)
    .filter(f => sevFilter  === 'all' || f.severity === sevFilter)
    .sort((a, b) => SEV_ORDER[a.severity as FindingSeverity] - SEV_ORDER[b.severity as FindingSeverity]);

  const summary = activeRun?.summary as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Archive Audit</h2>
          <p className="text-xs text-slate-400 mt-0.5">AI-powered consistency and quality analysis — approve changes before they apply</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRuns} className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Refresh">
            <RefreshCw size={13} className="text-slate-400" />
          </button>
          <button
            onClick={startAudit}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700/50 hover:bg-cyan-700/80 text-cyan-300 text-xs font-semibold rounded transition-colors disabled:opacity-60"
          >
            {running ? <RotateCcw size={13} className="animate-spin" /> : <Play size={13} />}
            {running ? 'Running…' : 'Run Audit'}
          </button>
        </div>
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
          {activeRun?.status === 'complete' && ((summary?.total as number) ?? 0) === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 border border-green-700/30 rounded-lg bg-green-900/10">
              <CheckCircle size={32} className="text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-300">Archive is healthy</p>
                <p className="text-xs text-slate-400 mt-1">All automated checks passed — no issues detected.</p>
              </div>
              {activeRun.completedAt && (
                <p className="text-[10px] text-slate-500">
                  Completed {new Date(activeRun.completedAt).toLocaleString()}
                  {' · '}{activeRun.triggeredBy}
                </p>
              )}
            </div>
          )}

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

          {/* Findings */}
          <div className="space-y-2">
            {findings.map(f => (
              <FindingCard key={f.id} finding={f} onAction={handleAction} />
            ))}
          </div>

          {/* No run yet */}
          {!activeRun && !running && !runError && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle size={28} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">No audit run selected.</p>
              <p className="text-xs text-slate-500 mt-1">Click <strong className="text-slate-300">Run Audit</strong> to analyse the archive.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
