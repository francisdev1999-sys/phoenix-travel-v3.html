'use client';
import { useState } from 'react';
import {
  ArrowLeft, Save, Send, Archive, Loader2, AlertCircle,
  Pencil, BookMarked, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import TextFieldModal    from './TextFieldModal';
import NodeSourceManager from './NodeSourceManager';
import NodeVersionHistory from './NodeVersionHistory';

interface DraftNode {
  id:                string;
  title:             string;
  description:       string;
  mainstreamView:    string | null;
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

const EVIDENCE_LEVELS  = ['verified', 'strong_evidence', 'debated', 'speculative', 'mythological'];
const REVIEW_STATUSES  = ['', 'ready_to_review', 'review_required', 'needs_enrichment', 'soft_rejected'];
const IQS_TIER_COLORS: Record<string, string> = {
  ready_to_review:  'text-emerald-400',
  review_required:  'text-amber-400',
  needs_enrichment: 'text-orange-400',
  soft_rejected:    'text-red-400',
};

function listToString(arr: string[]) { return arr.join('\n'); }
function stringToList(s: string)     { return s.split('\n').map(l => l.trim()).filter(Boolean); }

type ModalField = 'description' | 'mainstreamView' | null;
type SidePanel  = 'sources' | 'history' | null;

export default function InlineNodeEditor({ node, onCancel, onSaved }: Props) {
  // Editable scalars
  const [title,             setTitle]             = useState(node.title);
  const [description,       setDescription]       = useState(node.description ?? '');
  const [mainstreamView,    setMainstreamView]    = useState(node.mainstreamView ?? '');
  const [evidenceLevel,     setEvidenceLevel]     = useState(node.evidenceLevel);
  const [confidenceScore,   setConfidenceScore]   = useState(String(node.confidenceScore));
  const [claims,            setClaims]            = useState(listToString(node.claims));
  const [criticisms,        setCriticisms]        = useState(listToString(node.criticisms));
  const [openQuestions,     setOpenQuestions]     = useState(listToString(node.openQuestions));
  const [tags,              setTags]              = useState(node.tags.join(', '));
  const [adminReviewStatus, setAdminReviewStatus] = useState(node.adminReviewStatus ?? '');
  const [adminReviewNote,   setAdminReviewNote]   = useState(node.adminReviewNote ?? '');

  // UI state
  const [modal,       setModal]       = useState<ModalField>(null);
  const [sidePanel,   setSidePanel]   = useState<SidePanel>(null);
  const [saving,      setSaving]      = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [archiving,   setArchiving]   = useState(false);
  const [error,       setError]       = useState('');

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (!description.trim()) return 'Description is required';
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
          description:       description.trim(),
          mainstreamView:    mainstreamView.trim() || null,
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
    const err = validate();
    if (err) { setError(`Fix before publishing: ${err}`); return; }
    if (!confirm(`Publish "${title}"? This will make it live immediately.`)) return;
    setPublishing(true); setError('');
    try {
      // Save pending edits first, then publish
      const patchRes = await fetch(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:             title.trim(),
          description:       description.trim(),
          mainstreamView:    mainstreamView.trim() || null,
          evidenceLevel,
          confidenceScore:   parseFloat(confidenceScore),
          claims:            stringToList(claims),
          criticisms:        stringToList(criticisms),
          openQuestions:     stringToList(openQuestions),
          tags:              tags.split(',').map(t => t.trim()).filter(Boolean),
          adminReviewStatus: adminReviewStatus || null,
          adminReviewNote:   adminReviewNote.trim() || null,
          changeNote:        'Pre-publish save',
        }),
      });
      if (!patchRes.ok) { const d = await patchRes.json(); setError(d.error ?? 'Save failed'); return; }

      const pubRes = await fetch(`/api/nodes/${node.id}/publish`, { method: 'POST' });
      if (!pubRes.ok) { const d = await pubRes.json(); setError(d.error ?? 'Publish failed'); return; }
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

  const togglePanel = (p: SidePanel) => setSidePanel(prev => prev === p ? null : p);

  return (
    <>
      {/* Text field modals */}
      {modal === 'description' && (
        <TextFieldModal
          label="Description"
          value={description}
          onSave={setDescription}
          onClose={() => setModal(null)}
          minLength={20}
          hint="Full description of the node. Minimum 20 characters."
        />
      )}
      {modal === 'mainstreamView' && (
        <TextFieldModal
          label="Mainstream View"
          value={mainstreamView}
          onSave={setMainstreamView}
          onClose={() => setModal(null)}
          hint="What does mainstream scholarship / consensus say about this topic?"
        />
      )}

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
              {node.category && <span>{node.category.name}</span>}
            </div>
          </div>
          {/* Panel toggles */}
          <div className="flex items-center gap-1">
            <PanelToggle icon={<BookMarked size={12} />} label="Sources" active={sidePanel === 'sources'} onClick={() => togglePanel('sources')} />
            <PanelToggle icon={<History size={12} />}    label="History" active={sidePanel === 'history'} onClick={() => togglePanel('history')} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-700/30 text-xs text-red-400">
            <AlertCircle size={12} />{error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {/* Title */}
          <Field label="Title">
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
          </Field>

          {/* Description — modal button */}
          <Field label="Description">
            <LongTextPreview
              value={description}
              placeholder="No description yet. Click to edit…"
              onClick={() => setModal('description')}
            />
          </Field>

          {/* Mainstream View — modal button */}
          <Field label="Mainstream View">
            <LongTextPreview
              value={mainstreamView}
              placeholder="No mainstream view yet. Click to edit…"
              onClick={() => setModal('mainstreamView')}
            />
          </Field>

          {/* Evidence + Confidence */}
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

          {/* Tags */}
          <Field label="Tags (comma-separated)">
            <input value={tags} onChange={e => setTags(e.target.value)} className={inputCls} placeholder="ancient egypt, artifacts, mystery" />
          </Field>

          {/* Claims */}
          <Field label="Claims (one per line)">
            <textarea rows={4} value={claims} onChange={e => setClaims(e.target.value)} className={textareaCls} />
          </Field>

          {/* Criticisms */}
          <Field label="Criticisms (one per line)">
            <textarea rows={3} value={criticisms} onChange={e => setCriticisms(e.target.value)} className={textareaCls} />
          </Field>

          {/* Open Questions */}
          <Field label="Open Questions (one per line)">
            <textarea rows={3} value={openQuestions} onChange={e => setOpenQuestions(e.target.value)} className={textareaCls} />
          </Field>

          {/* Review fields */}
          <Field label="Admin Review Status">
            <select value={adminReviewStatus} onChange={e => setAdminReviewStatus(e.target.value)} className={inputCls}>
              {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : '— none —'}</option>)}
            </select>
          </Field>

          <Field label="Admin Note">
            <textarea rows={2} value={adminReviewNote} onChange={e => setAdminReviewNote(e.target.value)} className={textareaCls} placeholder="Internal note for reviewers…" />
          </Field>
        </div>

        {/* Side panels — Sources and Version History */}
        {sidePanel === 'sources' && (
          <Section label="Source Links" onClose={() => setSidePanel(null)}>
            <NodeSourceManager nodeId={node.id} />
          </Section>
        )}

        {sidePanel === 'history' && (
          <Section label="Version History" onClose={() => setSidePanel(null)}>
            <NodeVersionHistory nodeId={node.id} />
          </Section>
        )}

        {/* Action bar */}
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
              {publishing ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {publishing ? 'Publishing…' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function LongTextPreview({ value, placeholder, onClick }: { value: string; placeholder: string; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = value.trim().length > 0;
  const preview    = value.slice(0, 120);
  const overflow   = value.length > 120;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900 overflow-hidden">
      <div className="px-2.5 py-2 text-xs text-slate-300 leading-relaxed min-h-[2.5rem]">
        {hasContent ? (
          <>
            {expanded ? value : preview}{overflow && !expanded ? '…' : ''}
          </>
        ) : (
          <span className="text-slate-600 italic">{placeholder}</span>
        )}
      </div>
      <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-slate-800/50 bg-slate-900/50">
        {overflow ? (
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        ) : <span />}
        <button
          onClick={onClick}
          className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Pencil size={10} />Edit in full view
        </button>
      </div>
    </div>
  );
}

function PanelToggle({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
        active
          ? 'bg-purple-900/40 text-purple-300'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
      }`}
    >
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Section({ label, children, onClose }: { label: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="rounded-xl border border-purple-900/30 bg-slate-900/30 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
        <button onClick={onClose} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">✕</button>
      </div>
      {children}
    </div>
  );
}

const inputCls    = 'w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60';
const textareaCls = `${inputCls} resize-none`;
