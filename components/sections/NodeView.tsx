'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, BookOpen, GitBranch, AlertCircle, Globe, Clock, Link2,
  HelpCircle, FileText, Rabbit, MapPin, ShieldAlert, Search, Zap,
  Shuffle, ExternalLink, Network, ChevronRight,
} from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import ConfidenceMeter from '@/components/research/ConfidenceMeter';
import ResearchScore from '@/components/research/ResearchScore';
import ClaimBlock from '@/components/research/ClaimBlock';
import NodeSourceStrength from '@/components/sources/NodeSourceStrength';
import SimilarityPanel from '@/components/similarity/SimilarityPanel';
import ContradictionsPanel from '@/components/similarity/ContradictionsPanel';
import AlternativesPanel from '@/components/similarity/AlternativesPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DBSource {
  id: string;
  title: string;
  sourceType: string;
  author: string | null;
  publicationYear: number | null;
  url: string | null;
  credibilityScore: number;
  notes: string | null;
}

interface DBNeighbour {
  edge: {
    id: string;
    fromId: string;
    toId: string;
    relationship: string;
    description: string | null;
    confidenceScore: number;
  };
  neighbour: {
    id: string;
    title: string;
    evidenceLevel: string;
    color: string | null;
    icon: string | null;
    category?: { name: string; color: string | null };
  };
}

interface NodeData {
  id: string;
  title: string;
  description: string;
  evidenceLevel: string;
  confidenceScore: number;
  mainstreamView: string | null;
  year: number | null;
  dateStart: number | null;
  dateEnd: number | null;
  datePrecision: string | null;
  region: string | null;
  country: string | null;
  icon: string | null;
  color: string | null;
  category: { name: string; color: string | null };
  tags: string[];
  claims: string[];
  criticisms: string[];
  openQuestions: string[];
}

interface NodeResponse {
  node: NodeData;
  sources: DBSource[];
  neighbours: DBNeighbour[];
  researchScore: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EVIDENCE_COLORS: Record<string, string> = {
  confirmed:   '#22c55e',
  strong:      '#84cc16',
  moderate:    '#eab308',
  weak:        '#f97316',
  speculative: '#64748b',
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  'Academic Paper':       '#6366f1',
  'Archaeological Report':'#a16207',
  'Historical Text':      '#f59e0b',
  'Religious Text':       '#dc2626',
  'Museum Archive':       '#06b6d4',
  'Government Document':  '#22c55e',
  'News Investigation':   '#ec4899',
  'Folklore Collection':  '#8b5cf6',
  'Book':                 '#64748b',
};

function formatYear(y: number): string {
  if (y < 0) return `${Math.abs(y).toLocaleString()} BCE`;
  if (y === 0) return '1 CE';
  return `${y} CE`;
}

function EvidencePill({ level }: { level: string }) {
  const color = EVIDENCE_COLORS[level] ?? '#64748b';
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ color, background: color + '18', border: `1px solid ${color}33` }}
    >
      {level}
    </span>
  );
}

// ── Tab definitions ────────────────────────────────────────────────────────────

type Tab = 'overview' | 'claims' | 'criticisms' | 'mainstream' | 'relationships' | 'sources' | 'questions' | 'integrity' | 'similar' | 'contradictions' | 'alternatives';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',       label: 'Overview',    icon: BookOpen },
  { id: 'claims',         label: 'Claims',      icon: GitBranch },
  { id: 'criticisms',     label: 'Criticisms',  icon: AlertCircle },
  { id: 'mainstream',     label: 'Mainstream',  icon: Globe },
  { id: 'relationships',  label: 'Connections', icon: Link2 },
  { id: 'sources',        label: 'Sources',     icon: FileText },
  { id: 'questions',      label: 'Questions',   icon: HelpCircle },
  { id: 'integrity',      label: 'Balance',     icon: ShieldAlert },
  { id: 'similar',        label: 'Similar',     icon: Search },
  { id: 'contradictions', label: 'Conflicts',   icon: Zap },
  { id: 'alternatives',   label: 'Alternatives',icon: Shuffle },
];

// ── Inline source card using DB shape ─────────────────────────────────────────

function DBSourceCard({ source }: { source: DBSource }) {
  const color = SOURCE_TYPE_COLORS[source.sourceType] ?? '#64748b';
  const pct = Math.round(source.credibilityScore * 100);
  const credColor = pct >= 75 ? '#22c55e' : pct >= 45 ? '#eab308' : '#ef4444';

  return (
    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{source.title}</p>
          {source.author && (
            <p className="text-xs text-slate-500 mt-0.5">{source.author}{source.publicationYear ? ` · ${source.publicationYear}` : ''}</p>
          )}
        </div>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0"
          style={{ color, background: color + '18', border: `1px solid ${color}30` }}
        >
          {source.sourceType}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <ConfidenceMeter score={source.credibilityScore} label="Credibility" />
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 flex-shrink-0"
          >
            <ExternalLink size={10} />
            View
          </a>
        )}
      </div>
      {source.notes && (
        <p className="text-[11px] text-slate-600 italic">{source.notes}</p>
      )}
    </div>
  );
}

