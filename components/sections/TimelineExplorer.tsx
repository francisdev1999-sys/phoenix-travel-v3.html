'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, MapPin, Info, SlidersHorizontal, AlertTriangle, BookOpen } from 'lucide-react';
import { useNodes } from '@/lib/graph/useNodes';
import { GraphNode } from '@/lib/graph/types';
import {
  getCredibilityDisplay,
  nodePassesFilter,
  getAppearanceReason,
  EVIDENCE_CFG,
  CredibilityOptions,
  DEFAULT_PUBLIC_OPTIONS,
} from '@/lib/credibility-display';

// ── Era derivation ──────────────────────────────────────────────────────────

const ERA_ORDER = ['ancient', 'classical', 'medieval', 'modern', 'contemporary'] as const;
type Era = typeof ERA_ORDER[number];

const ERA_LABELS: Record<Era, string> = {
  ancient:      'Ancient',
  classical:    'Classical',
  medieval:     'Medieval',
  modern:       'Modern',
  contemporary: 'Contemporary',
};

const ERA_COLORS: Record<Era, string> = {
  ancient:      '#f59e0b',
  classical:    '#7c3aed',
  medieval:     '#06b6d4',
  modern:       '#22c55e',
  contemporary: '#ef4444',
};

function getEra(year: number): Era {
  if (year < -500)  return 'ancient';
  if (year < 500)   return 'classical';
  if (year < 1500)  return 'medieval';
  if (year < 1900)  return 'modern';
  return 'contemporary';
}

const formatYear = (year: number) =>
  year < 0 ? `${Math.abs(year).toLocaleString()} BCE` : `${year.toLocaleString()} CE`;

// ── Sub-components ──────────────────────────────────────────────────────────

function EvidencePill({ badge, color, bg }: { badge: string; color: string; bg: string }) {
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border"
      style={{ color, background: bg, borderColor: color + '40' }}
    >
      {badge}
    </span>
  );
}

function WarningStrip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1 mt-1.5 text-[9px] text-amber-400/80">
      <AlertTriangle size={9} className="flex-shrink-0" />
      {label}
    </div>
  );
}

function AppearanceReason({ text }: { text: string }) {
  return (
    <div className="mt-3 p-2.5 rounded-lg border border-slate-700/50 bg-slate-900/40">
      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        <Info size={9} />
        Why this appears here
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed">{text}</p>
    </div>
  );
}

