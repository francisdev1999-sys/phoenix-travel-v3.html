'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, MapPin, BookMarked, Loader2, Database } from 'lucide-react';
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

export default function TimelineExplorer() {
  const [events,       setEvents]       = useState<TimelineEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeEras,   setActiveEras]   = useState<string[]>(
    ['ancient', 'classical', 'medieval', 'modern', 'contemporary'],
  );
  const [selected,     setSelected]     = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/timeline')
      .then(r => r.json())
      .then((data: TimelineEntry[]) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = events.filter(e => activeEras.includes(e.era));
  const liveCount      = events.filter(e => e.isLive).length;

  const toggleEra = (era: string) =>
    setActiveEras(prev =>
      prev.includes(era) ? prev.filter(e => e !== era) : [...prev, era],
    );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-purple-900/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Clock size={20} className="text-purple-400" />
              Timeline Explorer
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Credible, approved nodes plotted across history
            </p>
          </div>
          {!loading && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Database size={11} className="text-purple-400" />
                {liveCount} live from archive
              </span>
              <span>{filteredEvents.length} showing</span>
            </div>
          )}
        </div>

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
                <span className="opacity-60">
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
                const eraColor  = ERA_COLORS[event.era] ?? '#7c3aed';
                const evColor   = EVIDENCE_COLORS[event.evidenceLevel] ?? '#94a3b8';
                const isOpen    = selected === event.id;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.6) }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[2.75rem] top-2 w-4 h-4 rounded-full border-2 transition-all"
                      style={{
                        borderColor: eraColor,
                        background:  isOpen ? eraColor : `${eraColor}33`,
                        boxShadow:   isOpen ? `0 0 12px ${eraColor}` : 'none',
                      }}
                    />

                    <button
                      onClick={() => setSelected(isOpen ? null : event.id)}
                      className="w-full text-left"
                    >
                      <div
                        className="rounded-xl p-4 border transition-all"
                        style={{
                          background:  isOpen ? `${eraColor}15` : 'rgba(15,15,30,0.5)',
                          borderColor: isOpen ? `${eraColor}40` : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Date + era chip */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono font-bold" style={{ color: eraColor }}>
                                {formatYear(event.year)}
                                {event.dateEnd && event.dateEnd !== event.year && ` – ${formatYear(event.dateEnd)}`}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                                style={{ background: `${eraColor}20`, color: eraColor }}>
                                {ERA_LABELS[event.era] ?? event.era}
                              </span>
                              {/* Evidence badge */}
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

                            {/* Location + category + sources */}
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
                              <div className="mt-2 flex items-center gap-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
