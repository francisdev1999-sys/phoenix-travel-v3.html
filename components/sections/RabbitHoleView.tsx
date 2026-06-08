'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rabbit, Search, RotateCcw, ChevronRight, MapPin, Clock, BookMarked, Network, Compass, X, Loader2, ExternalLink } from 'lucide-react';
import { nodes as staticNodes } from '@/lib/graph';
import { CATEGORY_COLORS, EVIDENCE_COLORS } from '@/lib/graph';
import { formatYear, RELATIONSHIP_COLORS, RELATIONSHIP_LABELS, TIER_COLORS, scoreTier, type RabbitHoleData, type RHConnection, type RHPath } from '@/lib/rabbit-hole';
import { useUserStore } from '@/lib/store/userStore';
import ConnectionCard from '@/components/rabbit-hole/ConnectionCard';
import PathCard from '@/components/rabbit-hole/PathCard';
import type { SourceRecord } from '@/lib/source-types';
import type { GraphNode } from '@/lib/graph/types';

type Tab = 'connections' | 'paths' | 'sources' | 'locations' | 'timeline';

interface ApiData extends RabbitHoleData {
  sources:        SourceRecord[];
  sourceCountMap: Record<string, number>;
}

// ── Node search ───────────────────────────────────────────────────────────────
function NodeSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState('');
  const results = q.length >= 2
    ? staticNodes.filter(n =>
        n.title.toLowerCase().includes(q.toLowerCase()) ||
        n.id.includes(q.toLowerCase()) ||
        n.category.toLowerCase().includes(q.toLowerCase()),
      ).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search any node to start exploring…"
          className="nexus-input w-full pl-9 text-sm"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X size={13} />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-xl bg-slate-950 border border-purple-900/40 shadow-2xl overflow-hidden">
          {results.map(n => {
            const cc = CATEGORY_COLORS[n.category] ?? '#7c3aed';
            return (
              <button key={n.id} onClick={() => { onSelect(n.id); setQ(''); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/10 transition-all border-b border-purple-900/20 last:border-0">
                <span className="text-base">{n.icon ?? '◈'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{n.title}</p>
                  <p className="text-[10px]" style={{ color: cc }}>{n.category}</p>
                </div>
                <span className="text-[10px] text-slate-500">{Math.round(n.confidence_score * 100)}%</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({ history, currentId, onNavigate }: {
  history: string[]; currentId: string; onNavigate: (id: string, historyIndex: number) => void;
}) {
  const allIds = [...history, currentId];
  if (allIds.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
      {allIds.map((id, i) => {
        const n = staticNodes.find(x => x.id === id);
        const isCurrent = i === allIds.length - 1;
        return (
          <div key={id + i} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <ChevronRight size={10} className="text-slate-600" />}
            <button
              onClick={() => !isCurrent && onNavigate(id, i)}
              className={`px-2 py-0.5 rounded-md transition-all ${
                isCurrent
                  ? 'text-purple-300 bg-purple-900/30 font-bold cursor-default'
                  : 'text-slate-500 hover:text-white hover:bg-white/10'
              }`}
            >
              {n?.icon ?? '◈'} {n?.title ?? id}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Node header card ──────────────────────────────────────────────────────────
function NodeHeader({ node, score }: { node: GraphNode; score: number }) {
  const catColor = CATEGORY_COLORS[node.category] ?? '#7c3aed';
  const evColor  = EVIDENCE_COLORS[node.evidence_level] ?? '#94a3b8';
  const pct      = Math.round(score * 100);
  const tier     = scoreTier(score);
  const tierColor = TIER_COLORS[tier];

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-purple-900/30">
      <span className="text-3xl leading-none">{node.icon ?? '◈'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: catColor + '22', color: catColor }}>
            {node.category}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: evColor + '18', color: evColor }}>
            {(node.evidence_level ?? 'unknown').replace('_', ' ')}
          </span>
        </div>
        <h2 className="text-base font-bold text-white leading-snug">{node.title}</h2>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{node.description}</p>
      </div>
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="text-xl font-bold" style={{ color: tierColor }}>{pct}</div>
        <div className="text-[9px] text-slate-500 uppercase tracking-wider">score</div>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function RabbitHoleView() {
  const { rabbitHoleNodeId, setRabbitHoleNodeId, pendingRabbitHoleNodeId, setPendingRabbitHoleNodeId } = useUserStore();
  // Start from a pending node if the user navigated here via search/graph,
  // otherwise show the empty search prompt (don't auto-load stale persisted state).
  const [currentId, setCurrentId] = useState<string>(() => pendingRabbitHoleNodeId ?? '');
  const [history,   setHistory]   = useState<string[]>([]);
  const [data,      setData]      = useState<ApiData | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [tab,       setTab]       = useState<Tab>('connections');
  const [relFilter, setRelFilter] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  // Clear the pending node signal immediately after consuming it on mount
  useEffect(() => {
    if (pendingRabbitHoleNodeId) setPendingRabbitHoleNodeId(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (id: string) => {
    if (!id) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rabbit-hole/${id}`, { signal: ctrl.signal });
      if (!res.ok) { setData(null); setError('Node not found'); setLoading(false); return; }
      const json: ApiData = await res.json();
      setData(json);
    } catch (e) {
      if ((e as { name?: string }).name !== 'AbortError') setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(currentId); }, [currentId, load]);

  const navigate = (id: string) => {
    setHistory(prev => [...prev, currentId]);
    setCurrentId(id);
    setRabbitHoleNodeId(id);
    setTab('connections');
    setRelFilter('');
  };

  const goBack = (id: string, historyIndex: number) => {
    setHistory(prev => prev.slice(0, historyIndex));
    setCurrentId(id);
    setRabbitHoleNodeId(id);
    setTab('connections');
    setRelFilter('');
  };

  const reset = () => {
    setHistory([]);
    setCurrentId('');
    setData(null);
    setError('');
    setRabbitHoleNodeId(null);
  };

  // Filter connections by relationship type
  const filteredConnections: RHConnection[] = data
    ? (relFilter ? data.connections.filter(c => c.edge.relationship_type === relFilter) : data.connections)
    : [];

  const relTypes = data
    ? [...new Set(data.connections.map(c => c.edge.relationship_type))]
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TABS: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'connections', label: 'Connections', icon: Network,    count: data?.connections.length },
    { id: 'paths',       label: 'Paths',       icon: Compass,    count: data?.paths.length },
    { id: 'sources',     label: 'Sources',     icon: BookMarked, count: data?.sources.length },
    { id: 'locations',   label: 'Locations',   icon: MapPin,     count: data?.locations.length },
    { id: 'timeline',    label: 'Timeline',    icon: Clock,      count: data?.timelines.length },
  ];

  // ── Empty / search state ───────────────────────────────────────────────────
  if (!currentId) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-purple-900/20 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <Rabbit size={18} className="text-purple-400" />
            <h1 className="text-lg font-bold text-white">Rabbit Hole Intelligence</h1>
          </div>
          <p className="text-xs text-slate-500">Select any node to begin evidence-based exploration of the knowledge graph.</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
          <div className="w-full max-w-md">
            <NodeSearch onSelect={id => { setCurrentId(id); setRabbitHoleNodeId(id); }} />
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600 mb-4">Or explore a featured starting point</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['book-of-enoch', 'great-pyramid', 'gobekli-tepe', 'flood-narratives', 'dead-sea-scrolls', 'atlantis'].map(id => {
                const n = staticNodes.find(x => x.id === id);
                if (!n) return null;
                return (
                  <button key={id} onClick={() => { setCurrentId(id); setRabbitHoleNodeId(id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-purple-900/30 hover:border-purple-500/40 hover:bg-white/10 text-slate-300 transition-all">
                    <span>{n.icon ?? '◈'}</span>{n.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-purple-900/20 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Rabbit size={16} className="text-purple-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <NodeSearch onSelect={navigate} />
          </div>
          <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white flex-shrink-0 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all">
            <RotateCcw size={12} />Reset
          </button>
        </div>
        <Breadcrumb history={history} currentId={currentId} onNavigate={goBack} />
      </div>

      {/* Content */}
      {/* Thin loading bar — no blink, stays behind existing content */}
      {loading && (
        <div className="h-0.5 bg-purple-600 animate-pulse flex-shrink-0" />
      )}

      {loading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-purple-400" />
            <p className="text-xs text-slate-500">Computing intelligence paths…</p>
          </div>
        </div>
      )}

      {error && !data && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {data && (
        <div className={`flex-1 overflow-hidden flex flex-col lg:flex-row transition-opacity duration-200 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
          {/* LEFT — node + connections list */}
          <div className="lg:w-[380px] flex-shrink-0 border-r border-purple-900/20 overflow-y-auto p-4 flex flex-col gap-3">
            <NodeHeader node={data.node} score={data.connections[0]?.score ?? data.node.confidence_score} />

            {/* Relationship filter pills */}
            {relTypes.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setRelFilter('')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                    !relFilter ? 'bg-purple-700 text-white' : 'text-slate-500 hover:text-white bg-white/5'
                  }`}
                >
                  All ({data.connections.length})
                </button>
                {relTypes.map(rt => {
                  const rc = RELATIONSHIP_COLORS[rt as keyof typeof RELATIONSHIP_COLORS] ?? '#94a3b8';
                  const rl = RELATIONSHIP_LABELS[rt as keyof typeof RELATIONSHIP_LABELS] ?? rt;
                  const cnt = data.connections.filter(c => c.edge.relationship_type === rt).length;
                  return (
                    <button key={rt} onClick={() => setRelFilter(relFilter === rt ? '' : rt)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                      style={relFilter === rt
                        ? { background: rc, color: '#fff' }
                        : { background: rc + '18', color: rc, border: `1px solid ${rc}33` }
                      }
                    >
                      {rl} ({cnt})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Connection list */}
            <div className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {filteredConnections.map((conn, i) => (
                  <ConnectionCard
                    key={conn.node.id}
                    conn={conn}
                    onExplore={navigate}
                    sourceCount={data.sourceCountMap?.[conn.node.id]}
                    index={i}
                  />
                ))}
              </AnimatePresence>
              {filteredConnections.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No connections match this filter.</p>
              )}
            </div>
          </div>

          {/* RIGHT — tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex gap-1 px-4 pt-3 border-b border-purple-900/20 overflow-x-auto flex-shrink-0">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
                      tab === t.id ? 'border-purple-500 text-purple-300' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Icon size={12} />
                    {t.label}
                    {t.count != null && t.count > 0 && (
                      <span className="ml-0.5 text-[9px] bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded-full">{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-y-auto p-4"
              >
                {/* ── CONNECTIONS (detailed view) ── */}
                {tab === 'connections' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                      {filteredConnections.length} direct connection{filteredConnections.length !== 1 ? 's' : ''}, ranked by evidence quality
                    </p>
                    {filteredConnections.map((conn, i) => (
                      <div key={conn.node.id} className="p-4 rounded-xl bg-white/4 border border-purple-900/20 flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{conn.node.icon ?? '◈'}</span>
                          <div className="flex-1 min-w-0">
                            <button onClick={() => navigate(conn.node.id)} className="text-sm font-bold text-white hover:text-purple-300 transition-colors text-left">
                              {conn.node.title}
                            </button>
                            <p className="text-[10px] text-slate-400 mt-0.5">{conn.node.description.slice(0, 120)}…</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-purple-900/40 pl-3">
                          "{conn.edge.explanation}"
                        </p>
                        <p className="text-[10px] text-slate-600">
                          <span className="text-slate-500 font-bold">Evidence basis:</span> {conn.edge.evidence_basis}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── PATHS ── */}
                {tab === 'paths' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                      {data.paths.length} suggested exploration paths
                    </p>
                    {data.paths.length === 0 ? (
                      <p className="text-xs text-slate-500 py-8 text-center">No multi-hop paths found from this node.</p>
                    ) : (
                      data.paths.map((path, i) => (
                        <PathCard key={i} path={path} onExplore={navigate} index={i} />
                      ))
                    )}
                  </div>
                )}

                {/* ── SOURCES ── */}
                {tab === 'sources' && (
                  <div className="flex flex-col gap-3">
                    {data.sources.length === 0 ? (
                      <div className="text-center py-10">
                        <BookMarked size={28} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No approved sources linked to this node yet.</p>
                        <p className="text-xs text-slate-600 mt-1">Submit sources via the Sources section.</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                          {data.sources.length} approved source{data.sources.length !== 1 ? 's' : ''}
                        </p>
                        {data.sources.map(source => {
                          const credColor = source.credibilityScore >= 0.75 ? '#22c55e' : source.credibilityScore >= 0.5 ? '#eab308' : '#ef4444';
                          return (
                            <div key={source.id} className="p-3.5 rounded-xl bg-white/4 border border-purple-900/20 flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-white">{source.title}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {[source.author, source.publicationYear, source.journal || source.publisher].filter(Boolean).join(' · ')}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] font-bold" style={{ color: credColor }}>
                                    {Math.round(source.credibilityScore * 100)}%
                                  </span>
                                  <span className="text-[9px] text-slate-600">{source.sourceType}</span>
                                </div>
                              </div>
                              {source.abstract && (
                                <p className="text-[10px] text-slate-500 line-clamp-3">{source.abstract}</p>
                              )}
                              {source.url && (
                                <a href={source.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300">
                                  <ExternalLink size={9} />View source
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* ── LOCATIONS ── */}
                {tab === 'locations' && (
                  <div className="flex flex-col gap-3">
                    {data.locations.length === 0 ? (
                      <p className="text-xs text-slate-500 py-8 text-center">No geographic data found for connected nodes.</p>
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                          {data.locations.length} geographic connection{data.locations.length !== 1 ? 's' : ''}
                        </p>
                        {data.locations.map((loc, i) => {
                          const catColor = CATEGORY_COLORS[loc.node.category] ?? '#7c3aed';
                          return (
                            <motion.div key={loc.node.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-3 p-3.5 rounded-xl bg-white/4 border border-purple-900/20 cursor-pointer hover:border-purple-500/30 transition-all"
                              onClick={() => navigate(loc.node.id)}>
                              <div className="flex flex-col items-center gap-1 pt-0.5">
                                <MapPin size={14} className="text-green-400" />
                                {loc.hops === 2 && <div className="w-px h-3 bg-slate-700" />}
                                {loc.hops === 2 && <span className="text-[8px] text-slate-600">2 hops</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white">{loc.node.title}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: catColor }}>{loc.node.category}</p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  {loc.coordinates[0].toFixed(2)}°N, {loc.coordinates[1].toFixed(2)}°E
                                  {(loc.node.region || loc.node.country) && ` — ${[loc.node.region, loc.node.country].filter(Boolean).join(', ')}`}
                                </p>
                              </div>
                              <span className="text-lg">{loc.node.icon ?? '◈'}</span>
                            </motion.div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* ── TIMELINE ── */}
                {tab === 'timeline' && (
                  <div className="flex flex-col gap-2">
                    {data.timelines.length === 0 ? (
                      <p className="text-xs text-slate-500 py-8 text-center">No timeline data found for connected nodes.</p>
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
                          Chronological context — {data.timelines.length} node{data.timelines.length !== 1 ? 's' : ''}
                        </p>
                        <div className="relative">
                          {/* Timeline spine */}
                          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-purple-900/40" />
                          <div className="flex flex-col gap-4 pl-6">
                            {data.timelines.map((tl, i) => {
                              const evColor  = EVIDENCE_COLORS[tl.node.evidence_level] ?? '#94a3b8';
                              const isRoot   = tl.node.id === currentId;
                              const year     = tl.dateStart ?? tl.year ?? 0;
                              return (
                                <motion.div key={tl.node.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                                  className="relative">
                                  {/* Dot */}
                                  <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2"
                                    style={{ background: evColor + '33', borderColor: evColor, boxShadow: isRoot ? `0 0 8px ${evColor}` : 'none' }} />
                                  {/* Content */}
                                  <button onClick={() => !isRoot && navigate(tl.node.id)}
                                    className={`w-full text-left p-3 rounded-xl transition-all ${isRoot ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-white/4 border border-purple-900/20 hover:border-purple-500/30 hover:bg-white/8'}`}>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-[10px] font-bold" style={{ color: evColor }}>
                                        {formatYear(year)}
                                        {tl.dateEnd && tl.dateStart && ` – ${formatYear(tl.dateEnd)}`}
                                      </span>
                                      {isRoot && <span className="text-[9px] text-purple-400 bg-purple-900/40 px-1.5 py-0.5 rounded">current</span>}
                                    </div>
                                    <p className="text-xs font-bold text-white">{tl.node.icon ?? '◈'} {tl.node.title}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{tl.node.category}</p>
                                  </button>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
