'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, MapPin, Globe } from 'lucide-react';
import { timelineEvents } from '@/lib/data/timeline';
import { TimelineEvent } from '@/lib/types';
import { useUserStore } from '@/lib/store/userStore';

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

const formatYear = (year: number) => {
  if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`;
  return `${year.toLocaleString()} CE`;
};

export default function TimelineExplorer() {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [activeEras, setActiveEras] = useState<string[]>(['ancient', 'classical', 'medieval', 'modern', 'contemporary']);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventRefs    = useRef<Record<string, HTMLDivElement | null>>({});

  const { focusedTheoryId, setFocusedTheoryId } = useUserStore();

  // When another view (e.g. Globe) sets a focusedTheoryId, find and highlight the matching event
  useEffect(() => {
    if (!focusedTheoryId) return;
    const match = timelineEvents.find(e => e.relatedTheories.includes(focusedTheoryId));
    if (!match) return;
    setSelectedEvent(match);
    // Ensure the era is active
    setActiveEras(prev => prev.includes(match.era) ? prev : [...prev, match.era]);
    // Scroll to event after a short paint delay
    setTimeout(() => {
      eventRefs.current[match.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }, [focusedTheoryId]);

  const handleSelect = useCallback((event: TimelineEvent) => {
    const next = selectedEvent?.id === event.id ? null : event;
    setSelectedEvent(next);
    setFocusedTheoryId(next?.relatedTheories[0] ?? null);
  }, [selectedEvent, setFocusedTheoryId]);

  const toggleEra = (era: string) => {
    setActiveEras(prev =>
      prev.includes(era) ? prev.filter(e => e !== era) : [...prev, era]
    );
  };

  const filteredEvents = timelineEvents
    .filter(e => activeEras.includes(e.era))
    .sort((a, b) => a.year - b.year);

  const syncedSite = focusedTheoryId
    ? timelineEvents.find(e => e.relatedTheories.includes(focusedTheoryId))
    : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-purple-900/20">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Clock size={20} className="text-purple-400" />
            Timeline Explorer
          </h2>
          {syncedSite && (
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-900/20 border border-cyan-500/30 rounded-full px-2.5 py-1">
              <Globe size={9} />
              Synced with Globe
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500">Navigate through mysteries across time</p>

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
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-6">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 via-cyan-500/30 to-purple-500/10" />

          <div className="space-y-6 pl-12">
            {filteredEvents.map((event, i) => {
              const color      = ERA_COLORS[event.era];
              const isSelected = selectedEvent?.id === event.id;
              const isSynced   = focusedTheoryId
                ? event.relatedTheories.includes(focusedTheoryId)
                : false;

              return (
                <motion.div
                  key={event.id}
                  ref={el => { eventRefs.current[event.id] = el; }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  <div
                    className="absolute -left-[2.75rem] top-2 w-4 h-4 rounded-full border-2 transition-all"
                    style={{
                      borderColor: isSynced ? '#22d3ee' : color,
                      background:  isSelected ? color : isSynced ? '#22d3ee33' : `${color}33`,
                      boxShadow:   isSelected ? `0 0 12px ${color}` : isSynced ? '0 0 10px #22d3ee88' : 'none',
                    }}
                  />

                  <button onClick={() => handleSelect(event)} className="w-full text-left">
                    <div
                      className="rounded-xl p-4 border transition-all"
                      style={{
                        background:  isSelected ? `${color}15` : isSynced ? '#22d3ee08' : 'rgba(15,15,30,0.5)',
                        borderColor: isSelected ? `${color}40`  : isSynced ? '#22d3ee30' : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-bold" style={{ color }}>
                              {formatYear(event.year)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                              style={{ background: `${color}20`, color }}>
                              {event.era}
                            </span>
                            {isSynced && !isSelected && (
                              <span className="text-[9px] text-cyan-400 flex items-center gap-1">
                                <Globe size={8} /> Globe match
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white">{event.title}</h3>
                          {event.location && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                              <MapPin size={10} />
                              {event.location}
                            </div>
                          )}
                        </div>
                        {isSelected
                          ? <ChevronUp size={14} className="text-slate-400 mt-1" />
                          : <ChevronDown size={14} className="text-slate-400 mt-1" />}
                      </div>

                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                              {event.description}
                            </p>
                            {event.relatedTheories.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                <span className="text-xs text-slate-500">Related:</span>
                                {event.relatedTheories.map(t => (
                                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">
                                    {t.replace(/-/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            )}
                            {event.location && (
                              <p className="text-[10px] text-cyan-400 mt-2 flex items-center gap-1">
                                <Globe size={9} />
                                Switch to Globe view to see this location on the map
                              </p>
                            )}
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
      </div>
    </div>
  );
}
