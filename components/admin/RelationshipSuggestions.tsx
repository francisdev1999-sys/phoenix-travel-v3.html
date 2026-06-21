'use client';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ChevronDown, ChevronUp, Check, X, Pencil, Sparkles, RefreshCw } from 'lucide-react';

interface NodeSummary {
  id:             string;
  title:          string;
  evidenceLevel:  string;
  confidenceScore: number;
  status:         string;
}

interface SignalBreakdown {
  tagScore:      number;
  categoryScore: number;
  dateScore:     number;
  geoScore:      number;
  sourceScore:   number;
  evidenceScore: number;
  total:         number;
}

interface Suggestion {
  id:               string;
  fromNodeId:       string;
  toNodeId:         string;
  relationshipType: string;
  reason:           string;
  evidenceBasis:    string;
  confidenceScore:  number;
  riskLevel:        string;
  signalBreakdown:  SignalBreakdown;
  status:           string;
  reviewNote:       string | null;
  createdAt:        string;
  fromNode:         NodeSummary;
  toNode:           NodeSummary;
}

const TYPE_COLORS: Record<string, string> = {
  contradiction:       'text-red-400 bg-red-900/20 border-red-800/40',
  source_relationship: 'text-blue-400 bg-blue-900/20 border-blue-800/40',
  geographical:        'text-emerald-400 bg-emerald-900/20 border-emerald-800/40',
  historical:          'text-amber-400 bg-amber-900/20 border-amber-800/40',
  thematic:            'text-purple-400 bg-purple-900/20 border-purple-800/40',
  textual:             'text-cyan-400 bg-cyan-900/20 border-cyan-800/40',
  speculative:         'text-slate-400 bg-slate-800/40 border-slate-700/40',
};

const RISK_COLORS: Record<string, string> = {
  low:    'text-emerald-400',
  medium: 'text-amber-400',
  high:   'text-red-400',
};

const EDGE_TYPES = [
  'contradiction', 'source_relationship', 'geographical',
  'historical', 'thematic', 'textual', 'speculative',
];

const STATUS_TABS = ['pending', 'auto_approved', 'approved', 'rejected'] as const;

