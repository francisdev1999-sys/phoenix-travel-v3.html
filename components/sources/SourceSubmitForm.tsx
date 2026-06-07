'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SOURCE_TYPES } from '@/lib/source-types';
import { computeCredibility, CREDIBILITY_LABEL, SOURCE_TYPE_COLORS } from '@/lib/source-credibility';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import type { DuplicateCheckResult, SourceRecord } from '@/lib/source-types';
import SourceCard from './SourceCard';

interface Props {
  onSuccess: (source: SourceRecord) => void;
  onCancel: () => void;
}

const INITIAL: Record<string, string> = {
  title: '', sourceType: 'Academic Paper', author: '', publicationYear: '',
  publisher: '', journal: '', volume: '', issue: '', pages: '',
  url: '', doi: '', isbn: '', abstract: '', notes: '', language: 'en',
};

export default function SourceSubmitForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState<'form' | 'duplicate' | 'submitting' | 'done'>('form');
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const preview = computeCredibility({
    sourceType: form.sourceType,
    doi: form.doi || null,
    isbn: form.isbn || null,
    url: form.url || null,
    author: form.author || null,
    publicationYear: form.publicationYear ? Number(form.publicationYear) : null,
    journal: form.journal || null,
    publisher: form.publisher || null,
  });
  const credLabel = CREDIBILITY_LABEL(preview.score);
  const credColor = preview.score >= 0.75 ? '#22c55e' : preview.score >= 0.5 ? '#eab308' : '#ef4444';
  const typeColor = SOURCE_TYPE_COLORS[form.sourceType] ?? '#94a3b8';

  const checkDuplicates = useCallback(async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setError('');
    setStep('submitting');
    try {
      const res = await fetch('/api/sources/duplicate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, doi: form.doi, isbn: form.isbn }),
      });
      const data: DuplicateCheckResult = await res.json();
      setDupResult(data);
      if (data.isDuplicate) {
        setStep('duplicate');
      } else {
        await doSubmit();
      }
    } catch {
      setError('Failed to check for duplicates');
      setStep('form');
    }
  }, [form]);

  const doSubmit = async () => {
    setStep('submitting');
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, publicationYear: form.publicationYear ? Number(form.publicationYear) : null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Submission failed');
        setStep('form');
        return;
      }
      const source: SourceRecord = await res.json();
      setStep('done');
      setTimeout(() => onSuccess(source), 1200);
    } catch {
      setError('Network error — please try again');
      setStep('form');
    }
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <CheckCircle size={48} className="text-green-400" />
        <p className="text-lg font-bold text-white">Source submitted!</p>
        <p className="text-sm text-slate-400 text-center">
          It will be visible after admin review. Thank you for contributing.
        </p>
      </div>
    );
  }

  if (step === 'duplicate') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
          <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-yellow-300">Possible duplicates found</p>
            <p className="text-xs text-slate-400 mt-1">
              These sources may already exist. Review them before submitting.
            </p>
          </div>
        </div>

        {dupResult && dupResult.exact.length > 0 && (
          <div>
            <p className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">Exact matches</p>
            <div className="flex flex-col gap-2">
              {dupResult.exact.map(s => <SourceCard key={s.id} source={s} />)}
            </div>
          </div>
        )}

        {dupResult && dupResult.likely.length > 0 && (
          <div>
            <p className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wider">Possible matches</p>
            <div className="flex flex-col gap-2">
              {dupResult.likely.map(s => <SourceCard key={s.id} source={s} />)}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setStep('form')}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-purple-900/40 hover:bg-white/5"
          >
            Go back
          </button>
          <button
            onClick={doSubmit}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600"
          >
            Submit anyway
          </button>
        </div>
      </div>
    );
  }

  const isSubmitting = step === 'submitting';

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-sm text-red-300">
          <AlertTriangle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Source type */}
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Source type *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SOURCE_TYPES.map(t => {
            const tc = SOURCE_TYPE_COLORS[t] ?? '#94a3b8';
            return (
              <button
                key={t}
                onClick={() => set('sourceType', t)}
                className="px-2 py-2 rounded-lg text-[10px] font-bold text-left transition-all"
                style={form.sourceType === t
                  ? { background: tc + '25', border: `1px solid ${tc}`, color: tc }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', color: '#94a3b8' }
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Title *</label>
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Full title of the source"
          className="nexus-input w-full text-sm"
          disabled={isSubmitting}
        />
      </div>

      {/* Author + year */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Author</label>
          <input value={form.author} onChange={e => set('author', e.target.value)} placeholder="Author name(s)" className="nexus-input w-full text-sm" disabled={isSubmitting} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Year</label>
          <input value={form.publicationYear} onChange={e => set('publicationYear', e.target.value)} placeholder="e.g. 2023" type="number" className="nexus-input w-full text-sm" disabled={isSubmitting} />
        </div>
      </div>

      {/* Journal (for academic) / Publisher */}
      {form.sourceType === 'Academic Paper' && (
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Journal</label>
          <input value={form.journal} onChange={e => set('journal', e.target.value)} placeholder="Journal name" className="nexus-input w-full text-sm" disabled={isSubmitting} />
        </div>
      )}
      {['Book', 'Government Document', 'Museum Archive'].includes(form.sourceType) && (
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Publisher</label>
          <input value={form.publisher} onChange={e => set('publisher', e.target.value)} placeholder="Publisher / institution" className="nexus-input w-full text-sm" disabled={isSubmitting} />
        </div>
      )}

      {/* URL */}
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">URL</label>
        <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." className="nexus-input w-full text-sm" disabled={isSubmitting} />
      </div>

      {/* Advanced */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showAdvanced ? 'Hide' : 'Show'} identifiers & notes
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">DOI</label>
                <input value={form.doi} onChange={e => set('doi', e.target.value)} placeholder="10.xxxx/xxxxx" className="nexus-input w-full text-sm" disabled={isSubmitting} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">ISBN</label>
                <input value={form.isbn} onChange={e => set('isbn', e.target.value)} placeholder="ISBN-13" className="nexus-input w-full text-sm" disabled={isSubmitting} />
              </div>
            </div>

            {form.sourceType === 'Academic Paper' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Volume</label>
                  <input value={form.volume} onChange={e => set('volume', e.target.value)} className="nexus-input w-full text-sm" disabled={isSubmitting} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Issue</label>
                  <input value={form.issue} onChange={e => set('issue', e.target.value)} className="nexus-input w-full text-sm" disabled={isSubmitting} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Pages</label>
                  <input value={form.pages} onChange={e => set('pages', e.target.value)} placeholder="1–24" className="nexus-input w-full text-sm" disabled={isSubmitting} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Abstract</label>
              <textarea value={form.abstract} onChange={e => set('abstract', e.target.value)} rows={4} placeholder="Paste the abstract or a summary..." className="nexus-input w-full text-sm resize-none" disabled={isSubmitting} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Curator notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Why is this relevant? How did you find it?" className="nexus-input w-full text-sm resize-none" disabled={isSubmitting} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credibility preview */}
      <div className="p-3 rounded-xl bg-white/3 border border-purple-900/20">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Credibility preview</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${preview.score * 100}%` }}
              style={{ background: credColor }}
            />
          </div>
          <span className="text-xs font-bold" style={{ color: credColor }}>
            {credLabel} &middot; {Math.round(preview.score * 100)}%
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(preview.factors).filter(([, v]) => v !== 0).map(([k, v]) => (
            <span key={k} className="text-[9px] px-1.5 py-0.5 rounded" style={{
              background: v > 0 ? '#22c55e15' : '#ef444415',
              color: v > 0 ? '#86efac' : '#fca5a5',
            }}>
              {k.replace(/_/g, ' ')} {v > 0 ? `+${v}` : v}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-purple-900/40 hover:bg-white/5 disabled:opacity-40"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          onClick={checkDuplicates}
          disabled={isSubmitting || !form.title.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-40 transition-all"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isSubmitting ? 'Submitting…' : 'Submit source'}
        </button>
      </div>
    </div>
  );
}
