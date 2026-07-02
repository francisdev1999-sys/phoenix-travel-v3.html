'use client';
import { useEffect, useState, useCallback } from 'react';
import { Brain, Loader2, Zap, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Weight { name: string; weight: number }
interface ModelInfo {
  version: number; trainedAt: string; exampleCount: number;
  positiveCount: number; negativeCount: number;
  accuracy: number | null; precision: number | null; recall: number | null; auc: number | null;
  mature: boolean; weights: Weight[];
}
interface HistoryPoint { version: number; accuracy: number | null; exampleCount: number; trainedAt: string }
interface Prediction {
  id: string; entityId: string; score: number; decision: string; outcome: string;
  createdAt: string; resolvedAt: string | null;
}
interface LearningData {
  thresholds: { minExamples: number; minAccuracy: number; autoApproveConfidence: number };
  active: ModelInfo | null;
  history: HistoryPoint[];
  autoApprove: { total: number; resolved: number; survived: number; livePrecision: number | null };
  recentPredictions: Prediction[];
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

export default function LearningDashboard() {
  const [data, setData]       = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [msg, setMsg]         = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/learning');
      if (r.ok) setData(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const trainNow = async () => {
    setTraining(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/cron/trigger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'learning-pass' }),
      });
      const d = await r.json();
      const res = d?.data;
      setMsg(res?.trained
        ? `Trained v${res.version} · acc ${pct(res.accuracy)} · ${res.exampleCount} examples`
        : `No retrain: ${res?.reason ?? 'unknown'}`);
      await load();
    } catch (e) {
      setMsg(`Failed: ${String(e)}`);
    } finally { setTraining(false); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-400 text-sm p-6"><Loader2 size={16} className="animate-spin" /> Loading learning model…</div>;
  }

  const m = data?.active;
  const maxAbs = m && m.weights.length ? Math.max(...m.weights.map(w => Math.abs(w.weight)), 0.0001) : 1;
  const bestAcc = data?.history?.reduce((mx, h) => Math.max(mx, h.accuracy ?? 0), 0) ?? 0;

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-purple-400" />
          <h2 className="text-sm font-bold text-white">Adaptive Promotion Model</h2>
          {m && (
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${m.mature ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'}`}>
              {m.mature ? 'Active · auto-approving' : 'Learning · advisory only'}
            </span>
          )}
        </div>
        <button onClick={trainNow} disabled={training}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-200 bg-purple-800/40 hover:bg-purple-700/50 border border-purple-600/30 disabled:opacity-40">
          {training ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {training ? 'Training…' : 'Train now'}
        </button>
      </div>
      {msg && <p className="text-[11px] text-slate-400">{msg}</p>}

      {!m ? (
        <div className="p-6 rounded-xl bg-white/3 border border-white/6 text-sm text-slate-400">
          No model has been trained yet. Once the archive has enough approve/reject
          history, run <span className="text-purple-300 font-semibold">Train now</span> (or wait for the
          nightly Learning Pass) to fit the first model. It needs at least{' '}
          <strong>{data?.thresholds.minExamples}</strong> labeled examples and{' '}
          <strong>{pct(data?.thresholds.minAccuracy)}</strong> accuracy before it may auto-approve anything.
        </div>
      ) : (
        <>
          {/* Metric tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'Version',   value: `v${m.version}` },
              { label: 'Accuracy',  value: pct(m.accuracy) },
              { label: 'AUC',       value: m.auc == null ? '—' : m.auc.toFixed(3) },
              { label: 'Examples',  value: `${m.exampleCount}` },
              { label: 'Precision', value: pct(m.precision) },
              { label: 'Recall',    value: pct(m.recall) },
              { label: 'Positives', value: `${m.positiveCount}` },
              { label: 'Negatives', value: `${m.negativeCount}` },
            ].map(t => (
              <div key={t.label} className="p-3 rounded-xl bg-white/3 border border-white/6">
                <div className="text-lg font-black text-white">{t.value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">{t.label}</div>
              </div>
            ))}
          </div>

          {/* Learned auto-approve lane */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-purple-400" />
              <span className="text-xs font-bold text-white">Learned auto-approve lane</span></div>
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-slate-400">
              <span>Auto-approved: <strong className="text-white">{data?.autoApprove.total}</strong></span>
              <span>Resolved: <strong className="text-white">{data?.autoApprove.resolved}</strong></span>
              <span>Survived: <strong className="text-emerald-300">{data?.autoApprove.survived}</strong></span>
              <span>Live precision: <strong className="text-white">{pct(data?.autoApprove.livePrecision)}</strong></span>
              <span>Confidence bar: <strong className="text-white">{pct(data?.thresholds.autoApproveConfidence)}</strong></span>
            </div>
          </div>

          {/* Feature weights — what it learned to value */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <span className="text-xs font-bold text-white">What the model learned (feature weights)</span>
            <div className="mt-3 space-y-1.5">
              {m.weights.map(w => (
                <div key={w.name} className="flex items-center gap-2">
                  <span className="w-28 text-[11px] text-slate-400 truncate">{w.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/5 relative overflow-hidden">
                    <div
                      className={`absolute top-0 h-full ${w.weight >= 0 ? 'bg-emerald-500/70 left-1/2' : 'bg-red-500/70 right-1/2'}`}
                      style={{ width: `${(Math.abs(w.weight) / maxAbs) * 50}%` }}
                    />
                    <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
                  </div>
                  <span className={`w-14 text-right text-[11px] font-mono ${w.weight >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {w.weight >= 0 ? '+' : ''}{w.weight.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Accuracy history */}
          {data && data.history.length > 1 && (
            <div className="p-4 rounded-xl bg-white/3 border border-white/6">
              <span className="text-xs font-bold text-white">Accuracy by version (getting better over time)</span>
              <div className="mt-3 flex items-end gap-1 h-20">
                {data.history.map(h => (
                  <div key={h.version} className="flex-1 flex flex-col items-center justify-end gap-1" title={`v${h.version}: ${pct(h.accuracy)}`}>
                    <div className="w-full rounded-t bg-purple-500/60"
                      style={{ height: `${((h.accuracy ?? 0) / (bestAcc || 1)) * 100}%`, minHeight: 2 }} />
                    <span className="text-[8px] text-slate-600">v{h.version}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent decisions */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <span className="text-xs font-bold text-white">Recent learned decisions</span>
            <div className="mt-2 space-y-1">
              {data?.recentPredictions.length === 0 && <p className="text-[11px] text-slate-500">No learned decisions recorded yet.</p>}
              {data?.recentPredictions.map(p => {
                const icon = p.outcome === 'approved_survived' ? <CheckCircle2 size={12} className="text-emerald-400" />
                  : p.outcome === 'rejected_removed' ? <XCircle size={12} className="text-red-400" />
                  : <Clock size={12} className="text-slate-500" />;
                return (
                  <div key={p.id} className="flex items-center gap-2 text-[11px]">
                    {icon}
                    <span className="text-slate-400 font-mono">{(p.score * 100).toFixed(0)}%</span>
                    <span className={`px-1.5 py-0.5 rounded ${p.decision === 'learned_auto_approved' ? 'bg-purple-900/40 text-purple-300' : 'bg-white/5 text-slate-400'}`}>
                      {p.decision === 'learned_auto_approved' ? 'auto-approved' : 'queued'}
                    </span>
                    <span className="text-slate-500 truncate">{p.entityId}</span>
                    <span className="text-slate-600 ml-auto">{p.outcome === 'pending' ? 'pending' : p.outcome.replace('_', ' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
