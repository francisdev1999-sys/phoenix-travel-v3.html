'use client';
/**
 * Search & Connections explorer — the research entry point.
 *
 * Type a theory/topic and instantly see matching topics AND what each one is
 * connected to (relationship type, confidence, explanation) without drilling
 * through Universe → Galaxy → Cluster. Every connected topic is one click away,
 * so users can hop the graph laterally — the core promise of the archive.
 *
 * Runs entirely on the client graph store (static + DB-merged nodes/edges), so
 * results are instant and always include autonomously grown content.
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Link2, Sparkles, BookOpen } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { trackEngagement, type EngagementKind } from '@/lib/engagement';
import { useNodes, useEdges } from '@/lib/graph/useNodes';
import type { GraphNode, GraphEdge } from '@/lib/graph/types';

const EVIDENCE_STYLE: Record<string, string> = {
  verified:        'bg-emerald-900/50 text-emerald-300 border-emerald-700/40',
  strong_evidence: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/40',
  debated:         'bg-amber-900/50 text-amber-300 border-amber-700/40',
  speculative:     'bg-purple-900/50 text-purple-300 border-purple-700/40',
  mythological:    'bg-rose-900/50 text-rose-300 border-rose-700/40',
};

interface Connection {
  node:     GraphNode;
  type:     string;
  strength: number;
  explanation: string;
}

function connectionsFor(nodeId: string, nodes: GraphNode[], edges: GraphEdge[]): Connection[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const out: Connection[] = [];
  for (const e of edges) {
    const otherId = e.from === nodeId ? e.to : e.to === nodeId ? e.from : null;
    if (!otherId) continue;
    const other = byId.get(otherId);
    if (!other) continue;
    out.push({ node: other, type: e.relationship_type, strength: e.strength_score, explanation: e.explanation });
  }
  return out.sort((a, b) => b.strength - a.strength);
}

function matchScore(n: GraphNode, q: string): number {
  const query = q.toLowerCase();
  const title = n.title.toLowerCase();
  if (title === query) return 100;
  if (title.includes(query)) return 80;
  if (n.tags.some(t => t.toLowerCase().includes(query))) return 60;
  if (n.description.toLowerCase().includes(query)) return 40;
  return 0;
}

export default function SearchExplorer() {
  const { navigateToNode, searchQuery, setSearchQuery } = useUserStore();
  const nodes = useNodes();
  const edges = useEdges();
  const [query, setQuery] = useState(searchQuery ?? '');
  const [expanded, setExpanded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount; keep the store in sync so the query survives
  // navigation away and back.
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSearchQuery(query); }, [query, setSearchQuery]);

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return nodes
      .map(n => ({ node: n, score: matchScore(n, q) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [query, nodes]);

  // Best-connected topics as entry points when there's no query yet.
  const hubs = useMemo(() => {
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
      degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
    }
    return [...nodes]
      .map(n => ({ node: n, degree: degree.get(n.id) ?? 0 }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 8);
  }, [nodes, edges]);

  const openNode = (n: GraphNode, kind: EngagementKind = 'node_dive') => {
    trackEngagement(kind, n.id);
    navigateToNode(n.id, n.title);
  };

  return (
    <div className="min-h-full text-slate-200 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-10">
        {/* Search head */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-white mb-1">Search the Archive</h1>
          <p className="text-sm text-slate-400 mb-5">
            Find a theory, then follow its connections — every related topic is one click away.
          </p>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 focus-within:border-purple-500 rounded-xl px-4 py-3.5 transition-all">
            <Search size={17} className="text-slate-500 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search theories, events, people, phenomena…"
              className="flex-1 bg-transparent text-base text-white placeholder-slate-500 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-xs text-slate-500 hover:text-slate-300">clear</button>
            )}
          </div>
        </motion.div>

        {/* No query → suggest the best-connected starting points */}
        {query.trim().length < 2 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
              <Sparkles size={13} className="text-purple-400" /> Most connected topics — good places to start
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {hubs.map(({ node, degree }) => (
                <button key={node.id} onClick={() => openNode(node)}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/8 hover:border-purple-700/50 hover:bg-white/[0.05] text-left transition-all group">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{node.icon ? `${node.icon} ` : ''}{node.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{degree} connections · {node.category}</div>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-purple-400 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results with inline connections */}
        {query.trim().length >= 2 && (
          <div className="mt-6 space-y-3">
            {results.length === 0 && (
              <div className="p-6 rounded-xl bg-white/[0.03] border border-white/8 text-sm text-slate-400">
                Nothing in the archive matches “{query}” yet. The autonomous pipeline may
                discover it — or try one of the connected hubs below.
              </div>
            )}
            {results.map(({ node }) => {
              const conns = connectionsFor(node.id, nodes, edges);
              const isOpen = expanded === node.id;
              const shown = isOpen ? conns : conns.slice(0, 3);
              return (
                <motion.div key={node.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-white/[0.03] border border-white/8 hover:border-purple-900/50 transition-all overflow-hidden">
                  {/* Topic row */}
                  <button onClick={() => openNode(node)} className="w-full text-left p-4 group">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-white group-hover:text-purple-200 transition-colors">
                        {node.icon ? `${node.icon} ` : ''}{node.title}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${EVIDENCE_STYLE[node.evidence_level] ?? EVIDENCE_STYLE.speculative}`}>
                        {node.evidence_level.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500">{node.category}</span>
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-purple-300/80">
                        <BookOpen size={12} /> Open topic <ArrowRight size={11} />
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-400 mt-1.5 line-clamp-2">{node.description}</p>
                  </button>

                  {/* Inline connections */}
                  {conns.length > 0 && (
                    <div className="border-t border-white/5 px-4 py-3 bg-black/20">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                        <Link2 size={11} className="text-cyan-400" /> Connected to {conns.length} topic{conns.length > 1 ? 's' : ''}
                      </div>
                      <div className="space-y-1.5">
                        {shown.map(c => (
                          <button key={c.node.id} onClick={() => openNode(c.node, 'connection_hop')}
                            className="w-full flex items-start gap-2 text-left group/conn">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan-500/70 shrink-0" />
                            <span className="text-[13px] leading-snug">
                              <span className="font-semibold text-slate-200 group-hover/conn:text-cyan-300 transition-colors">{c.node.title}</span>
                              <span className="text-slate-500"> · {c.type.replace(/_/g, ' ')} · {Math.round(c.strength * 100)}%</span>
                              <span className="text-slate-500 block text-[12px] line-clamp-1">{c.explanation}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      {conns.length > 3 && (
                        <button onClick={() => setExpanded(isOpen ? null : node.id)}
                          className="mt-2 text-[11px] font-semibold text-purple-300 hover:text-purple-200">
                          {isOpen ? 'Show fewer' : `Show all ${conns.length} connections`}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