// ── Neighbour / connection card ────────────────────────────────────────────────

function NeighbourCard({ item, nodeId }: { item: DBNeighbour; nodeId: string }) {
  const { navigateToNode } = useUserStore();
  const { edge, neighbour } = item;
  const direction = edge.fromId === nodeId ? 'to' : 'from';
  const color = neighbour.color ?? '#7c3aed';
  const evidColor = EVIDENCE_COLORS[neighbour.evidenceLevel] ?? '#64748b';

  return (
    <button
      onClick={() => navigateToNode(neighbour.id, neighbour.title)}
      className="w-full text-left rounded-xl border border-white/5 bg-slate-900/30 hover:bg-slate-900/60 transition-all p-3 space-y-1.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white leading-snug">{neighbour.title}</p>
        <EvidencePill level={neighbour.evidenceLevel} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-slate-500 capitalize">{edge.relationship.replace(/_/g, ' ')}</span>
        {neighbour.category && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
            {neighbour.category.name}
          </span>
        )}
        <span className="text-[10px] text-slate-600">{Math.round(edge.confidenceScore * 100)}% conf.</span>
      </div>
      {edge.description && (
        <p className="text-xs text-slate-600 line-clamp-2">{edge.description}</p>
      )}
    </button>
  );
}

// ── Inline balance/integrity scores using DB data ─────────────────────────────

function BalanceScores({ node, neighbourCount, sourceCount }: {
  node: NodeData;
  neighbourCount: number;
  sourceCount: number;
}) {
  const hasCriticisms  = node.criticisms.length > 0;
  const hasMainstream  = !!(node.mainstreamView);
  const hasClaims      = node.claims.length > 0;
  const hasQuestions   = node.openQuestions.length > 0;
  const hasConnections = neighbourCount > 0;
  const hasSources     = sourceCount > 0;

  const score = [hasCriticisms, hasMainstream, hasClaims, hasQuestions, hasConnections, hasSources]
    .filter(Boolean).length;
  const pct = Math.round((score / 6) * 100);
  const color = pct >= 67 ? '#22c55e' : pct >= 34 ? '#eab308' : '#ef4444';

  const checks = [
    { label: 'Supporting claims documented',    pass: hasClaims },
    { label: 'Critical perspectives included',  pass: hasCriticisms },
    { label: 'Mainstream view recorded',        pass: hasMainstream },
    { label: 'Open questions noted',            pass: hasQuestions },
    { label: 'Source references exist',         pass: hasSources },
    { label: 'Connected to other nodes',        pass: hasConnections },
  ];

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border border-white/5 bg-slate-900/40 flex items-center gap-3">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke={color} strokeWidth="4"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black" style={{ color }}>{pct}</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">Research Completeness</p>
          <p className="text-sm font-bold" style={{ color }}>
            {pct >= 67 ? 'Well-rounded' : pct >= 34 ? 'Developing' : 'Incomplete'}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-2 text-xs">
            <span className={c.pass ? 'text-green-400' : 'text-slate-600'}>{c.pass ? '✓' : '○'}</span>
            <span className={c.pass ? 'text-slate-300' : 'text-slate-600'}>{c.label}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-700 italic">
        Completeness measures research breadth — not factual accuracy. Always verify independently.
      </p>
    </div>
  );
}

// ── Main NodeView ──────────────────────────────────────────────────────────────