export default function RelationshipSuggestions() {
  const [suggestions, setSuggestions]   = useState<Suggestion[]>([]);
  const [total,       setTotal]         = useState(0);
  const [loading,     setLoading]       = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'auto_approved' | 'approved' | 'rejected'>('pending');
  const [expanded,    setExpanded]      = useState<string | null>(null);
  const [revising,    setRevising]      = useState<string | null>(null);
  const [revisedType, setRevisedType]   = useState('');
  const [reviewNote,  setReviewNote]    = useState('');
  const [acting,      setActing]        = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/suggestions?status=${statusFilter}&limit=30`)
      .then(r => r.json())
      .then(d => { setSuggestions(d.suggestions ?? []); setTotal(d.total ?? 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'approved' | 'rejected' | 'revised') => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/suggestions/${id}/review`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action,
          reviewNote:  reviewNote || undefined,
          revisedType: action === 'revised' ? revisedType : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? 'Action failed'); return; }
      setRevising(null); setReviewNote(''); setRevisedType('');
      load();
    } catch { alert('Request failed'); }
    finally   { setActing(null); }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-sm font-bold text-white">Relationship Suggestions</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Auto-generated from tag overlap, dates, geography, and shared sources. High-confidence AI-semantic matches between non-speculative nodes publish automatically — everything else waits for review.
          </p>
        </div>
        <button onClick={load} className="text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-purple-900/20 pb-0">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px capitalize transition-all ${
              statusFilter === s
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-600 self-center pr-1">{total} total</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-purple-400" /></div>
      ) : suggestions.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-10">No {statusFilter} suggestions.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {suggestions.map(s => (
            <SuggestionCard
              key={s.id}
              s={s}
              expanded={expanded === s.id}
              onToggle={() => setExpanded(p => p === s.id ? null : s.id)}
              revising={revising === s.id}
              onStartRevise={() => { setRevising(s.id); setRevisedType(s.relationshipType); setReviewNote(''); }}
              onCancelRevise={() => { setRevising(null); setReviewNote(''); }}
              revisedType={revisedType}
              onRevisedTypeChange={setRevisedType}
              reviewNote={reviewNote}
              onReviewNoteChange={setReviewNote}
              acting={acting === s.id}
              onAct={(action) => act(s.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── SuggestionCard ────────────────────────────────────────────────────────────

function SuggestionCard({
  s, expanded, onToggle,
  revising, onStartRevise, onCancelRevise,
  revisedType, onRevisedTypeChange,
  reviewNote, onReviewNoteChange,
  acting, onAct,
}: {
  s: Suggestion;
  expanded: boolean;
  onToggle: () => void;
  revising: boolean;
  onStartRevise: () => void;
  onCancelRevise: () => void;
  revisedType: string;
  onRevisedTypeChange: (v: string) => void;
  reviewNote: string;
  onReviewNoteChange: (v: string) => void;
  acting: boolean;
  onAct: (action: 'approved' | 'rejected' | 'revised') => void;
}) {
  const isPending      = s.status === 'pending';
  const isAutoApproved = s.status === 'auto_approved';

  return (
    <div className={`rounded-xl border transition-all ${
      isPending || isAutoApproved ? 'border-slate-800/50 bg-slate-900/40' : 'border-slate-800/30 bg-slate-900/20 opacity-70'
    }`}>
      {/* Main row */}
      <div className="p-3 flex flex-col gap-2">
        {/* Node pair */}
        <div className="flex items-center gap-2 min-w-0">
          <NodeBadge node={s.fromNode} />
          <span className="text-[10px] text-slate-600 flex-shrink-0">→</span>
          <NodeBadge node={s.toNode} />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize ${TYPE_COLORS[s.relationshipType] ?? TYPE_COLORS.speculative}`}>
            {s.relationshipType.replace(/_/g, ' ')}
          </span>
          <span className={`text-[10px] font-mono font-bold ${
            s.confidenceScore >= 0.65 ? 'text-emerald-400' : s.confidenceScore >= 0.4 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {Math.round(s.confidenceScore * 100)}%
          </span>
          <span className={`text-[10px] ${RISK_COLORS[s.riskLevel]}`}>
            {s.riskLevel} risk
          </span>
          {s.status !== 'pending' && (
            <span className={`text-[10px] font-medium capitalize ${
              ['approved', 'revised', 'auto_approved'].includes(s.status) ? 'text-emerald-400' : 'text-red-400'
            }`}>{s.status.replace(/_/g, ' ')}</span>
          )}
          <button
            onClick={onToggle}
            className="ml-auto flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? 'less' : 'details'}
          </button>
        </div>

        {/* Reason */}
        <p className="text-[11px] text-slate-400 leading-relaxed">{s.reason}</p>

        {/* Expanded: signals + evidence */}
        {expanded && (
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/50">
            <p className="text-[10px] text-slate-500 leading-relaxed">{s.evidenceBasis}</p>
            <SignalBars signals={s.signalBreakdown} />
          </div>
        )}

        {/* Actions — only for pending */}
        {isPending && (
          revising ? (
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/50">
              <div className="flex items-center gap-2">
                <select
                  value={revisedType}
                  onChange={e => onRevisedTypeChange(e.target.value)}
                  className="flex-1 text-xs bg-slate-900 border border-slate-700/50 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none"
                >
                  {EDGE_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={reviewNote}
                onChange={e => onReviewNoteChange(e.target.value)}
                placeholder="Review note (optional)…"
                rows={2}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onAct('revised')}
                  disabled={acting}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-40 transition-colors"
                >
                  {acting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  Approve revised
                </button>
                <button onClick={onCancelRevise} className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/50">
              <button
                onClick={() => onAct('approved')}
                disabled={acting}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-900/20 transition-colors disabled:opacity-40"
              >
                {acting ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                Approve
              </button>
              <button
                onClick={onStartRevise}
                disabled={acting}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-purple-400 hover:bg-purple-900/20 transition-colors disabled:opacity-40"
              >
                <Pencil size={10} />Revise type
              </button>
              <button
                onClick={() => onAct('rejected')}
                disabled={acting}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40 ml-auto"
              >
                <X size={10} />Reject
              </button>
            </div>
          )
        )}

        {/* Auto-approved: edge is already live — only an undo (reject/archive) is available */}
        {isAutoApproved && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/50">
            <span className="text-[10px] text-slate-500">Published automatically — no review was required.</span>
            <button
              onClick={() => onAct('rejected')}
              disabled={acting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40 ml-auto"
            >
              {acting ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
              Reject &amp; archive edge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeBadge({ node }: { node: NodeSummary }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[11px] text-white font-medium truncate max-w-[160px]">{node.title}</span>
      <span className="text-[9px] text-slate-600">{node.evidenceLevel.replace(/_/g, ' ')} · {Math.round(node.confidenceScore * 100)}%</span>
    </div>
  );
}

function SignalBars({ signals }: { signals: SignalBreakdown }) {
  const rows: [string, number][] = [
    ['Tags',      signals.tagScore],
    ['Category',  signals.categoryScore],
    ['Dates',     signals.dateScore],
    ['Geography', signals.geoScore],
    ['Sources',   signals.sourceScore],
    ['Evidence',  signals.evidenceScore],
  ];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] text-slate-600 uppercase tracking-wide">Signal breakdown</span>
      {rows.map(([label, val]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500 w-14 flex-shrink-0">{label}</span>
          <div className="flex-1 h-1 rounded-full bg-slate-800">
            <div
              className="h-1 rounded-full bg-purple-500"
              style={{ width: `${Math.round(val * 100)}%` }}
            />
          </div>
          <span className="text-[9px] text-slate-500 w-6 text-right">{Math.round(val * 100)}</span>
        </div>
      ))}
    </div>
  );
}
