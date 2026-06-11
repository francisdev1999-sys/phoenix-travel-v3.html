'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, ChevronDown, Check, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { id: 'bug',         label: 'Bug / Error' },
  { id: 'usability',  label: 'Hard to Use' },
  { id: 'credibility',label: 'Credibility Concern' },
  { id: 'discovery',  label: 'Discovery / Search' },
  { id: 'content',    label: 'Content Issue' },
  { id: 'other',      label: 'Other' },
] as const;

const SEVERITIES = [
  { id: 'low',      label: 'Low',      color: '#64748b' },
  { id: 'medium',   label: 'Medium',   color: '#f59e0b' },
  { id: 'high',     label: 'High',     color: '#ef4444' },
  { id: 'critical', label: 'Critical', color: '#dc2626' },
] as const;

interface FeedbackWidgetProps {
  currentView?: string;
}

export default function FeedbackWidget({ currentView = 'unknown' }: FeedbackWidgetProps) {
  const [open, setOpen]         = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [category,    setCategory]    = useState<string>('');
  const [severity,    setSeverity]    = useState<string>('medium');
  const [description, setDescription] = useState('');
  const [reproSteps,  setReproSteps]  = useState('');

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const reset = () => {
    setCategory('');
    setSeverity('medium');
    setDescription('');
    setReproSteps('');
    setError(null);
    setSubmitted(false);
  };

  const submit = async () => {
    if (!category) { setError('Please select a category.'); return; }
    if (description.trim().length < 10) { setError('Please describe the issue (min 10 characters).'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/beta/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ category, severity, page: currentView, description, reproSteps }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Submission failed');
      }
      setSubmitted(true);
      setTimeout(() => { setOpen(false); reset(); }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setOpen(o => !o); if (!open) reset(); }}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all glass border border-amber-500/30 hover:border-amber-500/60"
        title="Send Feedback"
      >
        <MessageSquarePlus size={18} className="text-amber-300" />
      </motion.button>

      {/* Feedback panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-16 right-4 z-50 w-80 rounded-2xl glass-dark border border-amber-900/30 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-amber-900/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus size={14} className="text-amber-400" />
                <span className="text-sm font-bold text-white">Beta Feedback</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-10 h-10 rounded-full bg-green-900/40 border border-green-500/30 flex items-center justify-center">
                    <Check size={18} className="text-green-400" />
                  </div>
                  <p className="text-sm font-bold text-white">Thank you!</p>
                  <p className="text-xs text-slate-400 text-center">Your feedback helps improve the archive. Closing in a moment…</p>
                </div>
              ) : (
                <>
                  {/* Category */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Category</label>
                    <div className="grid grid-cols-2 gap-1">
                      {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setCategory(c.id)}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-medium text-left transition-all ${
                            category === c.id
                              ? 'bg-amber-700/40 border border-amber-500/40 text-amber-200'
                              : 'bg-white/3 border border-white/5 text-slate-400 hover:text-white hover:border-white/15'
                          }`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Severity</label>
                    <div className="flex gap-1">
                      {SEVERITIES.map(s => (
                        <button key={s.id} onClick={() => setSeverity(s.id)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            severity === s.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                          }`}
                          style={severity === s.id ? { background: s.color + '33', borderColor: s.color + '66', border: '1px solid' } : { border: '1px solid transparent' }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Description <span className="text-red-400">*</span></label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      placeholder="What happened? What did you expect?"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 resize-none focus:outline-none focus:border-amber-500/40"
                    />
                  </div>

                  {/* Repro steps (collapsible) */}
                  <details className="group">
                    <summary className="text-[10px] font-bold text-slate-500 cursor-pointer hover:text-slate-300 flex items-center gap-1 list-none">
                      <ChevronDown size={10} className="group-open:rotate-180 transition-transform" />
                      Steps to reproduce (optional)
                    </summary>
                    <textarea
                      value={reproSteps}
                      onChange={e => setReproSteps(e.target.value)}
                      rows={2}
                      placeholder="1. Go to…&#10;2. Click…&#10;3. See error"
                      className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 resize-none focus:outline-none focus:border-amber-500/40"
                    />
                  </details>

                  {error && (
                    <p className="text-[10px] text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-2 py-1.5">{error}</p>
                  )}

                  <button
                    onClick={submit}
                    disabled={loading}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white bg-amber-700/60 hover:bg-amber-600/60 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : null}
                    {loading ? 'Sending…' : 'Send Feedback'}
                  </button>

                  <p className="text-[9px] text-slate-600 text-center">
                    Page: <span className="text-slate-500">{currentView}</span> · Anonymous feedback is welcome
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
