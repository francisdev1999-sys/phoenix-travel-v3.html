'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Brain, Loader2, Zap, TrendingUp, CheckCircle2, XCircle, Clock, Radio, RotateCcw } from 'lucide-react';

interface Weight { name: string; weight: number }
interface ModelInfo {
  version: number; trainedAt: string; bias: number; exampleCount: number;
  positiveCount: number; negativeCount: number;
  accuracy: number | null; precision: number | null; recall: number | null; auc: number | null;
  mature: boolean; weights: Weight[];
}
interface HistoryPoint { version: number; accuracy: number | null; exampleCount: number; trainedAt: string }
interface Prediction {
  id: string; entityId: string; score: number; decision: string; outcome: string;
  createdAt: string; resolvedAt: string | null;
}
interface EdgeModelInfo extends ModelInfo {
  autoApprove: { total: number; resolved: number; survived: number; livePrecision: number | null };
}
interface InterestModelInfo {
  version: number; trainedAt: string; exampleCount: number;
  positiveCount: number; negativeCount: number;
  accuracy: number | null; auc: number | null;
  weights: Weight[];
}
interface NewsModelInfo {
  version: number; trainedAt: string; exampleCount: number;
  positiveCount: number; negativeCount: number;
  accuracy: number | null; auc: number | null;
  weights: Weight[];
}
interface LearningData {
  thresholds: { minExamples: number; minAccuracy: number; autoApproveConfidence: number };
  active: ModelInfo | null;
  edge: EdgeModelInfo | null;
  interest: InterestModelInfo | null;
  news: NewsModelInfo | null;
  history: HistoryPoint[];
  autoApprove: { total: number; resolved: number; survived: number; livePrecision: number | null };
  recentPredictions: Prediction[];
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);
const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

