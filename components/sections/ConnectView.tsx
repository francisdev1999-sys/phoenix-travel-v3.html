'use client';
/**
 * Connect (Pathfinder) — the hero feature.
 *
 * Pick two topics and see every way they connect across the knowledge graph.
 * Enumerates all simple paths (≤5 hops) between two nodes over an undirected
 * adjacency map built from the edge set, ranked shortest-and-strongest first,
 * and surfaces the topics that both endpoints share directly.
 *
 * Runs entirely on the client graph store, so results are instant and always
 * include autonomously grown content.
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, Sparkles, Link2, ArrowRight, Waypoints } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { useEngagement } from '@/lib/store/engagementStore';
import { useNodes, useEdges } from '@/lib/graph/useNodes';
import type { GraphNode, GraphEdge, RelationshipType } from '@/lib/graph/types';

const REL_COLORS: Record<RelationshipType, string> = {
  historical:              '#f59e0b',
  textual:                 '#6366f1',
  geographical:            '#22c55e',
  influence:               '#06b6d4',
  thematic:                '#a855f7',
  contradictory:           '#ef4444',
  alternative_explanation: '#f97316',
  criticism:               '#fb7185',
};

const MAX_HOPS = 5;
const MAX_PATHS = 40;

interface Path {
  nodeIds: string[];
  edges:   GraphEdge[];
}

/** Undirected adjacency: nodeId → list of (edge, neighbour id). */
function buildAdjacency(edges: GraphEdge[]): Map<string, { edge: GraphEdge; other: string }[]> {
  const adj = new Map<string, { edge: GraphEdge; other: string }[]>();
  const push = (from: string, other: string, edge: GraphEdge) => {
    const list = adj.get(from);
    if (list) list.push({ edge, other });
    else adj.set(from, [{ edge, other }]);
  };
  for (const e of edges) {
    if (e.from === e.to) continue;
    push(e.from, e.to, e);
    push(e.to, e.from, e);
  }
  return adj;
}

/** Bounded DFS: all simple paths from → to, ≤ MAX_HOPS edges, ≤ MAX_PATHS results. */
function enumeratePaths(
  adj: Map<string, { edge: GraphEdge; other: string }[]>,
  from: string,
  to: string,
): Path[] {
  const results: Path[] = [];
  if (!from || !to || from === to) return results;

  const visited = new Set<string>([from]);
  const nodePath: string[] = [from];
  const edgePath: GraphEdge[] = [];

  const dfs = (current: string) => {
    if (results.length >= MAX_PATHS) return;
    if (edgePath.length >= MAX_HOPS) return;
    for (const { edge, other } of adj.get(current) ?? []) {
      if (results.length >= MAX_PATHS) return;
      if (visited.has(other)) continue;
      nodePath.push(other);
      edgePath.push(edge);
      if (other === to) {
        results.push({ nodeIds: [...nodePath], edges: [...edgePath] });
      } else {
        visited.add(other);
        dfs(other);
        visited.delete(other);
      }
      nodePath.pop();
      edgePath.pop();
    }
  };

  dfs(from);
  return results;
}

function avgStrength(p: Path): number {
  if (p.edges.length === 0) return 0;
  return p.edges.reduce((s, e) => s + e.strength_score, 0) / p.edges.length;
}

const humanize = (t: string) => t.replace(/_/g, ' ');

