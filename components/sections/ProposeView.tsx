'use client';
/**
 * Propose a Node — the contribution funnel. A guided form that posts to the
 * real /api/nodes/propose review queue (nothing auto-publishes). Awards +30 XP
 * on a successful submission and lists the visitor's own proposals with their
 * review status.
 */
import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { FilePlus, Check, Loader2, LogIn } from 'lucide-react';
import { NODE_CATEGORIES, EVIDENCE_LEVELS } from '@/lib/validation/enums';
import { useEngagement } from '@/lib/store/engagementStore';

interface MyProposal { id: string; label: string; status: string; createdAt: string }

const MIN_DESC = 30;

export default function ProposeView() {
  const { status } = useSession();
  const recordProposal = useEngagement(s => s.recordProposal);

  const [label, setLabel]       = useState('');
  const [category, setCategory] = useState<string>(NODE_CATEGORIES[0] ?? '');
  const [evidence, setEvidence] = useState<string>('speculative');
  const [year, setYear]         = useState('');
  const [description, setDesc]  = useState('');
  const [reason, setReason]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [mine, setMine]         = useState<MyProposal[]>([]);

  const loadMine = () => {
    fetch('/api/nodes/propose')
      .then(r => (r.ok ? r.json() : []))
      .then((rows: Array<{ id: string; label: string; status: string; createdAt: string }>) =>
        setMine(rows.map(r => ({ id: r.id, label: r.label, status: r.status, createdAt: r.createdAt }))))
      .catch(() => {});
  };
  useEffect(() => { if (status === 'authenticated') loadMine(); }, [status]);

  const valid = label.trim() && category && description.trim().length >= MIN_DESC;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true); setError(null);
    try {
      const yr = Number(year);
      const res = await fetch('/api/nodes/propose', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label:         label.trim(),
          category,
          description:   description.trim(),
          evidenceLevel: evidence,
          confidence:    0.5,
          claims:        reason.trim() ? [reason.trim()] : [],
          criticisms:    [],
          openQuestions: [],
          mainstreamView: '',
          tags:          [],
          dateStart:     Number.isFinite(yr) && year ? yr : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Could not submit — please try again.');
        return;
      }
      const created = await res.json().catch(() => ({}));
      if (created?.id) recordProposal(created.id);
      setDone(true);
      setLabel(''); setYear(''); setDesc(''); setReason('');
      loadMine();
      setTimeout(() => setDone(false), 4000);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <FilePlus size={28} className="text-purple-400 mx-auto mb-4" />
        <h1 className="text-xl font-black text-white mb-2">Propose a Node</h1>
        <p className="text-sm text-slate-400 mb-6">Sign in to contribute a topic to the archive. Every proposal goes through review — nothing publishes automatically.</p>
        <button onClick={() => signIn('google')} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm">
          <LogIn size={15} /> Sign in to propose
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <FilePlus size={18} className="text-purple-400" />
        <h1 className="text-xl font-black text-white">Propose a Node</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">Suggest a new topic. Reviewers verify it against sources before it joins the graph.</p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. The Antikythera Mechanism" className={inputCls} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Category">
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {NODE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Evidence">
            <select value={evidence} onChange={e => setEvidence(e.target.value)} className={inputCls}>
              {EVIDENCE_LEVELS.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Year (optional)">
            <input value={year} onChange={e => setYear(e.target.value.replace(/[^\d-]/g, ''))} inputMode="numeric" placeholder="-2000" className={inputCls} />
          </Field>
        </div>

        <Field label="What is it?">
          <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Describe the topic in a sentence or two…" className={inputCls} />
          <div className={`text-[11px] mt-1 ${description.trim().length >= MIN_DESC ? 'text-emerald-400' : 'text-slate-500'}`}>
            {description.trim().length}/{MIN_DESC} characters minimum
          </div>
        </Field>

        <Field label="Why does it belong? (optional)">
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="How does it connect to the archive's themes?" className={inputCls} />
        </Field>

        {error && <div className="text-xs text-red-400">{error}</div>}

        <button
          type="submit"
          disabled={!valid || saving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-700 enabled:hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : done ? <Check size={15} /> : <FilePlus size={15} />}
          {done ? 'Submitted for review · +30 XP' : 'Submit proposal · +30 XP'}
        </button>
      </form>

      {mine.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-black text-white uppercase tracking-widest mb-3">Your proposals</h2>
          <div className="space-y-2">
            {mine.map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between gap-3">
                <span className="text-sm text-slate-200 truncate">{p.label}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                  p.status === 'approved' ? 'bg-emerald-400/15 text-emerald-400'
                  : p.status === 'rejected' ? 'bg-red-400/15 text-red-400'
                  : 'bg-amber-400/15 text-amber-400'}`}>
                  {p.status === 'pending' ? 'pending review' : p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-white/[0.03] border border-white/[0.07] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
