'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Brain, ChevronDown, ChevronUp, Clock, Globe,
  Loader2, MapPin, Sparkles, User, Zap,
} from 'lucide-react';

interface Entity {
  id: string; entityType: string; name: string; aliases: string[];
  context: string; confidence: number; matchedNodeId?: string;
}
interface Claim {
  id: string; claimText: string; claimType: string; confidence: number;
  supportedBy?: string; relatedNodeId?: string;
}
interface TimelineRef {
  id: string; year?: number; yearStart?: number; yearEnd?: number;
  datePrecision?: string; description: string; period?: string;
  confidence: number; rawText: string; relatedNodeId?: string;
}
interface LocationRef {
  id: string; name: string; locationType: string; modernName?: string;
  lat?: number; lon?: number; confidence: number; context: string; relatedNodeId?: string;
}
interface PotentialNode {
  id: string; suggestedTitle: string; suggestedCategory: string;
  suggestedDescription: string; suggestedEvidenceLevel: string;
  suggestedConfidence: number; suggestedTags: string[];
  suggestedYear?: number; suggestedLocation?: string;
  reasoning: string; aiConfidence: number; status: string;
}
interface Contradiction {
  id: string; existingNodeId: string; contradictionType: string;
  description: string; sourceClaimText: string; nodeClaimText: string;
  severity: string; aiConfidence: number; status: string;
}
interface RelationshipHint {
  fromNodeId: string; toNodeId: string; relType: string; reason: string; confidence: number;
}
interface Analysis {
  id: string; status: string; aiSummary?: string;
  entityCount: number; claimCount: number; timelineCount: number;
  locationCount: number; nodeCount: number; contradictionCount: number;
  completedAt?: string; processingError?: string;
  entities: Entity[]; claims: Claim[]; timelineRefs: TimelineRef[];
  locationRefs: LocationRef[]; potentialNodes: PotentialNode[];
  contradictions: Contradiction[]; relationshipHints: RelationshipHint[];
}

interface ApiResponse { sourceId: string; analyzed: boolean; analysis: Analysis | null; }

const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.7 ? '#22c55e' : c >= 0.45 ? '#f59e0b' : '#64748b';

const ENTITY_ICON: Record<string, React.ReactNode> = {
  person:       <User size={10} />,
  organization: <span className="text-[9px]">🏛</span>,
  location:     <MapPin size={10} />,
  event:        <Clock size={10} />,
  artifact:     <span className="text-[9px]">⚗️</span>,
  concept:      <Brain size={10} />,
  text:         <span className="text-[9px]">📜</span>,
};

