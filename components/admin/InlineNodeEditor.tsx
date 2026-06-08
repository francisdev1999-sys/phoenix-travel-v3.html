'use client';
import { useState } from 'react';
import { ArrowLeft, Save, Send, Archive, Loader2, AlertCircle } from 'lucide-react';

interface DraftNode {
  id:                string;
  title:             string;
  status:            string;
  evidenceLevel:     string;
  confidenceScore:   number;
  category:          { name: string; color: string | null } | null;
  tags:              string[];
  claims:            string[];
  criticisms:        string[];
  openQuestions:     string[];
  adminReviewStatus: string | null;
  adminReviewNote:   string | null;
  iqs:               { score: number; tier: string };
}

interface Props {
  node:     DraftNode;
  onCancel: () => void;
  onSaved:  () => void;
}

const EVIDENCE_LEVELS = ['verified', 'strong_evidence', 'debated', 'speculative', 'mythological'];
const REVIEW_STATUSES = ['', 'ready_to_review', 'review_required', 'needs_enrichment', 'soft_rejected'];
const IQS_TIER_COLORS: Record<string, string> = {
  ready_to_review:  'text-emerald-400',
  review_required:  'text-amber-400',
  needs_enrichment: 'text-orange-400',
  soft_rejected:    'text-red-400',
};

function listToString(arr: string[]) { return arr.join('\n'); }
function stringToList(s: string)     { return s.split('\n').map(l => l.trim()).filter(Boolean); }

export default function InlineNodeEditor({ node, onCancel, onSaved }: Props) {
  const [title,             setTitle]             = useState(node.title);
  const [evidenceLevel,     setEvidenceLevel]     = useState(node.evidenceLevel);
  const [confidenceScore,   setConfidenceScore]   = useState(String(node.confidenceScore));
  const [claims,            setClaims]            = useState(listToString(node.claims));
  const [criticisms,        setCriticisms]        = useState(listToString(node.criticisms));
  const [openQuestions,     setOpenQuestions]     = useState(listToString(node.openQuestions));
  const [tags,              setTags]              = useState(node.tags.join(', '));
  const [adminReviewStatus, setAdminReviewStatus] = useState(node.adminReviewStatus ?? '');
  const [adminReviewNote,   setAdminReviewNote]   = useState(node.adminReviewNote ?? '');
  const [saving,  setSaving]  = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving,  setArchiving]  = useState(false);
  const [error,   setError]   = useState('');

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required';
    const cs = parseFloat(confidenceScore);
    if (isNaN(cs) || cs < 0 || cs > 1) return 'Confidence score must be between 0 and 1';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:             title.trim(),
          evidenceLevel,
          confidenceScore:   parseFloat(confidenceScore),
          claims:            stringToList(claims),
          criticisms:        stringToList(criticisms),
          openQuestions:     stringToList(openQuestions),
          tags:              tags.split(',').map(t => t.trim()).filter(Boolean),
          adminReviewStatus: adminReviewStatus || null,
          adminReviewNote:   adminReviewNote.trim() || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Save failed'); return; }
      onSaved();
    } catch { setError('Request failed'); }
    finally { setSaving(false); }
  };

  const publish = async () => {
    if (!confirm(`Publish "${title}"? This will make it live immediately.`)) return;
    setPublishing(true); setError('');
    try {
      const res = await fetch(`/api/nodes/${node.id}/publish`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Publish failed'); return; }
      onSaved();
    } catch { setError('Request failed'); }
    finally { setPublishing(false); }
  };

  const archive = async () => {
    if (!confirm(`Archive "${title}"? It will no longer appear in the draft queue.`)) return;
    setArchiving(true); setError('');
    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived', changeNote: 'Archived by admin' }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Archive failed'); return; }
      onSaved();
    } catch { setError('Request failed'); }
    finally { setArchiving(false); }
  };

  const isBusy = saving || publishing || archiving;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white truncate">{node.title}</h2>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="font-mono">{node.id}</span>
            <span className={IQS_TIER_COLORS[node.iqs.tier]}>IQS {node.iqs.score}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-700/30 text-xs text-red-400">
          <AlertCircle size={12} />{error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <Field label="Title">
          <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Evidence Level">
            <select value={evidenceLevel} onChange={e => setEvidenceLevel(e.target.value)} className={inputCls}>
              {EVIDENCE_LEVELS.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Confidence (0–1)">
            <input type="number" min="0" max="1" step="0.01" value={confidenceScore} onChange={e => setConfidenceScore(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Tags (comma-separated)">
          <input value={tags} onChange={e => setTags(e.target.value)} className={inputCls} placeholder="ancient egypt, artifacts, mystery" />
        </Field>

        <Field label="Claims (one per line)">
          <textarea rows={4} value={claims} onChange={e => setClaims(e.target.value)} className={textareaCls} />
        </Field>

        <Field label="Criticisms (one per line)">
          <textarea rows={3} value={criticisms} onChange={e => setCriticisms(e.target.value)} className={textareaCls} />
        </Field>

        <Field label="Open Questions (one per line)">
          <textarea rows={3} value={openQuestions} onChange={e => setOpenQuestions(e.target.value)} className={textareaCls} />
        </Field>

        <Field label="Admin Review Status">
          <select value={adminReviewStatus} onChange={e => setAdminReviewStatus(e.target.value)} className={inputCls}>
            {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : '— none —'}</option>)}
          </select>
        </Field>

        <Field label="Admin Note">
          <textarea rows={2} value={adminReviewNote} onChange={e => setAdminReviewNote(e.target.value)} className={textareaCls} placeholder="Internal note for reviewers…" />
        </Field>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/50">
        <button
          onClick={archive}
          disabled={isBusy || node.status === 'archived'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
        >
          {archiving ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}Archive
        </button>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}Save
          </button>
          <button
            onClick={publish}
            disabled={isBusy || node.status === 'published'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 transition-colors disabled:opacity-40"
          >
            {publishing ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls    = 'w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60';
const textareaCls = `${inputCls} resize-none`;