export default function ConnectView() {
  const { navigateToNode } = useUserStore();
  const nodes = useNodes();
  const edges = useEdges();
  const discoverConnection = useEngagement(s => s.discoverConnection);
  const connectionsFound = useEngagement(s => s.connectionsFound);
  const questDay = useEngagement(s => s.questDay);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [newPair, setNewPair] = useState(false);
  const firedRef = useRef<string | null>(null);

  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.title.localeCompare(b.title)),
    [nodes],
  );

  const adjacency = useMemo(() => buildAdjacency(edges), [edges]);

  const paths = useMemo(() => {
    const found = enumeratePaths(adjacency, from, to);
    return found.sort((a, b) => {
      if (a.edges.length !== b.edges.length) return a.edges.length - b.edges.length;
      return avgStrength(b) - avgStrength(a);
    });
  }, [adjacency, from, to]);

  // Topics directly linked to BOTH endpoints.
  const shared = useMemo(() => {
    if (!from || !to || from === to) return [] as GraphNode[];
    const near = (id: string) => new Set((adjacency.get(id) ?? []).map(n => n.other));
    const a = near(from);
    const b = near(to);
    const out: GraphNode[] = [];
    for (const id of a) {
      if (id !== from && id !== to && b.has(id)) {
        const node = byId.get(id);
        if (node) out.push(node);
      }
    }
    return out.sort((x, y) => x.title.localeCompare(y.title));
  }, [adjacency, byId, from, to]);

  // Award the discovery once per selected pair (guarded against re-render fire).
  useEffect(() => {
    if (!from || !to || from === to || paths.length === 0) {
      setNewPair(false);
      return;
    }
    const key = [from, to].sort().join('|');
    if (firedRef.current === key) return;
    firedRef.current = key;
    setNewPair(discoverConnection(from, to));
  }, [from, to, paths.length, discoverConnection]);

  const surprise = () => {
    if (nodes.length < 2) return;
    const i = Math.floor(Math.random() * nodes.length);
    let j = Math.floor(Math.random() * nodes.length);
    while (j === i) j = Math.floor(Math.random() * nodes.length);
    setFrom(nodes[i].id);
    setTo(nodes[j].id);
  };

  const bothChosen = !!from && !!to && from !== to;
  const shortest = paths[0]?.edges.length ?? 0;

  if (nodes.length === 0) {
    return (
      <div className="min-h-full flex items-center justify-center text-[#8b91ab] text-[13px]">
        Loading the archive…
      </div>
    );
  }

  const selectClass =
    'w-full appearance-none rounded-[12px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] ' +
    'px-3 py-2.5 text-[13px] text-[#d7dbe7] outline-none transition-colors ' +
    'focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20';

  return (
    <div className="min-h-full text-[#d7dbe7] pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-10">
        {/* Head */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <Waypoints size={18} className="text-[#a78bfa]" />
            <h1 className="text-[20px] font-extrabold text-[#fff] leading-tight">Connect · Pathfinder</h1>
          </div>
          <p className="text-[13px] text-[#8b91ab] mb-4">
            Pick two topics and see every way they connect across the archive.
          </p>

          {/* Discovered count + optional quest hint */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-[999px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] px-2.5 py-1 text-[11px] text-[#8b91ab]">
              <Sparkles size={11} className="text-[#a78bfa]" />
              <span className="font-mono text-[#c4b5fd]">{connectionsFound.length}</span> discovered
            </span>
            {questDay == null && (
              <span className="inline-flex items-center gap-1.5 rounded-[999px] bg-[#7c3aed]/10 border border-[#7c3aed]/30 px-2.5 py-1 text-[11px] text-[#c4b5fd]">
                Daily quest · find a new connection
              </span>
            )}
          </div>
        </motion.div>

        {/* Pickers */}
        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7290] mb-1.5">From</label>
            <select value={from} onChange={e => setFrom(e.target.value)} className={selectClass}>
              <option value="">Select a topic…</option>
              {sortedNodes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center justify-center pb-2.5 text-[#6b7290]">
            <ArrowRight size={16} />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7290] mb-1.5">To</label>
            <select value={to} onChange={e => setTo(e.target.value)} className={selectClass}>
              <option value="">Select a topic…</option>
              {sortedNodes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={surprise}
            className="inline-flex items-center gap-1.5 rounded-[999px] bg-[#7c3aed] hover:bg-[#8b5cf6] px-3.5 py-2 text-[12px] font-bold text-[#fff] transition-colors"
          >
            <Shuffle size={13} /> Surprise me
          </motion.button>
          {newPair && bothChosen && paths.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1.5 rounded-[999px] bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300"
            >
              ✦ New connection · +20 XP
            </motion.span>
          )}
        </div>

        {/* Results */}
        {bothChosen && (
          <div className="mt-8">
            {paths.length === 0 ? (
              <div className="p-6 rounded-[12px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] text-[13px] text-[#8b91ab]">
                No path found between these two — they may live in separate corners of the archive yet.
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-[15px] font-extrabold text-[#fff]">
                    {shortest} degree{shortest === 1 ? '' : 's'} of separation
                  </span>
                  <span className="text-[12px] text-[#8b91ab]">
                    · shortest of <span className="font-mono text-[#c4b5fd]">{paths.length}</span> path{paths.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Shared connections */}
                {shared.length > 0 && (
                  <div className="mb-5 p-3.5 rounded-[12px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7290] mb-2">
                      <Link2 size={11} className="text-[#22c55e]" /> Both connect to
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {shared.map(n => (
                        <button
                          key={n.id}
                          onClick={() => navigateToNode(n.id, n.title)}
                          className="inline-flex items-center gap-1 rounded-[999px] bg-[#7c3aed]/12 border border-[#7c3aed]/30 px-2.5 py-1 text-[12px] text-[#e9d5ff] hover:bg-[#7c3aed]/20 transition-colors"
                        >
                          {n.icon ? `${n.icon} ` : ''}{n.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Path cards */}
                <div className="space-y-3">
                  {paths.map((p, i) => (
                    <PathCard key={`path-${i}`} path={p} index={i} byId={byId} onOpen={navigateToNode} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Path card ───────────────────────────────────────────────────────────────
function PathCard({
  path, index, byId, onOpen,
}: {
  path: Path;
  index: number;
  byId: Map<string, GraphNode>;
  onOpen: (id: string, title: string) => void;
}) {
  const hops = path.edges.length;
  const avgPct = Math.round(avgStrength(path) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="rounded-[12px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7290]">Path {index + 1}</span>
        {index === 0 && (
          <span className="rounded-[999px] bg-emerald-500/15 border border-emerald-400/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-300">
            shortest
          </span>
        )}
        <span className="ml-auto text-[11px] text-[#8b91ab]">
          <span className="font-mono text-[#c4b5fd]">{hops}</span> hop{hops === 1 ? '' : 's'} ·{' '}
          <span className="font-mono text-[#c4b5fd]">{avgPct}%</span> avg strength
        </span>
      </div>

      <div>
        {path.nodeIds.map((id, i) => {
          const node = byId.get(id);
          const edge = path.edges[i];
          return (
            <div key={`${id}-${i}`}>
              {/* Node row */}
              <button
                onClick={() => node && onOpen(node.id, node.title)}
                className="w-full flex items-center gap-2 text-left group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] shrink-0" />
                <span className="text-[13px] font-bold text-[#fff] group-hover:text-[#c4b5fd] transition-colors truncate">
                  {node?.icon ? `${node.icon} ` : ''}{node?.title ?? id}
                </span>
                <ArrowRight size={12} className="text-[#6b7290] group-hover:text-[#a78bfa] transition-colors shrink-0" />
              </button>

              {/* Relationship segment */}
              {i < path.edges.length && edge && (
                <RelSegment edge={edge} />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Relationship segment (colored connector + chip) ─────────────────────────
function RelSegment({ edge }: { edge: GraphEdge }) {
  const color = REL_COLORS[edge.relationship_type] ?? '#7c3aed';
  const pct = Math.round(edge.strength_score * 100);
  return (
    <div className="flex gap-2 pl-[3px] py-1.5">
      <div className="w-px shrink-0" style={{ background: color, opacity: 0.5 }} />
      <div className="min-w-0 py-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="rounded-[999px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] capitalize"
            style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
          >
            {humanize(edge.relationship_type)}
          </span>
          <span className="font-mono text-[11px]" style={{ color }}>{pct}%</span>
        </div>
        {edge.explanation && (
          <p className="text-[12px] text-[#8b91ab] mt-1 leading-snug line-clamp-2">{edge.explanation}</p>
        )}
      </div>
    </div>
  );
}
