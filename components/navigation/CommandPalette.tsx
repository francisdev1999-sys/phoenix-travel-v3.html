'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Network, Folder, Telescope, X } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuickNode {
  id: string;
  title: string;
  evidenceLevel: string;
  color: string | null;
  icon: string | null;
  categoryName: string;
  categoryColor: string | null;
}

interface QuickCluster {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  galaxy: { slug: string; name: string } | null;
  _count: { nodes: number };
}

interface QuickGalaxy {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface QuickResults {
  nodes:    QuickNode[];
  clusters: QuickCluster[];
  galaxies: QuickGalaxy[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EVIDENCE_COLORS: Record<string, string> = {
  confirmed:   '#22c55e',
  strong:      '#84cc16',
  moderate:    '#eab308',
  weak:        '#f97316',
  speculative: '#64748b',
};

function EvidenceDot({ level }: { level: string }) {
  const color = EVIDENCE_COLORS[level] ?? '#64748b';
  return <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block" style={{ background: color }} />;
}

// ── Result row ────────────────────────────────────────────────────────────────

function Row({
  icon, label, sub, color, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: React.ReactNode;
  color?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
        active ? 'bg-purple-700/40 text-white' : 'text-slate-300 hover:bg-white/5'
      }`}
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: (color ?? '#7c3aed') + '20', border: `1px solid ${(color ?? '#7c3aed')}30` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {sub && <p className="text-[10px] text-slate-500 truncate">{sub}</p>}
      </div>
    </button>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[9px] font-bold tracking-[0.15em] uppercase text-slate-600">
      {label}
    </p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const { navigateToNode, navigateToGalaxy, navigateToCluster } = useUserStore();

  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<QuickResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build a flat list of all result items for keyboard navigation
  const flatItems: { type: 'node' | 'cluster' | 'galaxy'; item: QuickNode | QuickCluster | QuickGalaxy }[] = [];
  if (results) {
    results.galaxies.forEach(g => flatItems.push({ type: 'galaxy', item: g }));
    results.clusters.forEach(c => flatItems.push({ type: 'cluster', item: c }));
    results.nodes.forEach(n => flatItems.push({ type: 'node', item: n }));
  }

  // Fetch with debounce
  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults(null); setLoading(false); return; }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/quick?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        setResults(d);
        setActiveIdx(0);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  useEffect(() => {
    search(query);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const select = useCallback((idx: number) => {
    const entry = flatItems[idx];
    if (!entry) return;

    if (entry.type === 'galaxy') {
      const g = entry.item as QuickGalaxy;
      navigateToGalaxy(g.slug, g.name);
    } else if (entry.type === 'cluster') {
      const c = entry.item as QuickCluster;
      const galaxySlug = c.galaxy?.slug ?? '';
      const galaxyName = c.galaxy?.name ?? '';
      navigateToCluster(galaxySlug, galaxyName, c.slug, c.name);
    } else {
      const n = entry.item as QuickNode;
      navigateToNode(n.id, n.title);
    }

    onClose();
  }, [flatItems, navigateToGalaxy, navigateToCluster, navigateToNode, onClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(activeIdx);
    }
  };

  const isEmpty = results && results.nodes.length === 0 && results.clusters.length === 0 && results.galaxies.length === 0;

  let globalIdx = 0; // running index across all sections for active highlighting

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
          >
            <div className="rounded-2xl glass-dark border border-purple-900/30 shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                {loading
                  ? <Loader2 size={16} className="text-slate-500 flex-shrink-0 animate-spin" />
                  : <Search size={16} className="text-slate-500 flex-shrink-0" />
                }
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search nodes, galaxies, clusters…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-slate-600 hover:text-slate-400 flex-shrink-0">
                    <X size={13} />
                  </button>
                )}
                <kbd className="hidden sm:block text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-slate-600 font-mono flex-shrink-0">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto p-1.5">
                {/* Empty / no query state */}
                {!query && (
                  <div className="py-8 text-center text-xs text-slate-600">
                    Type to search the archive…
                  </div>
                )}

                {query.length > 0 && query.length < 2 && (
                  <div className="py-8 text-center text-xs text-slate-600">
                    Keep typing…
                  </div>
                )}

                {isEmpty && (
                  <div className="py-8 text-center text-xs text-slate-600">
                    No results for <span className="text-slate-400">"{query}"</span>
                  </div>
                )}

                {results && !isEmpty && (
                  <>
                    {/* Galaxies */}
                    {results.galaxies.length > 0 && (
                      <>
                        <SectionHead label="Galaxies" />
                        {results.galaxies.map(g => {
                          const idx = globalIdx++;
                          return (
                            <Row
                              key={g.id}
                              icon={<Telescope size={13} style={{ color: g.color ?? '#7c3aed' }} />}
                              label={g.name}
                              sub="Galaxy"
                              color={g.color}
                              active={activeIdx === idx}
                              onClick={() => select(idx)}
                            />
                          );
                        })}
                      </>
                    )}

                    {/* Clusters */}
                    {results.clusters.length > 0 && (
                      <>
                        <SectionHead label="Clusters" />
                        {results.clusters.map(c => {
                          const idx = globalIdx++;
                          return (
                            <Row
                              key={c.id}
                              icon={<Folder size={13} style={{ color: c.color ?? '#7c3aed' }} />}
                              label={c.name}
                              sub={c.galaxy ? `${c.galaxy.name} · ${c._count.nodes} nodes` : `${c._count.nodes} nodes`}
                              color={c.color}
                              active={activeIdx === idx}
                              onClick={() => select(idx)}
                            />
                          );
                        })}
                      </>
                    )}

                    {/* Nodes */}
                    {results.nodes.length > 0 && (
                      <>
                        <SectionHead label="Nodes" />
                        {results.nodes.map(n => {
                          const idx = globalIdx++;
                          return (
                            <Row
                              key={n.id}
                              icon={
                                n.icon
                                  ? <span className="text-sm">{n.icon}</span>
                                  : <Network size={13} style={{ color: n.color ?? n.categoryColor ?? '#7c3aed' }} />
                              }
                              label={n.title}
                              sub={
                                <span className="flex items-center gap-1.5">
                                  <EvidenceDot level={n.evidenceLevel} />
                                  <span>{n.evidenceLevel}</span>
                                  <span className="text-slate-700">·</span>
                                  <span>{n.categoryName}</span>
                                </span>
                              }
                              color={n.color ?? n.categoryColor}
                              active={activeIdx === idx}
                              onClick={() => select(idx)}
                            />
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3 text-[10px] text-slate-700">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> open</span>
                <span><kbd className="font-mono">esc</kbd> close</span>
                <span className="ml-auto">Ctrl+K to reopen</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
