'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, MapPin, BookMarked, Loader2, Database, Globe } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import type { TimelineEntry } from '@/app/api/timeline/route';

const ERA_COLORS: Record<string, string> = {
  ancient:      '#f59e0b',
  classical:    '#7c3aed',
  medieval:     '#06b6d4',
  modern:       '#22c55e',
  contemporary: '#ef4444',
};

const ERA_LABELS: Record<string, string> = {
  ancient:      'Ancient History',
  classical:    'Classical Era',
  medieval:     'Medieval Era',
  modern:       'Modern Era',
  contemporary: 'Contemporary',
};

const EVIDENCE_COLORS: Record<string, string> = {
  verified:        '#10b981',
  strong_evidence: '#34d399',
  debated:         '#f59e0b',
  speculative:     '#8b5cf6',
  mythological:    '#ec4899',
};

const formatYear = (year: number) =>
  year < 0 ? `${Math.abs(year).toLocaleString()} BCE` : `${year.toLocaleString()} CE`;

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface CoverageMeta {
  totalPublished: number;
  withDates: number;
  withoutDates: number;
  coveragePct: number;
  byEra: Record<string, number>;
}

interface TimelineResponse {
  entries: TimelineEntry[];
  pagination: PaginationMeta;
  coverage: CoverageMeta;
}

