'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, ChevronDown, ChevronUp, Loader2, Check, X, AlertTriangle } from 'lucide-react';

interface FeedbackUser {
  id: string; name: string | null; email: string | null; role: string;
}
interface FeedbackItem {
  id: string; category: string; severity: string; page: string;
  description: string; reproSteps: string | null;
  status: string; adminNotes: string | null;
  createdAt: string; resolvedAt: string | null;
  user: FeedbackUser | null;
}

const SEV_COLOR: Record<string, string> = {
  low: '#64748b', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626',
};
const STATUS_COLORS: Record<string, string> = {
  open:      'text-amber-300 bg-amber-900/20 border-amber-500/30',
  reviewing: 'text-blue-300 bg-blue-900/20 border-blue-500/30',
  resolved:  'text-green-300 bg-green-900/20 border-green-500/30',
  dismissed: 'text-slate-400 bg-slate-800/40 border-slate-600/20',
};

function FeedbackCard({ item, onUpdate }: { item: FeedbackItem; onUpdate: () => void }) {
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes]   = useState(item.adminNotes ?? '');

  const updateStatus = async (status: string) => {
    setLoading(true);
    await fetch(`/api/admin/beta/feedback/${item.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status, adminNotes: notes }),
    }).finally(() => { setLoading(false); onUpdate(); });
  };

  const sc = SEV_COLOR[item.severity] ?? '#64748b';

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: sc + '30' }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <AlertTriangle size={11} style={{ color: sc }} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white capitalize">{item.category.replace(/_/g, ' ')}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${STATUS_COLORS[item.status] ?? STATUS_COLORS.open}`}>
              {item.status}
            </span>
          </div>
          <p className="text-[9px] text-slate-500 truncate mt-0.5">
            {item.description.slice(0, 80)} · page: {item.page} · {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[9px] font-bold px-1 py-0.5 rounded uppercase" style={{ background: sc + '22', color: sc }}>{item.severity}</span>
          <button onClick={() => setOpen(o => !o)} className="p-0.5 text-slate-500 hover:text-white">
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t pt-2 space-y-2" style={{ borderColor: sc + '20' }}>
              <p className="text-[10px] text-slate-300 leading-relaxed">{item.description}</p>
              {item.reproSteps && (
                <div>
                  <p className="text-[9px] font-bold text-slate-500 mb-0.5">Steps:</p>
                  <p className="text-[9px] text-slate-400 whitespace-pre-wrap">{item.reproSteps}</p>
                </div>
              )}
              {item.user && (
                <p className="text-[9px] text-slate-600">
                  From: {item.user.name ?? item.user.email ?? 'Anonymous'} · {item.user.role}
                </p>
              )}

              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Admin notes…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-slate-600 resize-none focus:outline-none focus:border-purple-500/40"
              />

              <div className="flex flex-wrap gap-1.5">
                {item.status !== 'reviewing' && (
                  <button onClick={() => updateStatus('reviewing')} disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-blue-300 bg-blue-900/20 hover:bg-blue-800/30 disabled:opacity-50">
                    Mark Reviewing
                  </button>
                )}
                {item.status !== 'resolved' && (
                  <button onClick={() => updateStatus('resolved')} disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-green-300 bg-green-900/20 hover:bg-green-800/30 disabled:opacity-50">
                    <Check size={9} /> Resolve
                  </button>
                )}
                {item.status !== 'dismissed' && (
                  <button onClick={() => updateStatus('dismissed')} disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-slate-400 bg-slate-800/40 hover:bg-slate-700/40 disabled:opacity-50">
                    <X size={9} /> Dismiss
                  </button>
                )}
                {loading && <Loader2 size={11} className="animate-spin text-purple-400 self-center" />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BetaFeedbackAdmin() {
  const [items, setItems]     = useState<FeedbackItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter]   = useState('open');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter)   params.set('status',   statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (severityFilter) params.set('severity', severityFilter);

    fetch(`/api/admin/beta/feedback?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, categoryFilter, severityFilter]);

  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquarePlus size={16} className="text-amber-400" /> Beta Feedback
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{total} total · Filter and triage below</p>
        </div>
        <button onClick={load} className="text-[10px] text-amber-400 hover:text-amber-300 font-bold">Refresh</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {['', 'open', 'reviewing', 'resolved', 'dismissed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                statusFilter === s ? 'bg-amber-900/40 text-amber-300' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none">
          <option value="">All categories</option>
          {['bug','usability','credibility','discovery','content','other'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none">
          <option value="">All severities</option>
          {['low','medium','high','critical'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-amber-400" size={20} /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">No feedback matching these filters.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <FeedbackCard key={item.id} item={item} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
