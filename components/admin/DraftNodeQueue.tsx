'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Filter, RefreshCw, Loader2 } from 'lucide-react';
import InlineNodeEditor from './InlineNodeEditor';

interface IQSResult {
  score: number;
  tier:  string;
}

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
  importBatchId:     string | null;
  createdAt:         string;
  edgeCount:         number;
  sourceCount:       number;
  iqs:               IQSResult;
}

const IQS_TIER_COLORS: Record<string, string> = {
  ready_to_review:  'text-emerald-400 bg-emerald-900/30',
  review_required:  'text-amber-400 bg-amber-900/30',
  needs_enrichment: 'text-orange-400 bg-orange-900/30',
  soft_rejected:    'text-red-400 bg-red-900/30',
};

const TIERS = [
  { value: '',                  label: 'All tiers'  },
  { value: 'ready_to_review',   label: 'Ready (≥80)' },
  { value: 'review_required',   label: 'Review (60–79)' },
  { value: 'needs_enrichment',  label: 'Enrich (40–59)' },
  { value: 'soft_rejected',     label: 'Rejected (<40)' },
];

const EVIDENCE_LEVELS = ['', 'verified', 'strong_evidence', 'debated', 'speculative', 'mythological'];

export default function DraftNodeQueue() {
  const [nodes,     setNodes]     = useState<DraftNode[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [selected,  setSelected]  = useState<DraftNode | null>(null);
  const [iqsTier,   setIqsTier]   = useState('');
  const [evidence,  setEvidence]  = useState('');
  const [page,      setPage]      = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', status: 'draft' });
    if (iqsTier)  params.set('iqsTier', iqsTier);
    if (evidence) params.set('evidenceLevel', evidence);
    fetch(`/api/nodes/drafts?${params}`)
      .then(r => r.json())
      .then(d => {
        setNodes(d.nodes ?? []);
        setTotalPages(d.pagination?.pages ?? 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, iqsTier, evidence]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => {
    setSelected(null);
    load();
  };

  if (selected) {
    return (
      <InlineNodeEditor
        node={selected}
        onCancel={() => setSelected(null)}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={12} className="text-slate-500" />
          <select
            value={iqsTier}
            onChange={e => { setIqsTier(e.target.value); setPage(1); }}
            className="text-xs bg-slate-900 border border-slate-700/50 rounded-lg px-2 py-1 text-slate-300 focus:outline-none"
          >
            {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={evidence}
            onChange={e => { setEvidence(e.target.value); setPage(1); }}
            className="text-xs bg-slate-900 border border-slate-700/50 rounded-lg px-2 py-1 text-slate-300 focus:outline-none capitalize"
          >
            {EVIDENCE_LEVELS.map(e => <option key={e} value={e}>{e || 'All levels'}</option>)}
          </select>
        </div>
        <button onClick={load} className="text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
      ) : nodes.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">No draft nodes match these filters.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {nodes.map(node => (
            <motion.button
              key={node.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(node)}
              className="w-full text-left p-3 rounded-xl border border-slate-800/50 bg-slate-900/40 hover:border-purple-700/40 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-white truncate">{node.title}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-mono">{node.id}</span>
                    {node.category && <span className="text-[10px] text-slate-500">{node.category.name}</span>}
                    <span className="text-[10px] text-slate-500 capitalize">{node.evidenceLevel.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${IQS_TIER_COLORS[node.iqs.tier] ?? 'text-slate-400'}`}>
                    IQS {node.iqs.score}
                  </span>
                  {node.adminReviewStatus && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-900/30 text-purple-400">
                      {node.adminReviewStatus.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-40 border border-slate-700/50">Prev</button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-40 border border-slate-700/50">Next</button>
        </div>
      )}
    </div>
  );
}
