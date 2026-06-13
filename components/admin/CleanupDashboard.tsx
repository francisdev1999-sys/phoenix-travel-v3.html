'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, Play, CheckCircle, Clock, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface CleanupRun {
  id: string;
  mode: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  triggeredBy: string;
  candidatesScanned: number;
  candidatesSentToAI: number;
  keepCount: number;
  reviewCount: number;
  archiveCandidateCount: number;
  deleteCandidateCount: number;
  blacklistCandidateCount: number;
  estimatedCost: number;
  _count?: { findings: number };
}

interface CleanupFinding {
  id: string;
  itemType: string;
  itemId: string;
  title: string;
  classification: string;
  relevanceScore: number;
  confidence: number;
  recommendedAction: string;
  status: string;
  createdAt: string;
}

interface CleanupDashboardProps {
  adminEmail: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle size={14} className="text-green-400" />,
  running:   <RefreshCw size={14} className="text-blue-400 animate-spin" />,
  pending:   <Clock size={14} className="text-yellow-400" />,
  failed:    <XCircle size={14} className="text-red-400" />,
};

const CLASS_COLOR: Record<string, string> = {
  keep:              'text-green-400',
  review:            'text-yellow-400',
  archive_candidate: 'text-orange-400',
  delete_candidate:  'text-red-400',
  blacklist:         'text-red-600',
};

export default function CleanupDashboard({ adminEmail }: CleanupDashboardProps) {
  const [runs, setRuns] = useState<CleanupRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [findings, setFindings] = useState<CleanupFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'nodes' | 'sources'>('nodes');

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/super-admin/cleanup-ai/runs');
      if (!res.ok) throw new Error(await res.text());
      setRuns(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFindings = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/super-admin/cleanup-ai/runs?runId=${runId}`);
      if (!res.ok) return;
      const data = await res.json();
      setFindings(data.findings ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  useEffect(() => {
    if (selectedRun) loadFindings(selectedRun);
    else setFindings([]);
  }, [selectedRun, loadFindings]);

  const triggerRun = async () => {
    setTriggering(true);
    setError(null);
    try {
      const endpoint = mode === 'nodes'
        ? '/api/super-admin/cleanup-ai/analyze-nodes'
        : '/api/super-admin/cleanup-ai/analyze-sources';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to trigger run');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AI Cleanup Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Signed in as {adminEmail}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={mode}
            onChange={e => setMode(e.target.value as 'nodes' | 'sources')}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
          >
            <option value="nodes">Analyze Nodes</option>
            <option value="sources">Analyze Sources</option>
          </select>
          <button
            onClick={triggerRun}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-bold transition-all"
          >
            <Play size={12} />
            {triggering ? 'Running…' : 'Run Cleanup'}
          </button>
          <button
            onClick={loadRuns}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-xs">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-400">Audit Runs</h2>
        {runs.length === 0 && !loading && (
          <p className="text-xs text-slate-600 py-4 text-center">No cleanup runs yet. Trigger one above.</p>
        )}
        {runs.map(run => (
          <div key={run.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setSelectedRun(selectedRun === run.id ? null : run.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/50 transition-all"
            >
              <div className="flex items-center gap-3">
                {STATUS_ICON[run.status] ?? <Clock size={14} className="text-slate-500" />}
                <div>
                  <span className="text-sm text-white font-medium">{run.mode}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {new Date(run.startedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{run.candidatesScanned} scanned</span>
                <span className="text-yellow-400">{run.reviewCount} review</span>
                <span className="text-red-400">{run.deleteCandidateCount} delete</span>
                <span className="text-slate-600">${run.estimatedCost.toFixed(3)}</span>
                {selectedRun === run.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {selectedRun === run.id && (
              <div className="border-t border-slate-800 p-4 space-y-3">
                <div className="grid grid-cols-4 gap-3 text-xs">
                  {[
                    { label: 'Keep', value: run.keepCount, color: 'text-green-400' },
                    { label: 'Review', value: run.reviewCount, color: 'text-yellow-400' },
                    { label: 'Archive', value: run.archiveCandidateCount, color: 'text-orange-400' },
                    { label: 'Delete', value: run.deleteCandidateCount, color: 'text-red-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-slate-800 rounded-lg p-3 text-center">
                      <div className={`text-lg font-bold ${color}`}>{value}</div>
                      <div className="text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>

                {findings.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <h3 className="text-xs font-semibold text-slate-400 mb-2">Findings</h3>
                    {findings.slice(0, 20).map(f => (
                      <div key={f.id} className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <Trash2 size={12} className={CLASS_COLOR[f.classification] ?? 'text-slate-400'} />
                          <span className="text-slate-300 truncate max-w-xs">{f.title}</span>
                          <span className="text-slate-600">{f.itemType}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={CLASS_COLOR[f.classification] ?? 'text-slate-400'}>
                            {f.classification.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-600">{Math.round(f.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))}
                    {findings.length > 20 && (
                      <p className="text-xs text-slate-600 text-center pt-1">
                        +{findings.length - 20} more findings
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