function ControlsPanel({
  opts,
  onChange,
}: {
  opts: CredibilityOptions;
  onChange: (o: CredibilityOptions) => void;
}) {
  const toggle = (key: keyof CredibilityOptions, val: boolean) =>
    onChange({ ...opts, [key]: val });

  return (
    <div className="mt-4 p-3 rounded-xl border border-purple-900/30 bg-purple-950/10 space-y-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display settings</p>

      <div className="space-y-2">
        {(
          [
            ['showSpeculative',  'Show speculative nodes'],
            ['showMythological', 'Show mythological nodes'],
            ['showUnverified',   'Show unverified (no sources)'],
          ] as [keyof CredibilityOptions, string][]
        ).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-[11px] text-slate-400">{label}</span>
            <button
              onClick={() => toggle(key, !opts[key])}
              className={`w-8 h-4 rounded-full transition-colors relative ${
                opts[key] ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  opts[key] ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Min confidence</span>
          <span>{Math.round(opts.minConfidence * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.05}
          value={opts.minConfidence}
          onChange={e => onChange({ ...opts, minConfidence: Number(e.target.value) })}
          className="w-full accent-purple-500"
        />
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Min sources</span>
          <span>{opts.minSourceCount}</span>
        </div>
        <input
          type="range" min={0} max={5} step={1}
          value={opts.minSourceCount}
          onChange={e => onChange({ ...opts, minSourceCount: Number(e.target.value) })}
          className="w-full accent-purple-500"
        />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TimelineExplorer() {
  const nodes = useNodes();
  const [selectedNode, setSelectedNode]   = useState<GraphNode | null>(null);
  const [activeEras, setActiveEras]       = useState<Era[]>([...ERA_ORDER]);
  const [opts, setOpts]                   = useState<CredibilityOptions>(DEFAULT_PUBLIC_OPTIONS);
  const [showControls, setShowControls]   = useState(false);
  const containerRef                      = useRef<HTMLDivElement>(null);

  // Memoized — only recomputes when credibility opts or era selection changes
  const timelineNodes = useMemo(
    () => nodes
      .filter((n): n is GraphNode & { year: number } => n.year !== undefined)
      .filter(n => nodePassesFilter(n, opts))
      .filter(n => activeEras.includes(getEra(n.year)))
      .sort((a, b) => a.year - b.year),
    [opts, activeEras, nodes]
  );

  // Era counts memoized separately — only recalcs when opts change
  const eraCounts = useMemo(
    () => ERA_ORDER.reduce<Record<Era, number>>((acc, era) => {
      acc[era] = nodes
        .filter((n): n is GraphNode & { year: number } => n.year !== undefined)
        .filter(n => nodePassesFilter(n, opts) && getEra(n.year) === era)
        .length;
      return acc;
    }, {} as Record<Era, number>),
    [opts, nodes]
  );

  const toggleEra = (era: Era) =>
    setActiveEras(prev => prev.includes(era) ? prev.filter(e => e !== era) : [...prev, era]);

  // Scroll-based windowing for large datasets — renders visible items ± overscan
  const ITEM_HEIGHT = 100; // estimated collapsed item height
  const OVERSCAN = 8;
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerH(el.clientHeight);
    const obs = new ResizeObserver(([e]) => setContainerH(e.contentRect.height));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { visibleStart, visibleEnd } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const end   = Math.min(timelineNodes.length, Math.ceil((scrollTop + containerH) / ITEM_HEIGHT) + OVERSCAN);
    return { visibleStart: start, visibleEnd: end };
  }, [scrollTop, containerH, timelineNodes.length]);

  const topPad    = visibleStart * ITEM_HEIGHT;
  const bottomPad = Math.max(0, (timelineNodes.length - visibleEnd) * ITEM_HEIGHT);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 p-6 border-b border-purple-900/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Clock size={20} className="text-purple-400" />
              Research Timeline
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Published, reviewed subjects only. Evidence levels are reviewer-assigned — not implicit claims.
            </p>
          </div>
          <button
            onClick={() => setShowControls(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all flex-shrink-0 ${
              showControls
                ? 'bg-purple-900/30 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={11} />
            Filters
          </button>
        </div>

        {/* Controls panel */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <ControlsPanel opts={opts} onChange={setOpts} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Era filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {ERA_ORDER.map(era => {
            const count = eraCounts[era];
            const active = activeEras.includes(era);
            const color = ERA_COLORS[era];
            return (
              <button
                key={era}
                onClick={() => toggleEra(era)}
                disabled={count === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: active ? color + '60' : '#ffffff10',
                  background:  active ? color + '20' : 'transparent',
                  color:       active ? color : '#64748b',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {ERA_LABELS[era]}
                <span className="text-[9px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Evidence legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/5">
          {(Object.entries(EVIDENCE_CFG) as [string, typeof EVIDENCE_CFG[keyof typeof EVIDENCE_CFG]][]).map(
            ([level, cfg]) => (
              <div key={level} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                <span className="text-[9px] text-slate-500">{cfg.badge}</span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6"
        onScroll={e => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
      >
        {timelineNodes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen size={28} className="text-slate-600" />
            <p className="text-sm text-slate-500">No nodes match current filters.</p>
            <p className="text-xs text-slate-600">
              Try enabling speculative or mythological nodes in Display settings.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 via-cyan-500/30 to-purple-500/10" />

            {/* Top padding spacer preserves scroll height for virtual window */}
            {topPad > 0 && <div style={{ height: topPad }} />}

            <div className="space-y-5 pl-12">
              {timelineNodes.slice(visibleStart, visibleEnd).map((node, relIdx) => {
                const i = visibleStart + relIdx;
                const era        = getEra(node.year);
                const eraColor   = ERA_COLORS[era];
                const cred       = getCredibilityDisplay(node);
                const isSelected = selectedNode?.id === node.id;
                const reason     = getAppearanceReason(node);

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.6) }}
                    className="relative"
                    style={{ opacity: cred.opacity }}
                  >
                    {/* Era dot */}
                    <div
                      className="absolute -left-[2.75rem] top-3 w-3.5 h-3.5 rounded-full border-2 transition-all"
                      style={{
                        borderColor: eraColor,
                        background:  isSelected ? eraColor : `${eraColor}33`,
                        boxShadow:   isSelected ? `0 0 10px ${eraColor}` : 'none',
                      }}
                    />

                    <button
                      onClick={() => setSelectedNode(isSelected ? null : node)}
                      className="w-full text-left"
                    >
                      <div
                        className="rounded-xl p-4 border transition-all"
                        style={{
                          background:  isSelected ? `${cred.badgeColor}10` : 'rgba(15,15,30,0.5)',
                          borderColor: isSelected ? `${cred.badgeColor}40` : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Year + badges row */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span
                                className="text-[10px] font-mono font-bold"
                                style={{ color: eraColor }}
                              >
                                {formatYear(node.year)}
                              </span>
                              <EvidencePill
                                badge={cred.badge}
                                color={cred.badgeColor}
                                bg={cred.badgeBg}
                              />
                              {cred.isUnverified && (
                                <EvidencePill badge="Unverified" color="#94a3b8" bg="#94a3b81a" />
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-white leading-snug">
                              {node.title}
                            </h3>

                            {/* Location + source count */}
                            <div className="flex items-center gap-3 mt-1">
                              {node.region && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <MapPin size={9} />
                                  {node.region}
                                  {node.country ? `, ${node.country}` : ''}
                                </div>
                              )}
                              <span className="text-[10px] text-slate-600">
                                {cred.sourceCount} source{cred.sourceCount !== 1 ? 's' : ''}
                                {cred.sourceCount > 0 && (
                                  <span className="ml-1 text-slate-700">
                                    · avg cred {Math.round(cred.avgSourceCredibility * 100)}%
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Warning strip */}
                            {cred.warningLabel && <WarningStrip label={cred.warningLabel} />}
                          </div>

                          {isSelected
                            ? <ChevronUp size={13} className="text-slate-400 mt-1 flex-shrink-0" />
                            : <ChevronDown size={13} className="text-slate-400 mt-1 flex-shrink-0" />
                          }
                        </div>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                                {node.description}
                              </p>

                              {node.mainstream_view && (
                                <div className="mt-3 p-2.5 rounded-lg border border-blue-900/30 bg-blue-950/10">
                                  <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-wider mb-1">
                                    Mainstream view
                                  </p>
                                  <p className="text-[10px] text-slate-400 leading-relaxed">
                                    {node.mainstream_view}
                                  </p>
                                </div>
                              )}

                              <AppearanceReason text={reason} />

                              {/* Confidence bar */}
                              <div className="mt-3">
                                <div className="flex justify-between text-[9px] text-slate-600 mb-1">
                                  <span>Confidence score</span>
                                  <span>{Math.round(node.confidence_score * 100)}%</span>
                                </div>
                                <div className="h-1 rounded-full bg-white/5">
                                  <div
                                    className="h-1 rounded-full transition-all"
                                    style={{
                                      width: `${node.confidence_score * 100}%`,
                                      background: cred.badgeColor,
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Tags */}
                              {node.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {node.tags.slice(0, 6).map(tag => (
                                    <span
                                      key={tag}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
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

            {/* Bottom padding spacer preserves scroll height for virtual window */}
            {bottomPad > 0 && <div style={{ height: bottomPad }} />}
          </div>
        )}
      </div>
    </div>
  );
}
