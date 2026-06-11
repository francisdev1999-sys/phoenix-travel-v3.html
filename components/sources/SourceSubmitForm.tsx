'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SOURCE_TYPES } from '@/lib/source-types';
import { SOURCE_TYPE_FIELDS, SOURCE_TYPE_COLORS } from '@/lib/taxonomy/source-types';
import { computeCredibility, CREDIBILITY_LABEL } from '@/lib/source-credibility';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import type { DuplicateCheckResult, SourceRecord } from '@/lib/source-types';
import SourceCard from './SourceCard';
import SourceQualityGuide from './SourceQualityGuide';
import FieldHelp from '@/components/ui/FieldHelp';

interface Props {
  onSuccess: (source: SourceRecord) => void;
  onCancel: () => void;
}

const INITIAL: Record<string, string> = {
  title: '', sourceType: 'Academic Paper', author: '', publicationYear: '',
  publisher: '', journal: '', volume: '', issue: '', pages: '',
  url: '', doi: '', isbn: '', edition: '',
  agency: '', documentNumber: '',
  court: '', caseNumber: '', jurisdiction: '',
  interviewee: '', interviewer: '', interviewDate: '',
  videoUrl: '', recordingDate: '',
  photographer: '', dateTaken: '', photoLocation: '',
  abstract: '', notes: '', sourceTrustExplanation: '', language: 'en',
};

const FIELD_HELP = {
  doi:        'Digital Object Identifier.\nUsed by academic papers and journals.\nExample: 10.1038/s41586-023-06182-9',
  isbn:       'International Standard Book Number.\nFound on the copyright page of published books.\nExample: 9780307474278',
  abstract:   'Brief summary of the source.\n2–5 sentences describing the contents.',
  notes:      'Why is this source important?\nExplain its strengths, weaknesses, limitations, or relevance to the archive.',
  credibility:'Preliminary estimate generated from source metadata.\nFinal credibility is determined after review.',
  trust:      'Explain why this source deserves to be trusted.\n\nGood: "Peer-reviewed and published in Nature."\nGood: "Released by UNESCO."\nGood: "Obtained via FOIA request."\n\nBad: "I found it online."',
};