function Section({ title, count, icon, children }: {
  title: string; count: number; icon: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(count > 0);
  if (count === 0) return null;
  return (
    <div className="rounded-xl border border-purple-900/20 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-all">
        <span className="text-purple-400 flex-shrink-0">{icon}</span>
        <span className="flex-1 text-xs font-semibold text-white">{title}</span>
        <span className="text-[10px] text-purple-400 font-bold flex-shrink-0">{count}</span>
        {open ? <ChevronUp size={11} className="text-slate-500" /> : <ChevronDown size={11} className="text-slate-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-purple-900/10 px-3 pb-3 pt-2 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfBadge({ confidence }: { confidence: number }) {
  const c = CONFIDENCE_COLOR(confidence);
  return (
    <span className="flex-shrink-0 text-[9px] font-bold px-1 py-0.5 rounded"
      style={{ background: c + '22', color: c }}>
      {Math.round(confidence * 100)}%
    </span>
  );
}

interface Props { sourceId: string; isAdmin?: boolean; }

export default function SourceIntelligencePanel({ sourceId, isAdmin }: Props) {
  const [data, setData]     = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/sources/${sourceId}/intelligence`)
      .then(r => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => setError('Failed to load intelligence'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [sourceId]);

  const triggerAnalysis = () => {
    setAnalyzing(true);
    fetch(`/api/sources/${sourceId}/analyze`, { method: 'POST' })
      .then(() => setTimeout(load, 2000))
      .catch(() => setError('Failed to start analysis'))
      .finally(() => setAnalyzing(false));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={18} className="animate-spin text-purple-400" />
    </div>
  );

  if (error) return <p className="text-xs text-red-400 py-4">{error}</p>;

  const analysis = data?.analysis;

  if (!data?.analyzed || !analysis) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Brain size={22} className="text-slate-600" />
        <p className="text-xs text-slate-500">No intelligence analysis yet.</p>
        {isAdmin && (
          <button
            onClick={triggerAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-50 transition-all"
          >
            <Sparkles size={11} className={analyzing ? 'animate-pulse' : ''} />
            {analyzing ? 'Analyzing…' : 'Run Analysis'}
          </button>
        )}
      </div>
    );
  }

  const { entities, claims, timelineRefs, locationRefs, potentialNodes, contradictions, relationshipHints } = analysis;

  const statusColor = analysis.status === 'complete' ? '#22c55e' : analysis.status === 'processing' ? '#a855f7' : '#ef4444';

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: statusColor + '30', background: statusColor + '08' }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
        <span className="text-[10px] font-bold capitalize flex-shrink-0" style={{ color: statusColor }}>{analysis.status}</span>
        {analysis.completedAt && (
          <span className="text-[9px] text-slate-600 truncate">
            {new Date(analysis.completedAt).toLocaleString()}
          </span>
        )}
        {isAdmin && (
          <button onClick={triggerAnalysis} disabled={analyzing}
            className="ml-auto flex-shrink-0 text-[9px] text-purple-400 hover:text-purple-300 font-bold disabled:opacity-50">
            {analyzing ? 'Running…' : 'Re-run'}
          </button>
        )}
      </div>

      {analysis.processingError && (
        <p className="text-[10px] text-red-400 px-3">{analysis.processingError}</p>
      )}

      {/* AI Summary */}
      {analysis.aiSummary && (
        <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-900/5">
          <p className="text-[10px] font-bold text-purple-400 mb-1 flex items-center gap-1.5">
            <Brain size={10} /> Archive Intelligence Summary
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed">{analysis.aiSummary}</p>
        </div>
      )}

      {/* Advisory notice */}
      <div className="px-3 py-2 rounded-xl border border-amber-500/15 bg-amber-900/5">
        <p className="text-[9px] text-slate-500 leading-relaxed">
          <span className="text-amber-400 font-bold">Advisory only.</span>{' '}
          AI extracted these items from source metadata. None are published or approved. All require human review.
        </p>
      </div>

      {/* Entities */}
      <Section title="Extracted Entities" count={entities.length} icon={<User size={12} />}>
        {entities.map(e => (
          <div key={e.id} className="flex items-start gap-2 py-1 border-b border-purple-900/10 last:border-0">
            <span className="text-slate-500 flex-shrink-0 mt-0.5">{ENTITY_ICON[e.entityType] ?? <span>◈</span>}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-white">{e.name}</span>
                {e.aliases.length > 0 && (
                  <span className="text-[9px] text-slate-600">({e.aliases.slice(0, 2).join(', ')})</span>
                )}
                <span className="text-[9px] text-slate-600 capitalize">{e.entityType}</span>
                {e.matchedNodeId && (
                  <span className="text-[9px] text-green-400 font-bold">→ node match</span>
                )}
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5 line-clamp-1">{e.context}</p>
            </div>
            <ConfBadge confidence={e.confidence} />
          </div>
        ))}
      </Section>

      {/* Claims */}
      <Section title="Extracted Claims" count={claims.length} icon={<Zap size={12} />}>
        {claims.map(c => (
          <div key={c.id} className="py-1 border-b border-purple-900/10 last:border-0 space-y-0.5">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-[10px] text-slate-300 leading-relaxed">{c.claimText}</p>
              <ConfBadge confidence={c.confidence} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600 capitalize">{c.claimType.replace('_', ' ')}</span>
              {c.relatedNodeId && <span className="text-[9px] text-purple-400">→ {c.relatedNodeId}</span>}
            </div>
            {c.supportedBy && (
              <p className="text-[9px] text-slate-600 italic pl-2 border-l border-purple-900/20">"{c.supportedBy}"</p>
            )}
          </div>
        ))}
      </Section>

      {/* Timeline */}
      <Section title="Timeline References" count={timelineRefs.length} icon={<Clock size={12} />}>
        {timelineRefs.map(t => (
          <div key={t.id} className="flex items-start gap-2 py-1 border-b border-purple-900/10 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {t.year != null && <span className="text-[10px] font-bold text-purple-300">{t.year < 0 ? `${Math.abs(t.year)} BCE` : `${t.year} CE`}</span>}
                {t.yearStart != null && t.year == null && (
                  <span className="text-[10px] font-bold text-purple-300">
                    {t.yearStart < 0 ? `${Math.abs(t.yearStart)} BCE` : t.yearStart}–{t.yearEnd ?? '?'}
                  </span>
                )}
                {t.period && <span className="text-[9px] text-slate-500">{t.period}</span>}
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">{t.description}</p>
              <p className="text-[9px] text-slate-600 italic mt-0.5">"{t.rawText}"</p>
            </div>
            <ConfBadge confidence={t.confidence} />
          </div>
        ))}
      </Section>

      {/* Locations */}
      <Section title="Geographic References" count={locationRefs.length} icon={<Globe size={12} />}>
        {locationRefs.map(l => (
          <div key={l.id} className="flex items-start gap-2 py-1 border-b border-purple-900/10 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-white">{l.name}</span>
                {l.modernName && l.modernName !== l.name && (
                  <span className="text-[9px] text-slate-600">(modern: {l.modernName})</span>
                )}
                <span className="text-[9px] text-slate-600 capitalize">{l.locationType.replace('_', ' ')}</span>
                {l.lat != null && l.lon != null && (
                  <span className="text-[9px] text-green-400">{l.lat.toFixed(2)}, {l.lon.toFixed(2)}</span>
                )}
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5 line-clamp-1">{l.context}</p>
            </div>
            <ConfBadge confidence={l.confidence} />
          </div>
        ))}
      </Section>

      {/* Potential Nodes — admin only */}
      {isAdmin && (
        <Section title="Potential New Nodes" count={potentialNodes.filter(n => n.status === 'pending').length} icon={<Sparkles size={12} />}>
          {potentialNodes.filter(n => n.status === 'pending').map(n => (
            <div key={n.id} className="py-2 border-b border-purple-900/10 last:border-0 space-y-1">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white">{n.suggestedTitle}</p>
                  <p className="text-[9px] text-slate-500">{n.suggestedCategory} · {n.suggestedEvidenceLevel}</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{n.suggestedDescription}</p>
                  <p className="text-[9px] text-slate-600 italic mt-0.5">{n.reasoning}</p>
                </div>
                <ConfBadge confidence={n.aiConfidence} />
              </div>
              {n.suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {n.suggestedTags.slice(0, 5).map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Contradictions */}
      {isAdmin && (
        <Section title="Possible Contradictions" count={contradictions.filter(c => c.status === 'pending').length} icon={<AlertTriangle size={12} />}>
          {contradictions.filter(c => c.status === 'pending').map(c => (
            <div key={c.id} className="py-2 border-b border-amber-900/10 last:border-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{ background: c.severity === 'significant' ? '#ef444422' : c.severity === 'moderate' ? '#f59e0b22' : '#64748b22',
                           color: c.severity === 'significant' ? '#ef4444' : c.severity === 'moderate' ? '#f59e0b' : '#64748b' }}>
                  {c.severity}
                </span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">vs node: {c.existingNodeId}</span>
                <ConfBadge confidence={c.aiConfidence} />
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">{c.description}</p>
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div>
                  <p className="text-purple-400 font-bold mb-0.5">Source says:</p>
                  <p className="text-slate-400 italic">"{c.sourceClaimText}"</p>
                </div>
                <div>
                  <p className="text-amber-400 font-bold mb-0.5">Node says:</p>
                  <p className="text-slate-400 italic">"{c.nodeClaimText}"</p>
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Relationship hints */}
      {isAdmin && relationshipHints.length > 0 && (
        <div className="px-3 py-2 rounded-xl border border-slate-700/30 bg-white/2">
          <p className="text-[10px] font-bold text-slate-500 mb-1.5">Relationship Hints ({relationshipHints.length})</p>
          {relationshipHints.slice(0, 5).map((h, i) => (
            <div key={i} className="text-[9px] text-slate-500 py-0.5">
              <span className="text-slate-400">{h.fromNodeId}</span> → <span className="text-slate-400">{h.toNodeId}</span>
              <span className="text-slate-600 ml-1">({h.relType})</span>
              <span className="text-[9px] text-amber-600 ml-1">advisory only</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