export default function TimelineExplorer() {
  const [events,     setEvents]     = useState<TimelineEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeEras, setActiveEras] = useState<string[]>(
    ['ancient', 'classical', 'medieval', 'modern', 'contemporary'],
  );
  const [selected,   setSelected]   = useState<string | null>(null);
  const [page,       setPage]       = useState(1);
  const [hasNext,    setHasNext]    = useState(false);
  const [coveragePct, setCoveragePct] = useState<number | null>(null);
  // Track which era is currently being filtered (single-era fetch mode)
  const [activeEraFilter, setActiveEraFilter] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventRefs    = useRef<Record<string, HTMLDivElement | null>>({});

  const { focusedTheoryId, setFocusedTheoryId } = useUserStore();

  const buildUrl = useCallback((p: number, era: string | null) => {
    const params = new URLSearchParams({ page: String(p), limit: '50' });
    if (era) params.set('era', era);
    return `/api/timeline?${params.toString()}`;
  }, []);

  // Load live timeline from API (paginated shape with fallback to flat array)
  const loadPage = useCallback(async (p: number, era: string | null, append: boolean) => {
    try {
      const res = await fetch(buildUrl(p, era));
      const data: TimelineResponse | TimelineEntry[] = await res.json();

      // Handle both paginated response and legacy flat array
      if (Array.isArray(data)) {
        setEvents(data);
        setHasNext(false);
        setCoveragePct(null);
      } else {
        const entries = data.entries ?? [];
        setEvents(prev => append ? [...prev, ...entries] : entries);
        setHasNext(data.pagination?.hasNext ?? false);
        setCoveragePct(data.coverage?.coveragePct ?? null);
        setPage(data.pagination?.page ?? p);
      }
    } catch {
      // keep existing state on error
    }
  }, [buildUrl]);

  useEffect(() => {
    setLoading(true);
    loadPage(1, activeEraFilter, false).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEraFilter]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    await loadPage(page + 1, activeEraFilter, true);
    setLoadingMore(false);
  }, [loadPage, page, activeEraFilter]);

  // Globe sync — when another view sets focusedTheoryId, highlight the matching event
  useEffect(() => {
    if (!focusedTheoryId || events.length === 0) return;
    const match = events.find(e =>
      e.id === focusedTheoryId || e.tags.includes(focusedTheoryId),
    );
    if (!match) return;
    setSelected(match.id);
    setActiveEras(prev => prev.includes(match.era) ? prev : [...prev, match.era]);
    setTimeout(() => {
      eventRefs.current[match.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }, [focusedTheoryId, events]);

  const handleSelect = useCallback((id: string, tags: string[]) => {
    const next = selected === id ? null : id;
    setSelected(next);
    setFocusedTheoryId(next ? (tags[0] ?? id) : null);
  }, [selected, setFocusedTheoryId]);

  const filteredEvents = events.filter(e => activeEras.includes(e.era));
  const liveCount      = events.filter(e => e.isLive).length;
  const syncedEvent    = focusedTheoryId
    ? events.find(e => e.id === focusedTheoryId || e.tags.includes(focusedTheoryId))
    : null;

  const toggleEra = (era: string) =>
    setActiveEras(prev =>
      prev.includes(era) ? prev.filter(e => e !== era) : [...prev, era],
    );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-purple-900/20">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Clock size={20} className="text-purple-400" />
            Timeline Explorer
            {coveragePct !== null && (
              <span className="ml-2 text-[10px] font-normal px-2 py-0.5 rounded-full bg-purple-900/30 border border-purple-500/20 text-purple-300">
                Timeline coverage: {coveragePct}%
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {syncedEvent && (
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-900/20 border border-cyan-500/30 rounded-full px-2.5 py-1">
                <Globe size={9} />Synced with Globe
              </div>
            )}
            {!loading && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Database size={11} className="text-purple-400" />
                  {liveCount} live
                </span>
                <span>{filteredEvents.length} showing</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Credible, approved nodes plotted across history
        </p>

        {/* Era filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(ERA_LABELS).map(([era, label]) => (
            <button
              key={era}
              onClick={() => toggleEra(era)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
              style={{
                borderColor: activeEras.includes(era) ? ERA_COLORS[era] + '60' : '#ffffff10',
                background:  activeEras.includes(era) ? ERA_COLORS[era] + '20' : 'transparent',
                color:       activeEras.includes(era) ? ERA_COLORS[era] : '#64748b',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ERA_COLORS[era] }} />
              {label}
              {!loading && (
                <span className="opacity-60 ml-0.5">
                  ({events.filter(e => e.era === era).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 size={24} className="animate-spin text-purple-400" />
            <p className="text-xs text-slate-500">Loading timeline…</p>
          </div>
        )}

        {!loading && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Clock size={28} className="text-slate-700" />
            <p className="text-sm text-slate-500">No entries for the selected eras.</p>
          </div>
        )}

        {!loading && filteredEvents.length > 0 && (
          <div className="relative">
            {/* Spine */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 via-cyan-500/30 to-purple-500/10" />

            <div className="space-y-6 pl-12">
              {filteredEvents.map((event, i) => {
                const eraColor = ERA_COLORS[event.era] ?? '#7c3aed';
                const evColor  = EVIDENCE_COLORS[event.evidenceLevel] ?? '#94a3b8';
                const isOpen   = selected === event.id;
                const isSynced = syncedEvent?.id === event.id;

                return (
                  <motion.div
                    key={event.id}
                    ref={el => { eventRefs.current[event.id] = el; }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.6) }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[2.75rem] top-2 w-4 h-4 rounded-full border-2 transition-all"
                      style={{
                        borderColor: isSynced ? '#06b6d4' : eraColor,
                        background:  isOpen ? eraColor : `${eraColor}33`,
                        boxShadow:   isOpen ? `0 0 12px ${eraColor}` : isSynced ? '0 0 10px #06b6d4' : 'none',
                      }}
                    />

                    <button
                      onClick={() => handleSelect(event.id, event.tags)}
                      className="w-full text-left"
                    >
                      <div
                        className="rounded-xl p-4 border transition-all"
                        style={{
                          background:  isOpen ? `${eraColor}15` : isSynced ? 'rgba(6,182,212,0.06)' : 'rgba(15,15,30,0.5)',
                          borderColor: isOpen ? `${eraColor}40` : isSynced ? '#06b6d430' : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Date + era chip + evidence badge */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono font-bold" style={{ color: eraColor }}>
                                {formatYear(event.year)}
                                {event.dateEnd && event.dateEnd !== event.year && ` – ${formatYear(event.dateEnd)}`}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                                style={{ background: `${eraColor}20`, color: eraColor }}>
                                {ERA_LABELS[event.era] ?? event.era}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                                style={{ background: `${evColor}18`, color: evColor }}>
                                {event.evidenceLevel.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Title */}
                            <div className="flex items-center gap-2">
                              {event.icon && <span className="text-base leading-none">{event.icon}</span>}
                              <h3 className="text-sm font-bold text-white">{event.title}</h3>
                              {event.isLive && (
                                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"
                                  title="Live from archive" />
                              )}
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {event.location && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <MapPin size={10} />{event.location}
                                </span>
                              )}
                              <span className="text-xs text-slate-600">{event.category}</span>
                              {event.sourceCount > 0 && (
                                <span className="flex items-center gap-1 text-xs text-slate-600">
                                  <BookMarked size={10} />{event.sourceCount} source{event.sourceCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0 mt-1">
                            {isOpen
                              ? <ChevronUp  size={14} className="text-slate-400" />
                              : <ChevronDown size={14} className="text-slate-400" />}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                                {event.description}
                              </p>
                              {event.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  <span className="text-xs text-slate-500">Tags:</span>
                                  {event.tags.slice(0, 8).map(t => (
                                    <span key={t}
                                      className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] text-slate-600">
                                  Confidence: {Math.round(event.confidenceScore * 100)}%
                                </span>
                                {event.isLive && (
                                  <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                    <Database size={9} />Live from archive
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Load More button */}
            {hasNext && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium border border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <><Loader2 size={12} className="animate-spin" />Loading…</>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