export default function SourceSubmitForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState<'form' | 'duplicate' | 'submitting' | 'done'>('form');
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const fields = SOURCE_TYPE_FIELDS[form.sourceType as keyof typeof SOURCE_TYPE_FIELDS] ?? {};

  const preview = computeCredibility({
    sourceType:      form.sourceType,
    doi:             form.doi || null,
    isbn:            form.isbn || null,
    url:             form.url || null,
    author:          form.author || null,
    publicationYear: form.publicationYear ? Number(form.publicationYear) : null,
    journal:         form.journal || null,
    publisher:       form.publisher || null,
  });
  const credLabel = CREDIBILITY_LABEL(preview.score);
  const credColor = preview.score >= 0.75 ? '#22c55e' : preview.score >= 0.5 ? '#eab308' : '#ef4444';
  const typeColor = (SOURCE_TYPE_COLORS as Record<string, string>)[form.sourceType] ?? '#94a3b8';

  const checkDuplicates = useCallback(async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.sourceTrustExplanation.trim()) { setError('Please explain why this source should be trusted'); return; }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const doSubmit = async () => {
    setStep('submitting');
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          publicationYear: form.publicationYear ? Number(form.publicationYear) : null,
        }),
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
            <p className="text-xs text-slate-400 mt-1">Review these before submitting.</p>
          </div>
        </div>
        {dupResult?.exact.length ? (
          <div>
            <p className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">Exact matches</p>
            <div className="flex flex-col gap-2">
              {dupResult.exact.map(s => <SourceCard key={s.id} source={s} />)}
            </div>
          </div>
        ) : null}
        {dupResult?.likely.length ? (
          <div>
            <p className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wider">Possible matches</p>
            <div className="flex flex-col gap-2">
              {dupResult.likely.map(s => <SourceCard key={s.id} source={s} />)}
            </div>
          </div>
        ) : null}
        <div className="flex gap-3 mt-2">
          <button onClick={() => setStep('form')} className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-purple-900/40 hover:bg-white/5">
            Go back
          </button>
          <button onClick={doSubmit} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600">
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
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
        </div>
      )}

      {/* What is a source? */}
      <div className="p-3 rounded-xl bg-purple-900/10 border border-purple-900/25">
        <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">What is a source?</p>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          A source is evidence — a document, record, study, or testimony that supports, contradicts, or contextualises a research node.
          Sources are evaluated for credibility before being linked to the archive.
        </p>
      </div>

      {/* Quality guide */}
      <SourceQualityGuide />

      {/* Source type */}
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Source type *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {SOURCE_TYPES.map(t => {
            const tc = (SOURCE_TYPE_COLORS as Record<string, string>)[t] ?? '#94a3b8';
            return (
              <button
                key={t}
                onClick={() => set('sourceType', t)}
                className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-left transition-all"
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
          value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="Full title of the source"
          className="nexus-input w-full text-sm" disabled={isSubmitting}
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

      {/* ── Conditional fields by source type ── */}

      {fields.showJournal && (
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Journal</label>
          <input value={form.journal} onChange={e => set('journal', e.target.value)} placeholder="Journal name" className="nexus-input w-full text-sm" disabled={isSubmitting} />
        </div>
      )}
      {fields.showPublisher && (
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Publisher / Institution</label>
          <input value={form.publisher} onChange={e => set('publisher', e.target.value)} placeholder="Publisher or issuing institution" className="nexus-input w-full text-sm" disabled={isSubmitting} />
        </div>
      )}
      {fields.showEdition && (
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Edition</label>
          <input value={form.edition} onChange={e => set('edition', e.target.value)} placeholder="e.g. 3rd edition" className="nexus-input w-full text-sm" disabled={isSubmitting} />
        </div>
      )}
      {fields.showAgency && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Agency</label>
            <input value={form.agency} onChange={e => set('agency', e.target.value)} placeholder="e.g. CIA, NSA, DIA" className="nexus-input w-full text-sm" disabled={isSubmitting} />
          </div>
          {fields.showDocNumber && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Document number</label>
              <input value={form.documentNumber} onChange={e => set('documentNumber', e.target.value)} placeholder="Reference or doc ID" className="nexus-input w-full text-sm" disabled={isSubmitting} />
            </div>
          )}
        </div>
      )}
      {fields.showCourt && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Court</label>
            <input value={form.court} onChange={e => set('court', e.target.value)} placeholder="Court name" className="nexus-input w-full text-sm" disabled={isSubmitting} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Case number</label>
            <input value={form.caseNumber} onChange={e => set('caseNumber', e.target.value)} placeholder="Case / docket number" className="nexus-input w-full text-sm" disabled={isSubmitting} />
          </div>
          {fields.showJurisdiction && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Jurisdiction</label>
              <input value={form.jurisdiction} onChange={e => set('jurisdiction', e.target.value)} placeholder="e.g. US Federal, UK Crown" className="nexus-input w-full text-sm" disabled={isSubmitting} />
            </div>
          )}
        </div>
      )}
      {fields.showInterviewee && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Interviewee</label>
            <input value={form.interviewee} onChange={e => set('interviewee', e.target.value)} placeholder="Name / title" className="nexus-input w-full text-sm" disabled={isSubmitting} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Interviewer</label>
            <input value={form.interviewer} onChange={e => set('interviewer', e.target.value)} placeholder="Interviewer name" className="nexus-input w-full text-sm" disabled={isSubmitting} />
          </div>
          {fields.showInterviewDate && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Interview date</label>
              <input value={form.interviewDate} onChange={e => set('interviewDate', e.target.value)} type="date" className="nexus-input w-full text-sm" disabled={isSubmitting} />
            </div>
          )}
        </div>
      )}
      {fields.showVideoUrl && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Video URL</label>
            <input value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)} placeholder="https://..." className="nexus-input w-full text-sm" disabled={isSubmitting} />
          </div>
          {fields.showRecordingDate && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Recording date</label>
              <input value={form.recordingDate} onChange={e => set('recordingDate', e.target.value)} type="date" className="nexus-input w-full text-sm" disabled={isSubmitting} />
            </div>
          )}
        </div>
      )}
      {fields.showPhotographer && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Photographer</label>
            <input value={form.photographer} onChange={e => set('photographer', e.target.value)} placeholder="Name or organisation" className="nexus-input w-full text-sm" disabled={isSubmitting} />
          </div>
          {fields.showDateTaken && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Date taken</label>
              <input value={form.dateTaken} onChange={e => set('dateTaken', e.target.value)} type="date" className="nexus-input w-full text-sm" disabled={isSubmitting} />
            </div>
          )}
          {fields.showPhotoLocation && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Location</label>
              <input value={form.photoLocation} onChange={e => set('photoLocation', e.target.value)} placeholder="Where was this taken?" className="nexus-input w-full text-sm" disabled={isSubmitting} />
            </div>
          )}
        </div>
      )}

      {/* URL */}
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">URL</label>
        <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." className="nexus-input w-full text-sm" disabled={isSubmitting} />
      </div>

      {/* Why should this source be trusted — required */}
      <div>
        <label className="flex items-center text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
          Why should this source be trusted? *
          <FieldHelp text={FIELD_HELP.trust} />
        </label>
        <textarea
          value={form.sourceTrustExplanation}
          onChange={e => set('sourceTrustExplanation', e.target.value)}
          rows={3}
          placeholder={`Explain the credibility of this source.\n\nExamples:\n"Peer-reviewed, published in Nature 2022."\n"Declassified via FOIA request."\n"Court-certified testimony from a sworn expert witness."`}
          className="nexus-input w-full text-sm resize-none"
          disabled={isSubmitting}
        />
      </div>

      {/* Advanced identifiers */}
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
              {fields.showDoi !== false && (
                <div>
                  <label className="flex items-center text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    DOI <FieldHelp text={FIELD_HELP.doi} />
                  </label>
                  <input value={form.doi} onChange={e => set('doi', e.target.value)} placeholder="10.xxxx/xxxxx" className="nexus-input w-full text-sm" disabled={isSubmitting} />
                </div>
              )}
              {fields.showIsbn && (
                <div>
                  <label className="flex items-center text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    ISBN <FieldHelp text={FIELD_HELP.isbn} />
                  </label>
                  <input value={form.isbn} onChange={e => set('isbn', e.target.value)} placeholder="978-..." className="nexus-input w-full text-sm" disabled={isSubmitting} />
                </div>
              )}
            </div>

            {fields.showVolumeIssue && (
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
              <label className="flex items-center text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Abstract <FieldHelp text={FIELD_HELP.abstract} />
              </label>
              <textarea value={form.abstract} onChange={e => set('abstract', e.target.value)} rows={4} placeholder="Paste the abstract or a brief summary…" className="nexus-input w-full text-sm resize-none" disabled={isSubmitting} />
            </div>

            <div>
              <label className="flex items-center text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Curator notes <FieldHelp text={FIELD_HELP.notes} />
              </label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional context for reviewers…" className="nexus-input w-full text-sm resize-none" disabled={isSubmitting} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credibility preview */}
      <div className="p-3 rounded-xl bg-white/3 border border-purple-900/20">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            Credibility preview <FieldHelp text={FIELD_HELP.credibility} />
          </p>
          <span className="text-xs font-bold" style={{ color: credColor }}>
            {credLabel} · {Math.round(preview.score * 100)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2">
          <motion.div className="h-full rounded-full" animate={{ width: `${preview.score * 100}%` }} style={{ background: credColor }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
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
        <button onClick={onCancel} disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-purple-900/40 hover:bg-white/5 disabled:opacity-40">
          <X size={14} />Cancel
        </button>
        <button
          onClick={checkDuplicates}
          disabled={isSubmitting || !form.title.trim() || !form.sourceTrustExplanation.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-40 transition-all"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isSubmitting ? 'Submitting…' : 'Submit source'}
        </button>
      </div>
    </div>
  );
}
