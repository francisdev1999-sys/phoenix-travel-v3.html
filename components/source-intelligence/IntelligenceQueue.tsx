'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Brain, Check, ChevronDown, ChevronUp, Loader2, Sparkles, X } from 'lucide-react';

interface SourceMeta { id: string; title: string; sourceType: string; author?: string; }
interface PotentialNode {
  id: string; suggestedTitle: string; suggestedCategory: string;
  suggestedDescription: string; suggestedEvidenceLevel: string;
  suggestedConfidence: number; suggestedTags: string[]; reasoning: string;
  aiConfidence: number; status: string; source: SourceMeta;
}
interface Contradiction {
  id: string; existingNodeId: string; contradictionType: string;
  description: string; sourceClaimText: string; nodeClaimText: string;
  severity: string; aiConfidence: number; status: string; source: SourceMeta;
}
interface QueueResponse {
  potentialNodes: PotentialNode[];
  contradictions: Contradiction[];
  totals: { potentialNodes: number; contradictions: number };
}

const SEV_COLOR: Record<string, string> = {
  minor: '#64748b', moderate: '#f59e0b', significant: '#ef4444',
};

function PotentialNodeCard({ item, onAction }: {
  item: PotentialNode;
  onAction: (id: string, action: 'approve' | 'dismiss') => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const act = async (action: 'approve' | 'dismiss') => {
    setLoading(true);
    await onAction(item.id, action).finally(() => setLoading(false));
  };

  return (
    <div className="rounded-xl border border-purple-900/20 bg-white/3 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Sparkles size={11} className="text-purple-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{item.suggestedTitle}</p>
          <p className="text-[9px] text-slate-500">{item.suggestedCategory} · {item.suggestedEvidenceLevel} · from: {item.source.title.slice(0, 40)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[9px] text-purple-400 font-bold">{Math.round(item.aiConfidence * 100)}%</span>
          <button onClick={() => setOpen(o => !o)} className="p-0.5 text-slate-500 hover:text-white">
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-purple-900/10 pt-2 space-y-2">
              <p className="text-[10px] text-slate-400 leading-relaxed">{item.suggestedDescription}</p>
              <p className="text-[9px] text-slate-600 italic">{item.reasoning}</p>
              {item.suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.suggestedTags.map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => act('approve')} disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-green-700/60 hover:bg-green-600/60 disabled:opacity-50 transition-all">
                  <Check size={10} /> Approve as Draft
                </button>
                <button
                  onClick={() => act('dismiss')} disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-300 bg-slate-700/40 hover:bg-slate-600/40 disabled:opacity-50 transition-all">
                  <X size={10} /> Dismiss
                </button>
              </div>
              <p className="text-[9px] text-slate-700 italic">Approve creates a DRAFT node requiring separate publish action. Never auto-published.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContradictionCard({ item, onAction }: {
  item: Contradiction;
  onAction: (id: string, action: 'approve' | 'dismiss') => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sc = SEV_COLOR[item.severity] ?? '#64748b';

  const act = async (action: 'approve' | 'dismiss') => {
    setLoading(true);
    await onAction(item.id, action).finally(() => setLoading(false));
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: sc + '30' }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <AlertTriangle size={11} style={{ color: sc }} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{item.description.slice(0, 60)}</p>
          <p className="text-[9px] text-slate-500">vs node: {item.existingNodeId} · from: {item.source.title.slice(0, 35)}</p>
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
              <p className="text-[10px] text-slate-400 leading-relaxed">{item.description}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] text-purple-400 font-bold mb-0.5">Source claims:</p>
                  <p className="text-[9px] text-slate-400 italic">"{item.sourceClaimText}"</p>
                </div>
                <div>
                  <p className="text-[9px] text-amber-400 font-bold mb-0.5">Node says:</p>
                  <p className="text-[9px] text-slate-400 italic">"{item.nodeClaimText}"</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => act('approve')} disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-amber-700/50 hover:bg-amber-600/50 disabled:opacity-50 transition-all">
                  <Check size={10} /> Flag for Review
                </button>
                <button
                  onClick={() => act('dismiss')} disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-300 bg-slate-700/40 hover:bg-slate-600/40 disabled:opacity-50 transition-all">
                  <X size={10} /> Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function IntelligenceQueue() {
  const [data, setData]     = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'nodes' | 'contradictions'>('nodes');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/source-intelligence/queue?status=pending&limit=100')
      .then(r => r.json())
      .then((d: QueueResponse) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleAction = async (id: string, action: 'approve' | 'dismiss', type: 'potential_node' | 'contradiction') => {
    await fetch(`/api/admin/source-intelligence/suggestions/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, type }),
    });
    load();
  };

  if (loading) return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="animate-spin text-purple-400" size={20} />
    </div>
  );

  if (!data) return <p className="text-xs text-red-400">Failed to load queue.</p>;

  const pendingNodes = data.potentialNodes.filter(n => n.status === 'pending');
  const pendingContra = data.contradictions.filter(c => c.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Brain size={16} className="text-purple-400" /> Source Intelligence Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">AI-extracted suggestions awaiting human review. Nothing is published without explicit approval.</p>
        </div>
        <button onClick={load} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold">Refresh</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-purple-900/20">
        {([['nodes', 'Potential Nodes', pendingNodes.length], ['contradictions', 'Contradictions', pendingContra.length]] as const).map(([id, label, count]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all -mb-px
              ${tab === id ? 'border-purple-500 text-purple-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {label}
            {count > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-700/60 text-purple-200">{count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'nodes' && (
        <div className="space-y-2">
          {pendingNodes.length === 0
            ? <p className="text-xs text-slate-500 py-6 text-center">No pending node suggestions.</p>
            : pendingNodes.map(n => (
              <PotentialNodeCard key={n.id} item={n}
                onAction={(id, action) => handleAction(id, action, 'potential_node')} />
            ))
          }
        </div>
      )}

      {tab === 'contradictions' && (
        <div className="space-y-2">
          {pendingContra.length === 0
            ? <p className="text-xs text-slate-500 py-6 text-center">No pending contradiction flags.</p>
            : pendingContra.map(c => (
              <ContradictionCard key={c.id} item={c}
                onAction={(id, action) => handleAction(id, action, 'contradiction')} />
            ))
          }
        </div>
      )}
    </div>
  );
}
