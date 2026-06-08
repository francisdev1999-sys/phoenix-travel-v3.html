'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Link2, X, Calendar, User, BookOpen, Hash } from 'lucide-react';
import { SOURCE_TYPE_COLORS, STATUS_COLORS, CREDIBILITY_LABEL, effectiveCredibility } from '@/lib/source-credibility';
import type { SourceRecord } from '@/lib/source-types';

interface Props {
  source: SourceRecord;
  isAdmin?: boolean;
  onClose: () => void;
  onReview?: (sourceId: string, action: string, notes: string) => void;
  onDeleted?: (sourceId: string) => void;
}

const TABS = ['Overview', 'Links', 'Credibility'] as const;

export default function SourceDetailPanel({ source, isAdmin, onClose, onReview }: Props) {
  const [tab, setTab] = useState<typeof TABS[number]>('Overview');
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'needs_revision'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [overrideMsg, setOverrideMsg] = useState('');

  const typeColor = SOURCE_TYPE_COLORS[source.sourceType] ?? '#94a3b8';
  const statColor = STATUS_COLORS[source.status] ?? '#94a3b8';
  const effScore  = effectiveCredibility(source as { credibilityScore: number; credibilityOverride?: number | null });
  const credColor = effScore >= 0.75 ? '#22c55e' : effScore >= 0.5 ? '#eab308' : '#ef4444';

  const handleOverride = async () => {
    const val = overrideValue === '' ? null : parseFloat(overrideValue);
    if (val !== null && (isNaN(val) || val < 0 || val > 1)) {
      setOverrideMsg('Score must be between 0 and 1');
      return;
    }
    setOverriding(true); setOverrideMsg('');
    try {
      const res = await fetch(`/api/sources/${source.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credibilityOverride: val, overrideReason: overrideReason.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setOverrideMsg(`Override set to ${Math.round((data.effectiveScore ?? 0) * 100)}%`);
        setOverrideValue(''); setOverrideReason('');
      } else {
        setOverrideMsg(data.error ?? 'Override failed');
      }
    } finally { setOverriding(false); }
  };

  const handleReview = async () => {
    setReviewing(true);
    try {
      const res = await fetch(`/api/sources/${source.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: reviewAction, reviewNotes }),
      });
      if (res.ok && onReview) {
        onReview(source.id, reviewAction, reviewNotes);
      }
    } finally {
      setReviewing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-purple-900/20 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}44` }}
              >
                {source.sourceType}
              </span>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
                style={{ background: statColor + '22', color: statColor }}
              >
                {source.status.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white leading-snug">{source.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 flex-shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t ? 'bg-purple-900/50 text-purple-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {tab === 'Overview' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {source.author && (
                <Fact icon={<User size={12} />} label="Author" value={source.author} />
              )}
              {source.publicationYear && (
                <Fact icon={<Calendar size={12} />} label="Year" value={String(source.publicationYear)} />
              )}
              {source.journal && (
                <Fact icon={<BookOpen size={12} />} label="Journal" value={source.journal} />
              )}
              {source.publisher && (
                <Fact icon={<BookOpen size={12} />} label="Publisher" value={source.publisher} />
              )}
              {source.doi && (
                <Fact icon={<Hash size={12} />} label="DOI" value={source.doi} />
              )}
              {source.isbn && (
                <Fact icon={<Hash size={12} />} label="ISBN" value={source.isbn} />
              )}
            </div>

            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 px-3 py-2 rounded-lg bg-cyan-900/10 border border-cyan-500/20"
              >
                <ExternalLink size={12} />
                Open source URL
              </a>
            )}

            {source.abstract && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Abstract</p>
                <p className="text-xs text-slate-300 leading-relaxed">{source.abstract}</p>
              </div>
            )}

            {source.notes && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Curator notes</p>
                <p className="text-xs text-slate-400 leading-relaxed">{source.notes}</p>
              </div>
            )}

            {source.submitter && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-purple-900/20">
                {source.submitter.image ? (
                  <img src={source.submitter.image} alt="" className="w-6 h-6 rounded-full border border-purple-500/30" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-purple-800 flex items-center justify-center text-xs text-white font-bold">
                    {source.submitter.name?.[0] ?? 'U'}
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-300">{source.submitter.name ?? 'Anonymous'}</p>
                  <p className="text-[10px] text-slate-500">Submitted {new Date(source.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            {source.reviewNotes && (
              <div className="p-3 rounded-xl bg-yellow-900/10 border border-yellow-500/20">
                <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-1">Review notes</p>
                <p className="text-xs text-slate-300">{source.reviewNotes}</p>
              </div>
            )}

            {/* Admin review panel */}
            {isAdmin && source.status === 'pending' && onReview && (
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-purple-900/10 border border-purple-500/20">
                <p className="text-xs font-bold text-purple-300">Admin Review</p>
                <div className="flex gap-2">
                  {(['approved', 'rejected', 'needs_revision'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => setReviewAction(a)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${
                        reviewAction === a
                          ? a === 'approved' ? 'bg-green-700 text-white'
                          : a === 'rejected' ? 'bg-red-700 text-white'
                          : 'bg-yellow-700 text-white'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {a.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Review notes (optional)"
                  rows={2}
                  className="nexus-input text-xs resize-none"
                />
                <button
                  onClick={handleReview}
                  disabled={reviewing}
                  className="py-2 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-40"
                >
                  {reviewing ? 'Submitting…' : 'Submit review'}
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'Links' && (
          <div className="flex flex-col gap-2">
            {!source.links || source.links.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No graph links yet.</p>
            ) : (
              source.links.map(link => (
                <div key={link.id} className="p-3 rounded-xl bg-white/5 border border-purple-900/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Link2 size={11} className="text-purple-400" />
                    <span className="text-xs font-semibold text-white capitalize">{link.linkType}</span>
                    <span className="text-[10px] text-slate-500">→ {link.targetType}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{link.targetId}</p>
                  {link.claimIndex != null && (
                    <p className="text-[10px] text-slate-500">Claim #{link.claimIndex + 1}</p>
                  )}
                  {link.notes && <p className="text-xs text-slate-400 mt-1">{link.notes}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'Credibility' && (
          <div className="flex flex-col gap-4">
            {/* Effective score bar */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${effScore * 100}%`, background: credColor }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold" style={{ color: credColor }}>
                {CREDIBILITY_LABEL(effScore)} · {Math.round(effScore * 100)}%
              </span>
            </div>

            {/* Override notice */}
            {(source as { credibilityOverride?: number | null }).credibilityOverride != null && (
              <div className="px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30 text-[10px] text-amber-300">
                Admin override active (auto-score: {Math.round(source.credibilityScore * 100)}%)
              </div>
            )}

            {source.credibilityFactors && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Auto-score breakdown</p>
                {Object.entries(source.credibilityFactors as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3">
                    <span className="text-xs text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-bold" style={{ color: v >= 0 ? '#86efac' : '#fca5a5' }}>
                      {v > 0 ? '+' : ''}{v}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Admin override panel — requirement: admin must approve final credibility */}
            {isAdmin && (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admin credibility override</p>
                <p className="text-[10px] text-slate-500">
                  Override the auto-computed score. Leave blank to clear an existing override.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0" max="1" step="0.01"
                    value={overrideValue}
                    onChange={e => setOverrideValue(e.target.value)}
                    placeholder="0.00 – 1.00"
                    className="w-28 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-700/60"
                  />
                  <input
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="flex-1 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-700/60"
                  />
                  <button
                    onClick={handleOverride}
                    disabled={overriding}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-700 hover:bg-amber-600 transition-colors disabled:opacity-40"
                  >
                    {overriding ? '…' : 'Set'}
                  </button>
                </div>
                {overrideMsg && <p className="text-[10px] text-amber-300">{overrideMsg}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider">
        {icon} {label}
      </p>
      <p className="text-xs text-slate-300 font-medium truncate">{value}</p>
    </div>
  );
}