function relTime(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const REFRESH_MS = 10_000;

// Neutral-ish starting inputs for the playground (a plausible mid candidate).
const NEUTRAL: Record<string, number> = {
  confidence: 0.6, claims: 0.4, criticisms: 0.3, tags: 0.4, descLength: 0.5,
  sources: 0.4, sourceCred: 0.65, connections: 0.4, hasMainstream: 1, openQuestions: 0.3,
  ev_verified: 0, ev_strong: 1, ev_debated: 0, ev_speculative: 0, ev_mythological: 0,
};

export default function LearningDashboard() {
  const [data, setData]       = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [msg, setMsg]         = useState<string | null>(null);
  const [live, setLive]       = useState(true);
  const [inputs, setInputs]   = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/learning');
      if (r.ok) setData(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live auto-refresh of model + decision stream.
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(load, REFRESH_MS);
    return () => clearInterval(iv);
  }, [live, load]);

  const m = data?.active ?? null;

  // Seed the playground inputs once the feature list is known.
  useEffect(() => {
    if (m && Object.keys(inputs).length === 0) {
      const seed: Record<string, number> = {};
      m.weights.forEach(w => { seed[w.name] = NEUTRAL[w.name] ?? 0.5; });
      setInputs(seed);
    }
  }, [m, inputs]);

  const trainNow = async () => {
    setTraining(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/cron/trigger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'learning-pass' }),
      });
      const d = await r.json();
      const res = d?.data;
      const src = res?.sources;
      setMsg(res?.trained
        ? `Trained v${res.version} · acc ${pct(res.accuracy)} · learned from ${res.exampleCount} examples`
          + (src ? ` (${src.publishedNodes} published nodes, ${res.negativeCount} rejected/archived)` : '')
        : `No retrain: ${res?.reason ?? 'unknown'}`);
      await load();
    } catch (e) {
      setMsg(`Failed: ${String(e)}`);
    } finally { setTraining(false); }
  };

  // ── Live inference (uses the real learned weights + bias) ──────────────────
  const inference = useMemo(() => {
    if (!m) return null;
    let z = m.bias;
    const contribs = m.weights.map(w => {
      const value = inputs[w.name] ?? 0;
      const c = w.weight * value;
      z += c;
      return { name: w.name, weight: w.weight, value, contribution: c };
    });
    const p = sigmoid(z);
    const g = { myth: inputs['ev_mythological'] ?? 0, claims: inputs['claims'] ?? 0,
                sources: inputs['sources'] ?? 0, cred: inputs['sourceCred'] ?? 0 };
    const safe = g.myth < 0.5 && g.claims >= 1 / 6 - 1e-6 && g.sources >= 1 / 5 - 1e-6 && g.cred >= 0.5;
    const conf = data?.thresholds.autoApproveConfidence ?? 0.9;
    const wouldAutoApprove = !!m.mature && p >= conf && safe;
    return { z, p, contribs, safe, wouldAutoApprove, conf };
  }, [m, inputs, data]);

  const setPreset = (kind: 'strong' | 'weak' | 'neutral') => {
    if (!m) return;
    const next: Record<string, number> = {};
    m.weights.forEach(w => {
      if (kind === 'neutral') next[w.name] = NEUTRAL[w.name] ?? 0.5;
      else if (kind === 'strong') next[w.name] = w.name.startsWith('ev_')
        ? (w.name === 'ev_strong' || w.name === 'ev_verified' ? 1 : 0)
        : w.name === 'hasSource' ? 1 : 0.85;
      else next[w.name] = w.name.startsWith('ev_')
        ? (w.name === 'ev_speculative' ? 1 : 0)
        : w.name === 'hasSource' ? 0 : 0.2;
    });
    setInputs(next);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-400 text-sm p-6"><Loader2 size={16} className="animate-spin" /> Loading learning model…</div>;
  }

  const maxAbs = m && m.weights.length ? Math.max(...m.weights.map(w => Math.abs(w.weight)), 0.0001) : 1;
  const bestAcc = data?.history?.reduce((mx, h) => Math.max(mx, h.accuracy ?? 0), 0) ?? 0;
  const maxContrib = inference ? Math.max(...inference.contribs.map(c => Math.abs(c.contribution)), 0.0001) : 1;

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-purple-400" />
          <h2 className="text-sm font-bold text-white">Adaptive Promotion Neuron</h2>
          {m && (
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${m.mature ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'}`}>
              {m.mature ? 'Active · auto-approving' : 'Learning · advisory only'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLive(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${live ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700/40' : 'text-slate-400 bg-white/5 border-white/10'}`}>
            <Radio size={12} className={live ? 'animate-pulse' : ''} /> {live ? 'Live' : 'Paused'}
          </button>
          <button onClick={trainNow} disabled={training}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-200 bg-purple-800/40 hover:bg-purple-700/50 border border-purple-600/30 disabled:opacity-40">
            {training ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {training ? 'Training…' : 'Train now'}
          </button>
        </div>
      </div>
      {msg && <p className="text-[11px] text-slate-400">{msg}</p>}

      {!m ? (
        <div className="p-6 rounded-xl bg-white/3 border border-white/6 text-sm text-slate-400">
          No model has been trained yet. It learns from the whole archive — every
          published node (with its sources + connections) as a positive example, and
          rejected/archived items as negatives. It also <span className="text-cyan-300">retrains itself
          automatically</span> as new data enters the archive. Hit <span className="text-purple-300 font-semibold">Train now</span> (or wait for the
          nightly Learning Pass) to fit the first neuron. It needs at least{' '}
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

          {/* ── LIVE NEURON — watch it fire ─────────────────────────────────── */}
          {inference && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 to-white/3 border border-purple-800/30">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Radio size={14} className="text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Live neuron — feed it inputs, watch it decide</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['strong', 'neutral', 'weak'] as const).map(k => (
                    <button key={k} onClick={() => setPreset(k)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 capitalize">{k}</button>
                  ))}
                  <button onClick={() => setPreset('neutral')} title="Reset"
                    className="p-1 rounded-lg text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10"><RotateCcw size={12} /></button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Neuron diagram */}
                <NeuronDiagram contribs={inference.contribs} maxAbs={maxAbs} output={inference.p} />

                {/* Output + verdict */}
                <div className="flex flex-col justify-center gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Predicted approval + survival</div>
                    <div className="flex items-end gap-3">
                      <div className="text-4xl font-black text-white tabular-nums">{(inference.p * 100).toFixed(1)}<span className="text-lg text-slate-500">%</span></div>
                      <div className="flex-1 pb-2">
                        <div className="h-3 rounded-full bg-white/5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${inference.p * 100}%` }} />
                          <div className="absolute top-0 h-full w-0.5 bg-amber-400" title="auto-approve threshold"
                            style={{ left: `${inference.conf * 100}%` }} />
                        </div>
                        <div className="text-[9px] text-amber-400/80 mt-1" style={{ marginLeft: `${inference.conf * 100}%` }}>▲ {pct(inference.conf)} bar</div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-2 rounded-lg text-xs font-bold border ${inference.wouldAutoApprove ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                    {inference.wouldAutoApprove
                      ? '✓ Would AUTO-APPROVE this candidate'
                      : !m.mature ? '○ Model still learning → queue for human review'
                      : !inference.safe ? '⚠ Blocked by safety guard → queue for review'
                      : '○ Below confidence bar → queue for human review'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    weighted sum z = <span className="font-mono text-slate-300">{inference.z.toFixed(2)}</span>
                    <span className="text-slate-600"> (bias {m.bias.toFixed(2)})</span> → sigmoid → {pct(inference.p)}
                  </div>
                </div>
              </div>

              {/* Sliders + live contributions */}
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-1.5 mt-4">
                {inference.contribs.map(c => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="w-24 text-[10px] text-slate-400 truncate" title={c.name}>{c.name}</span>
                    <input type="range" min={0} max={1} step={0.01} value={c.value}
                      onChange={e => setInputs(prev => ({ ...prev, [c.name]: parseFloat(e.target.value) }))}
                      className="flex-1 h-1 accent-purple-500" />
                    <span className={`w-12 text-right text-[10px] font-mono ${c.contribution >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
                      title="contribution = weight × input">
                      {c.contribution >= 0 ? '+' : ''}{c.contribution.toFixed(2)}
                    </span>
                    <div className="w-16 h-1.5 rounded-full bg-white/5 relative overflow-hidden hidden sm:block">
                      <div className={`absolute top-0 h-full ${c.contribution >= 0 ? 'bg-emerald-500/70 left-1/2' : 'bg-red-500/70 right-1/2'}`}
                        style={{ width: `${(Math.abs(c.contribution) / maxContrib) * 50}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learned auto-approve lane */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-purple-400" />
              <span className="text-xs font-bold text-white">Learned auto-approve lane (production)</span></div>
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-slate-400">
              <span>Auto-approved: <strong className="text-white">{data?.autoApprove.total}</strong></span>
              <span>Resolved: <strong className="text-white">{data?.autoApprove.resolved}</strong></span>
              <span>Survived: <strong className="text-emerald-300">{data?.autoApprove.survived}</strong></span>
              <span>Live precision: <strong className="text-white">{pct(data?.autoApprove.livePrecision)}</strong></span>
            </div>
          </div>

          {/* Connection-quality (edge) model */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-cyan-400" />
              <span className="text-xs font-bold text-white">Connection-quality neuron (edges)</span>
              {data?.edge && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${data.edge.mature ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'}`}>
                  {data.edge.mature ? 'Active' : 'Learning'}
                </span>
              )}
            </div>
            {!data?.edge ? (
              <p className="text-[11px] text-slate-500">
                Not trained yet — it learns which relationships are strong from the graph&apos;s
                existing published edges (positives) vs archived edges + rejected suggestions
                (negatives). Trains alongside the node model.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-slate-400 mb-2">
                  <span>v<strong className="text-white">{data.edge.version}</strong></span>
                  <span>Accuracy: <strong className="text-white">{pct(data.edge.accuracy)}</strong></span>
                  <span>AUC: <strong className="text-white">{data.edge.auc == null ? '—' : data.edge.auc.toFixed(3)}</strong></span>
                  <span>Examples: <strong className="text-white">{data.edge.exampleCount}</strong> (+{data.edge.positiveCount}/−{data.edge.negativeCount})</span>
                  <span>Lane: <strong className="text-white">{data.edge.autoApprove.total}</strong> approved · precision <strong className="text-white">{pct(data.edge.autoApprove.livePrecision)}</strong></span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {data.edge.weights.slice(0, 6).map(w => (
                    <span key={w.name} className="text-[10px] font-mono">
                      <span className="text-slate-500">{w.name}</span>{' '}
                      <span className={w.weight >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                        {w.weight >= 0 ? '+' : ''}{w.weight.toFixed(2)}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Audience-interest neuron */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-fuchsia-400" />
              <span className="text-xs font-bold text-white">Audience-interest neuron (what pulls users in)</span>
              {data?.interest && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-fuchsia-900/40 text-fuchsia-300">
                  v{data.interest.version}
                </span>
              )}
            </div>
            {!data?.interest ? (
              <p className="text-[11px] text-slate-500">
                Not trained yet — it learns from anonymous visitor engagement (views, dives,
                connection hops) which topics people find magnetic, then ranks the Explore
                feed. Needs real traffic before its first fit.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-slate-400 mb-2">
                  <span>Accuracy: <strong className="text-white">{pct(data.interest.accuracy)}</strong></span>
                  <span>AUC: <strong className="text-white">{data.interest.auc == null ? '—' : data.interest.auc.toFixed(3)}</strong></span>
                  <span>Examples: <strong className="text-white">{data.interest.exampleCount}</strong> (+{data.interest.positiveCount}/−{data.interest.negativeCount})</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {data.interest.weights.slice(0, 6).map(w => (
                    <span key={w.name} className="text-[10px] font-mono">
                      <span className="text-slate-500">{w.name}</span>{' '}
                      <span className={w.weight >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                        {w.weight >= 0 ? '+' : ''}{w.weight.toFixed(2)}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* News-relevance neuron */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-orange-400" />
              <span className="text-xs font-bold text-white">News-relevance neuron (which headlines pay off)</span>
              {data?.news && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-300">
                  v{data.news.version}
                </span>
              )}
            </div>
            {!data?.news ? (
              <p className="text-[11px] text-slate-500">
                Not trained yet — it learns from the intel feed which headlines, categories,
                and sources actually produce published archive topics, then spends the daily
                news-discovery budget on the most promising ones. Needs a few days of
                news-discovery verdicts before its first fit.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-slate-400 mb-2">
                  <span>Accuracy: <strong className="text-white">{pct(data.news.accuracy)}</strong></span>
                  <span>AUC: <strong className="text-white">{data.news.auc == null ? '—' : data.news.auc.toFixed(3)}</strong></span>
                  <span>Examples: <strong className="text-white">{data.news.exampleCount}</strong> (+{data.news.positiveCount}/−{data.news.negativeCount})</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {data.news.weights.slice(0, 6).map(w => (
                    <span key={w.name} className="text-[10px] font-mono">
                      <span className="text-slate-500">{w.name}</span>{' '}
                      <span className={w.weight >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                        {w.weight >= 0 ? '+' : ''}{w.weight.toFixed(2)}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Accuracy history */}
          {data && data.history.length > 1 && (
            <div className="p-4 rounded-xl bg-white/3 border border-white/6">
              <span className="text-xs font-bold text-white">Accuracy by version (getting better over time)</span>
              <div className="mt-3 flex items-end gap-1 h-20">
                {data.history.map(h => (
                  <div key={h.version} className="flex-1 flex flex-col items-center justify-end gap-1" title={`v${h.version}: ${pct(h.accuracy)}`}>
                    <div className="w-full rounded-t bg-purple-500/60" style={{ height: `${((h.accuracy ?? 0) / (bestAcc || 1)) * 100}%`, minHeight: 2 }} />
                    <span className="text-[8px] text-slate-600">v{h.version}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live decision stream */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <div className="flex items-center gap-2 mb-2">
              <Radio size={12} className={`${live ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-xs font-bold text-white">Live decision stream</span>
              <span className="text-[10px] text-slate-500">{live ? `refreshing every ${REFRESH_MS / 1000}s` : 'paused'}</span>
            </div>
            <div className="space-y-1">
              {data?.recentPredictions.length === 0 && <p className="text-[11px] text-slate-500">No learned decisions recorded yet. They appear here as discovery runs score candidates.</p>}
              {data?.recentPredictions.map(p => {
                const icon = p.outcome === 'approved_survived' ? <CheckCircle2 size={12} className="text-emerald-400" />
                  : p.outcome === 'rejected_removed' ? <XCircle size={12} className="text-red-400" />
                  : <Clock size={12} className="text-slate-500" />;
                return (
                  <div key={p.id} className="flex items-center gap-2 text-[11px]">
                    {icon}
                    <span className="text-slate-400 font-mono w-9">{(p.score * 100).toFixed(0)}%</span>
                    <span className={`px-1.5 py-0.5 rounded ${p.decision === 'learned_auto_approved' ? 'bg-purple-900/40 text-purple-300' : 'bg-white/5 text-slate-400'}`}>
                      {p.decision === 'learned_auto_approved' ? 'auto-approved' : 'queued'}
                    </span>
                    <span className="text-slate-500 truncate flex-1">{p.entityId}</span>
                    <span className="text-slate-600">{relTime(p.createdAt)}</span>
                    <span className="text-slate-600 w-24 text-right">{p.outcome === 'pending' ? 'pending' : p.outcome.replace('_', ' ')}</span>
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

// ── Neuron diagram: inputs → weighted edges → activation → output ──────────────
function NeuronDiagram({ contribs, maxAbs, output }: {
  contribs: { name: string; weight: number; contribution: number }[];
  maxAbs: number; output: number;
}) {
  const H = 260, W = 300;
  const padY = 12;
  const n = contribs.length;
  const inX = 96, outX = 250, outY = H / 2;
  const maxC = Math.max(...contribs.map(c => Math.abs(c.contribution)), 0.0001);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64">
      {contribs.map((c, i) => {
        const y = padY + (i / Math.max(1, n - 1)) * (H - 2 * padY);
        const active = Math.abs(c.contribution) / maxC;
        const stroke = c.weight >= 0 ? '#34d399' : '#f87171';
        return (
          <g key={c.name}>
            <line x1={inX} y1={y} x2={outX} y2={outY}
              stroke={stroke} strokeWidth={0.5 + (Math.abs(c.weight) / maxAbs) * 2.5}
              strokeOpacity={0.12 + active * 0.75} />
            <circle cx={inX} cy={y} r={3} fill="#a78bfa" />
            <text x={inX - 6} y={y + 2.5} textAnchor="end" fontSize={7} fill="#94a3b8">
              {c.name.length > 12 ? c.name.slice(0, 12) : c.name}
            </text>
          </g>
        );
      })}
      {/* Output neuron — brightness tracks activation */}
      <circle cx={outX} cy={outY} r={18} fill="#7c3aed" fillOpacity={0.25 + output * 0.6}
        stroke="#a78bfa" strokeWidth={1.5} />
      <text x={outX} y={outY + 3} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#fff">
        {(output * 100).toFixed(0)}%
      </text>
      <text x={outX} y={outY + 34} textAnchor="middle" fontSize={7} fill="#94a3b8">σ(Σ w·x + b)</text>
    </svg>
  );
}
