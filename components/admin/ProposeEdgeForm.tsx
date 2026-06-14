'use client';
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';

type NodeHit = { id: string; title: string };

const RELATIONSHIP_TYPES = ['historical', 'geographical', 'textual', 'thematic', 'influence', 'contradictory'];
const EVIDENCE_LEVELS    = ['verified', 'strong_evidence', 'debated', 'speculative', 'mythological'];

const REL_COLORS: Record<string, string> = {
  historical: '#f59e0b', geographical: '#22c55e', textual: '#6366f1',
  thematic: '#a855f7', influence: '#06b6d4', contradictory: '#ef4444',
};

interface Props { onSuccess: () => void; onCancel: () => void; }

export default function ProposeEdgeForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    fromNodeId: '', toNodeId: '', relationship: 'historical',
    description: '', evidenceLevel: 'speculative', confidence: 0.5,
    strengthScore: 0.5, explanation: '', historicalBasis: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch]   = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<NodeHit[]>([]);
  const [toSuggestions, setToSuggestions]     = useState<NodeHit[]>([]);
  const [fromSelectedName, setFromSelectedName] = useState('');
  const [toSelectedName, setToSelectedName]     = useState('');

  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  // Live search — debounced fetch from DB
  useEffect(() => {
    if (fromSearch.length < 2) { setFromSuggestions([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search/quick?q=${encodeURIComponent(fromSearch)}`).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json() as { nodes: NodeHit[] };
      setFromSuggestions(d.nodes?.slice(0, 8) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [fromSearch]);

  useEffect(() => {
    if (toSearch.length < 2) { setToSuggestions([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search/quick?q=${encodeURIComponent(toSearch)}`).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json() as { nodes: NodeHit[] };
      setToSuggestions(d.nodes?.slice(0, 8) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [toSearch]);

  const submit = async () => {
    if (!form.fromNodeId || !form.toNodeId || !form.description.trim()) {
      setError('From node, to node, and description are required'); return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/edges/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setStatus('done');
      setTimeout(onSuccess, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
      setStatus('error');
    }
  };

  if (status === 'done') return (
    <div className="flex flex-col items-center gap-4 py-12">
      <CheckCircle size={40} className="text-green-400" />
      <p className="text-sm font-bold text-white">Relationship proposal submitted for review</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-sm text-red-300">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
        </div>
      )}

      {/* Node pickers */}
      <div className="grid grid-cols-2 gap-3">
        <NodePicker label="From node *" value={form.fromNodeId} selectedName={fromSelectedName}
          search={fromSearch} setSearch={setFromSearch} suggestions={fromSuggestions}
          onSelect={(id, name) => { set('fromNodeId', id); setFromSelectedName(name); setFromSearch(''); setFromSuggestions([]); }}
          onClear={() => { set('fromNodeId', ''); setFromSelectedName(''); }} />
        <NodePicker label="To node *" value={form.toNodeId} selectedName={toSelectedName}
          search={toSearch} setSearch={setToSearch} suggestions={toSuggestions}
          onSelect={(id, name) => { set('toNodeId', id); setToSelectedName(name); setToSearch(''); setToSuggestions([]); }}
          onClear={() => { set('toNodeId', ''); setToSelectedName(''); }} />
      </div>

      {/* Relationship type */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Relationship type *</p>
        <div className="grid grid-cols-3 gap-2">
          {RELATIONSHIP_TYPES.map(r => {
            const rc = REL_COLORS[r] ?? '#94a3b8';
            return (
              <button key={r} onClick={() => set('relationship', r)}
                className="px-2 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all"
                style={form.relationship === r
                  ? { background: rc + '25', border: `1px solid ${rc}`, color: rc }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', color: '#94a3b8' }}
              >{r}</button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description *</p>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Describe the relationship between these two nodes..." rows={3}
          className="nexus-input w-full text-sm resize-none" />
      </div>

      {/* Evidence level */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Evidence level</p>
        <div className="flex flex-wrap gap-2">
          {EVIDENCE_LEVELS.map(ev => (
            <button key={ev} onClick={() => set('evidenceLevel', ev)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                form.evidenceLevel === ev ? 'bg-purple-700 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >{ev.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-4">
        <Slider label={`Confidence: ${Math.round(form.confidence * 100)}%`} value={form.confidence} onChange={v => set('confidence', v)} />
        <Slider label={`Strength: ${Math.round(form.strengthScore * 100)}%`} value={form.strengthScore} onChange={v => set('strengthScore', v)} />
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Explanation</p>
        <textarea value={form.explanation} onChange={e => set('explanation', e.target.value)}
          placeholder="Why do these two concepts connect?" rows={2}
          className="nexus-input w-full text-sm resize-none" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Historical basis</p>
        <textarea value={form.historicalBasis} onChange={e => set('historicalBasis', e.target.value)}
          placeholder="What historical evidence supports this link?" rows={2}
          className="nexus-input w-full text-sm resize-none" />
      </div>

      <div className="flex gap-3 mt-2">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-purple-900/40 hover:bg-white/5 flex items-center gap-1.5">
          <X size={13} />Cancel
        </button>
        <button onClick={submit} disabled={status === 'loading'}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-40">
          {status === 'loading' && <Loader2 size={13} className="animate-spin" />}
          Propose relationship
        </button>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <input type="range" min={0} max={1} step={0.05} value={value}
        onChange={e => onChange(Number(e.target.value))} className="w-full accent-purple-500" />
    </div>
  );
}

function NodePicker({ label, value, selectedName, search, setSearch, suggestions, onSelect, onClear }: {
  label: string; value: string; selectedName: string; search: string;
  setSearch: (s: string) => void; suggestions: NodeHit[];
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
      {value ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-900/30 border border-purple-500/30">
          <span className="text-xs text-white flex-1 truncate">{selectedName || value}</span>
          <button onClick={onClear} className="text-slate-500 hover:text-white">
            <X size={10} />
          </button>
        </div>
      ) : (
        <div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes…" className="nexus-input w-full text-xs" />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl bg-slate-900 border border-purple-900/40 overflow-hidden shadow-xl">
              {suggestions.map(n => (
                <button key={n.id} onClick={() => onSelect(n.id, n.title)}
                  className="w-full flex flex-col px-3 py-2 text-left hover:bg-white/10 transition-all border-b border-purple-900/20 last:border-0">
                  <span className="text-xs text-white">{n.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{n.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