export default function NodeView() {
  const { navContext, startRabbitHole, setCurrentView } = useUserStore();
  const nodeId = navContext.nodeId;

  const [data, setData]           = useState<NodeResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAllSources, setShowAllSources]       = useState(false);
  const [showAllNeighbours, setShowAllNeighbours] = useState(false);

  useEffect(() => {
    if (!nodeId) return;
    setLoading(true);
    setError(false);
    setData(null);
    setActiveTab('overview');
    setShowAllSources(false);
    setShowAllNeighbours(false);
    fetch(`/api/nodes/${nodeId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [nodeId]);

  if (!nodeId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-slate-500">No node selected.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="animate-spin text-purple-400" size={24} />
        <p className="text-xs text-slate-500">Loading node…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-sm text-red-400">Failed to load node.</p>
        <button onClick={() => { setLoading(true); setError(false); fetch(`/api/nodes/${nodeId}`).then(r => r.json()).then(setData).catch(() => setError(true)).finally(() => setLoading(false)); }}
          className="text-xs text-purple-400 hover:text-purple-300">Retry</button>
      </div>
    );
  }

  const { node, sources, neighbours, researchScore } = data;
  const nodeColor = node.color ?? node.category?.color ?? '#7c3aed';
  const evidColor = EVIDENCE_COLORS[node.evidenceLevel] ?? '#64748b';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header ──────────────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-white/5"
        style={{ background: `linear-gradient(180deg, ${nodeColor}10 0%, transparent 100%)` }}
      >
        {/* Category + title */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {node.icon && <span className="text-xl">{node.icon}</span>}
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: nodeColor + 'cc' }}
              >
                {node.category?.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">{node.title}</h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentView('research-graph')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass border border-purple-500/20 text-xs text-purple-300 hover:text-purple-200 hover:border-purple-500/40 transition-all"
              title="Open in Research Graph"
            >
              <Network size={12} />
              <span className="hidden sm:inline">Graph</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => startRabbitHole(nodeId)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-xs text-white font-bold transition-all"
              title="Dive Deeper"
            >
              <Rabbit size={12} />
              <span className="hidden sm:inline">Dive</span>
            </motion.button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EvidencePill level={node.evidenceLevel} />
          {node.year !== null && node.year !== undefined && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={10} />{formatYear(node.year)}
            </span>
          )}
          {node.region && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin size={10} />{node.region}{node.country ? `, ${node.country}` : ''}
            </span>
          )}
          {!node.region && node.country && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin size={10} />{node.country}
            </span>
          )}
        </div>

        {/* Tags */}
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {node.tags.slice(0, 8).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar — desktop: top horizontal scroll; mobile: bottom icon strip ── */}

      {/* Desktop tab bar (hidden on mobile) */}
      <div className="hidden sm:block flex-shrink-0 border-b border-purple-900/20">
        <div className="flex overflow-x-auto scrollbar-hide px-2 pt-2 gap-0.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-purple-300 border-purple-500 bg-purple-900/20'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {/* @ts-expect-error lucide size */}
                <Icon size={10} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content ────────────────────────────────────────────────────────── */}
      {/* pb-24 on mobile clears the sticky bottom tab bar + disclaimer banner */}
      <div className="flex-1 overflow-y-auto pb-24 sm:pb-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >

              {/* Overview ────────────────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <>
                  <p className="text-slate-300 text-sm leading-relaxed">{node.description}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <ResearchScore score={typeof researchScore === 'number' ? researchScore : (researchScore as { overall?: number })?.overall ?? 0} />
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                      <ConfidenceMeter score={node.confidenceScore} label="Source Confidence" />
                    </div>
                    <button
                      onClick={() => setActiveTab('relationships')}
                      className="p-3 rounded-lg bg-slate-900/50 border border-white/5 text-left hover:border-purple-500/30 hover:bg-slate-900/80 transition-all"
                    >
                      <div className="text-xs text-slate-500 mb-1">Connections</div>
                      <div className="text-lg font-black text-white">{neighbours.length}</div>
                      <div className="text-xs text-slate-600">linked nodes</div>
                    </button>
                  </div>

                  {(node.dateStart !== null && node.dateStart !== undefined) || node.year !== null ? (
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Clock size={10} /> Timeline
                      </div>
                      {node.dateStart !== null && node.dateStart !== undefined && node.dateEnd !== null && node.dateEnd !== undefined ? (
                        <div className="text-xs text-slate-300">
                          {formatYear(node.dateStart)} — {formatYear(node.dateEnd)}
                          {node.datePrecision && <span className="text-slate-600 ml-1">({node.datePrecision} precision)</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-300">
                          {node.year !== null && node.year !== undefined ? formatYear(node.year) : '—'}
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              )}

              {/* Claims ──────────────────────────────────────────────────────── */}
              {activeTab === 'claims' && (
                <>
                  <div className="p-3 rounded-lg bg-amber-900/10 border border-amber-500/20 text-xs text-amber-400/80 italic">
                    ⚠ The following are claims made by proponents — not established facts.
                  </div>
                  <ClaimBlock claims={node.claims} type="claim" />
                </>
              )}

              {/* Criticisms ──────────────────────────────────────────────────── */}
              {activeTab === 'criticisms' && (
                <>
                  <div className="p-3 rounded-lg bg-cyan-900/10 border border-cyan-500/20 text-xs text-cyan-400/80 italic">
                    ℹ Critical perspectives and counter-arguments.
                  </div>
                  <ClaimBlock claims={node.criticisms} type="criticism" />
                </>
              )}

              {/* Mainstream ──────────────────────────────────────────────────── */}
              {activeTab === 'mainstream' && (
                <div className="p-4 rounded-xl bg-cyan-900/10 border border-cyan-500/20 space-y-2">
                  <div className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <Globe size={14} /> Academic / Mainstream View
                  </div>
                  {node.mainstreamView ? (
                    <>
                      <p className="text-slate-300 text-sm leading-relaxed">{node.mainstreamView}</p>
                      <p className="text-xs text-slate-600 italic mt-2">
                        Presenting mainstream views does not invalidate alternative interpretations.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-600 italic">No mainstream view recorded yet.</p>
                  )}
                </div>
              )}

              {/* Relationships ───────────────────────────────────────────────── */}
              {activeTab === 'relationships' && (
                <>
                  <p className="text-xs text-slate-500">
                    {neighbours.length} documented relationship{neighbours.length !== 1 ? 's' : ''}.
                  </p>
                  {neighbours.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No relationships documented yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(showAllNeighbours ? neighbours : neighbours.slice(0, 15)).map(item => (
                        <NeighbourCard key={item.edge.id} item={item} nodeId={nodeId} />
                      ))}
                      {neighbours.length > 15 && (
                        <button
                          onClick={() => setShowAllNeighbours(s => !s)}
                          className="w-full text-xs text-purple-400 hover:text-purple-300 py-2 border border-purple-900/30 rounded-lg hover:border-purple-500/30 transition-all"
                        >
                          {showAllNeighbours ? 'Show fewer' : `Show all ${neighbours.length} connections`}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Sources ─────────────────────────────────────────────────────── */}
              {activeTab === 'sources' && (
                <>
                  <NodeSourceStrength nodeId={nodeId} />
                  {sources.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
                      <div className="text-slate-600 text-sm">No sources catalogued yet.</div>
                      <div className="text-xs text-slate-700 mt-1">Sources will appear here as the archive is expanded.</div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {(showAllSources ? sources : sources.slice(0, 5)).map(src => (
                          <DBSourceCard key={src.id} source={src} />
                        ))}
                      </div>
                      {sources.length > 5 && (
                        <button
                          onClick={() => setShowAllSources(s => !s)}
                          className="w-full text-xs text-purple-400 hover:text-purple-300 py-2 border border-purple-900/30 rounded-lg hover:border-purple-500/30 transition-all mt-1"
                        >
                          {showAllSources
                            ? 'Show fewer sources'
                            : `Show all ${sources.length} sources`}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Questions ───────────────────────────────────────────────────── */}
              {activeTab === 'questions' && (
                <>
                  <p className="text-xs text-slate-500 italic">Open questions — areas of active debate or incomplete understanding.</p>
                  <ClaimBlock claims={node.openQuestions} type="question" />
                </>
              )}

              {/* Balance ─────────────────────────────────────────────────────── */}
              {activeTab === 'integrity' && (
                <>
                  <p className="text-xs text-slate-500 italic mb-2">
                    Research balance scores help identify one-sided or incomplete entries. They measure
                    presence of criticisms, mainstream perspectives, source diversity, and connections —
                    not factual accuracy.
                  </p>
                  <BalanceScores
                    node={node}
                    neighbourCount={neighbours.length}
                    sourceCount={sources.length}
                  />
                </>
              )}

              {/* Similar ─────────────────────────────────────────────────────── */}
              {activeTab === 'similar' && (
                <>
                  <p className="text-xs text-slate-500 italic mb-2">
                    Nodes with measurable structural similarities. Similarity is NOT evidence of any relationship.
                    It is a research discovery tool only — never a basis for connecting nodes.
                  </p>
                  <SimilarityPanel nodeId={nodeId} />
                </>
              )}

              {/* Contradictions ──────────────────────────────────────────────── */}
              {activeTab === 'contradictions' && (
                <>
                  <p className="text-xs text-slate-500 italic mb-2">
                    Nodes with conflicting evidence levels that share thematic overlap.
                    Findings from one must not be used to validate the other without independent evidence.
                  </p>
                  <ContradictionsPanel nodeId={nodeId} />
                </>
              )}

              {/* Alternatives ───────────────────────────────────────────────── */}
              {activeTab === 'alternatives' && (
                <>
                  <p className="text-xs text-slate-500 italic mb-2">
                    Nodes offering potentially competing or alternative explanations for similar phenomena,
                    drawn from independent source bases. Advisory only — not a basis for creating connections.
                  </p>
                  <AlternativesPanel nodeId={nodeId} />
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile bottom tab strip (visible only on sm and below) ─────────────── */}
      {/* Sits at bottom-6 (above the ~24px disclaimer banner), z-50 wins over FABs */}
      <div className="sm:hidden fixed bottom-6 left-0 right-0 z-50 glass-dark border-t border-purple-900/20">
        <div className="flex overflow-x-auto scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-2 px-1 flex-shrink-0 transition-all ${
                  isActive ? 'text-purple-300' : 'text-slate-600'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isActive ? 'bg-purple-700/40' : ''
                }`}>
                  {/* @ts-expect-error lucide size */}
                  <Icon size={14} />
                </div>
                <span className="text-[8px] font-medium leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
