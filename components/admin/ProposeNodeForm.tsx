'use client';
import { useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle, X, Plus, Trash2 } from 'lucide-react';
import { NODE_CATEGORY_COLORS, NODE_CATEGORY_DESCRIPTIONS, NODE_CATEGORY_GROUPS } from '@/lib/taxonomy/node-categories';
import FieldHelp from '@/components/ui/FieldHelp';

const EVIDENCE_LEVELS = ['verified', 'strong_evidence', 'debated', 'speculative', 'mythological'];

const EVIDENCE_HELP = 'Represents the current strength of evidence supporting this node.\nNot a statement of truth.\n\nverified — primary source confirmation\nstrong_evidence — multiple credible sources\ndebated — contested among researchers\nspeculative — limited or indirect evidence\nmythological — cultural/traditional basis only';

const CONFIDENCE_HELP = 'Confidence in the current interpretation of available evidence.\nNot certainty. A score of 0.5 means the interpretation is uncertain.';

interface Props { onSuccess: () => void; onCancel: () => void; }

export default function ProposeNodeForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    label: '', category: 'Ancient Civilization', description: '',
    evidenceLevel: 'speculative', confidence: 0.5,
    mainstreamView: '', region: '', country: '',
    dateStart: '', dateEnd: '', nodeId: '',
  });
  const [claims, setClaims] = useState<string[]>(['']);
  const [criticisms, setCriticisms] = useState<string[]>(['']);
  const [openQuestions, setOpenQuestions] = useState<string[]>(['']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.label.trim() || !form.description.trim()) {
      setError('Label and description are required'); return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/nodes/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dateStart: form.dateStart ? Number(form.dateStart) : null,
          dateEnd:   form.dateEnd   ? Number(form.dateEnd)   : null,
          claims:        claims.filter(Boolean),
          criticisms:    criticisms.filter(Boolean),
          openQuestions: openQuestions.filter(Boolean),
        }),
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
      <p className="text-sm font-bold text-white">Node proposal submitted for review</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-sm text-red-300">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
        </div>
      )}

      {/* What is a node? */}
      <div className="p-3 rounded-xl bg-purple-900/10 border border-purple-900/25">
        <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">What is a node?</p>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          A node is a research subject — a place, event, phenomenon, person, organisation, or theory
          that belongs in the archive. Nodes are connected to each other through evidence-based relationships.
        </p>
      </div>

      {/* Category — grouped layout */}
      <div>
        <Label>Category *</Label>
        <p className="text-[9px] text-slate-500 mb-2">
          Choose the most specific category that fits your subject.
        </p>
        <div className="flex flex-col gap-3">
          {Object.entries(NODE_CATEGORY_GROUPS).map(([groupName, cats]) => (
            <div key={groupName}>
              <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">{groupName}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {cats.map(c => {
                  const cc = NODE_CATEGORY_COLORS[c] ?? '#94a3b8';
                  const desc = NODE_CATEGORY_DESCRIPTIONS[c];
                  return (
                    <button
                      key={c} onClick={() => set('category', c)}
                      title={desc}
                      className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-left transition-all"
                      style={form.category === c
                        ? { background: cc + '25', border: `1px solid ${cc}`, color: cc }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', color: '#94a3b8' }
                      }
                    >{c}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {form.category && (
          <p className="text-[9px] text-slate-500 mt-2 italic">
            {NODE_CATEGORY_DESCRIPTIONS[form.category as keyof typeof NODE_CATEGORY_DESCRIPTIONS] ?? ''}
          </p>
        )}
      </div>

      <Field label="Label *" value={form.label} onChange={v => set('label', v)} placeholder="e.g. The Antikythera Mechanism" />
      <Field label="Description *" value={form.description} onChange={v => set('description', v)} placeholder="Full research description of this subject…" textarea />

      {/* Evidence level */}
      <div>
        <label className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
          Evidence level <FieldHelp text={EVIDENCE_HELP} />
        </label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {EVIDENCE_LEVELS.map(ev => (
            <button key={ev} onClick={() => set('evidenceLevel', ev)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                form.evidenceLevel === ev ? 'bg-purple-700 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >{ev.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      {/* Confidence */}
      <div>
        <label className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
          Confidence: {Math.round(form.confidence * 100)}%
          <FieldHelp text={CONFIDENCE_HELP} />
        </label>
        <input type="range" min={0} max={1} step={0.05} value={form.confidence}
          onChange={e => set('confidence', Number(e.target.value))}
          className="w-full accent-purple-500 mt-1.5" />
      </div>

      <ListField label="Key claims" items={claims} setItems={setClaims} placeholder="A specific claim about this subject…" />
      <ListField label="Criticisms" items={criticisms} setItems={setCriticisms} placeholder="A counter-argument or objection…" />
      <ListField label="Open questions" items={openQuestions} setItems={setOpenQuestions} placeholder="An unresolved question about this subject…" />

      <Field label="Mainstream academic view" value={form.mainstreamView} onChange={v => set('mainstreamView', v)} placeholder="How do mainstream scholars interpret or classify this?" textarea />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Region" value={form.region} onChange={v => set('region', v)} placeholder="e.g. Middle East" />
        <Field label="Country" value={form.country} onChange={v => set('country', v)} placeholder="e.g. Egypt" />
        <Field label="Date start (year)" value={form.dateStart} onChange={v => set('dateStart', v)} placeholder="e.g. -3000" type="number" />
        <Field label="Date end (year)"   value={form.dateEnd}   onChange={v => set('dateEnd', v)}   placeholder="e.g. -2500" type="number" />
      </div>

      <Field label="Custom node ID (optional)" value={form.nodeId} onChange={v => set('nodeId', v)} placeholder="e.g. antikythera-mechanism" />

      <div className="flex gap-3 mt-2">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-purple-900/40 hover:bg-white/5 flex items-center gap-1.5">
          <X size={13} />Cancel
        </button>
        <button onClick={submit} disabled={status === 'loading'}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-40">
          {status === 'loading' && <Loader2 size={13} className="animate-spin" />}
          Propose node
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{children}</p>;
}

function Field({ label, value, onChange, placeholder, textarea, type }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean; type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className="nexus-input w-full text-sm resize-none mt-1.5" />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type ?? 'text'} className="nexus-input w-full text-sm mt-1.5" />
      }
    </div>
  );
}

function ListField({ label, items, setItems, placeholder }: {
  label: string; items: string[]; setItems: (v: string[]) => void; placeholder: string;
}) {
  const update = (i: number, v: string) => { const a = [...items]; a[i] = v; setItems(a); };
  const add    = () => setItems([...items, '']);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label>{label}</Label>
        <button onClick={add} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
          <Plus size={10} />Add
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => update(i, e.target.value)} placeholder={placeholder} className="nexus-input flex-1 text-sm" />
            {items.length > 1 && (
              <button onClick={() => remove(i)} className="p-2 text-slate-600 hover:text-red-400">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
