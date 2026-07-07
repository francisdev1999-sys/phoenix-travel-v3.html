'use client';
/**
 * Home Feed — the app's landing screen once you're inside the archive.
 * A curiosity feed (alternating node spotlights + hidden-connection cards) with
 * a sticky engagement rail: Daily Mystery, Daily Quest, Streak, Rank progress
 * and Saved-for-later. Everything is wired to the real graph + engagement store.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Network, ArrowRight, HelpCircle, Target, Flame, Bookmark,
  BookmarkCheck, Compass, ChevronDown, TrendingUp,
} from 'lucide-react';
import { useNodes, useEdges } from '@/lib/graph/useNodes';
import type { GraphNode } from '@/lib/graph/types';
import { useUserStore } from '@/lib/store/userStore';
import { useEngagement } from '@/lib/store/engagementStore';
import {
  dayNumber, dailyQuestPair, buildAdjacency, rankForXp, nextRank, rankProgress,
} from '@/lib/engagement/rules';

const EVIDENCE_COLOR: Record<string, string> = {
  verified: '#22c55e', strong_evidence: '#06b6d4', debated: '#eab308',
  speculative: '#f59e0b', mythological: '#ef4444',
};
const EVIDENCE_LABEL: Record<string, string> = {
  verified: 'Verified', strong_evidence: 'Strong evidence', debated: 'Debated',
  speculative: 'Speculative', mythological: 'Mythological',
};
const REL_COLOR: Record<string, string> = {
  historical: '#f59e0b', textual: '#6366f1', geographical: '#22c55e', influence: '#06b6d4',
  thematic: '#a855f7', contradictory: '#ef4444', alternative_explanation: '#f97316', criticism: '#fb7185',
};
const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  );
}

const PAGE = 7;

export default function HomeView() {
  const nodes = useNodes();
  const edges = useEdges();
  const { navigateToNode, setCurrentView } = useUserStore();

  const visited          = useEngagement(s => s.visited);
  const bookmarks        = useEngagement(s => s.bookmarks);
  const toggleBookmark   = useEngagement(s => s.toggleBookmark);
  const xp               = useEngagement(s => s.xp);
  const streak           = useEngagement(s => s.streak);
  const questDay         = useEngagement(s => s.questDay);
  const mysteryDay       = useEngagement(s => s.mysteryDay);
  const connectionsFound = useEngagement(s => s.connectionsFound);
  const openMystery      = useEngagement(s => s.openMystery);
  const completeQuest    = useEngagement(s => s.completeQuest);

  const [limit, setLimit] = useState(PAGE);
  const [growth, setGrowth] = useState<{ newNodes: number; newConnections: number } | null>(null);
  const [mystery, setMystery] = useState<{ question: string; nodeId: string; nodeTitle: string; icon?: string | null } | null>(null);

  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const today = dayNumber(Date.now());

  // ── "While you were away" — growth since last app visit ──
  useEffect(() => {
    try {
      const KEY = 'nexus_home_last_visit';
      const prev = Number(localStorage.getItem(KEY));
      localStorage.setItem(KEY, String(Date.now()));
      if (Number.isFinite(prev) && prev > 0 && Date.now() - prev > 6 * 3600_000) {
        fetch(`/api/stats/changes?since=${prev}`)
          .then(r => (r.ok ? r.json() : null))
          .then(d => { if (d && (d.newNodes ?? 0) + (d.newConnections ?? 0) > 0) setGrowth(d); })
          .catch(() => {});
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // ── Daily Mystery ──
  useEffect(() => {
    fetch('/api/explore/daily-mystery')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.question && d?.nodeId) setMystery(d); })
      .catch(() => {});
  }, []);

  // ── Daily Quest: deterministic connectable pair for today ──
  const quest = useMemo(() => {
    if (nodes.length < 2 || edges.length === 0) return null;
    const g = buildAdjacency(nodes.map(n => n.id), edges.map(e => [e.from, e.to] as [string, string]));
    const pair = dailyQuestPair(today, g);
    if (!pair) return null;
    const from = byId.get(pair.from); const to = byId.get(pair.to);
    if (!from || !to) return null;
    return { from, to, key: [pair.from, pair.to].sort().join('|') };
  }, [nodes, edges, byId, today]);

  const questDone = questDay === today;
  // Auto-complete the quest the moment the user has traced its pair in Connect.
  useEffect(() => {
    if (quest && !questDone && connectionsFound.includes(quest.key)) completeQuest(today);
  }, [quest, questDone, connectionsFound, completeQuest, today]);

  // ── Feed: alternate spotlights (by degree) with hidden-connection cards ──
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of edges) { d.set(e.from, (d.get(e.from) ?? 0) + 1); d.set(e.to, (d.get(e.to) ?? 0) + 1); }
    return d;
  }, [edges]);

  const spotlights = useMemo(() => {
    // Prioritise unseen, well-connected nodes so the feed rewards curiosity.
    return [...nodes]
      .sort((a, b) => {
        const av = visited.includes(a.id) ? 1 : 0, bv = visited.includes(b.id) ? 1 : 0;
        if (av !== bv) return av - bv;
        return (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0);
      });
  }, [nodes, degree, visited]);

  const rank = rankForXp(xp);
  const nxt = nextRank(xp);
  const savedNodes = bookmarks.map(id => byId.get(id)).filter((n): n is GraphNode => !!n);

  const openNode = (n: GraphNode) => navigateToNode(n.id, n.title);

  if (nodes.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-slate-500">Loading archive…</div>;
  }

  const visible = spotlights.slice(0, limit);

  return (
    <div className="max-w-[1060px] mx-auto px-4 py-6">
      {growth && (
        <button
          onClick={() => setCurrentView('explore')}
          className="w-full mb-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/25 hover:border-emerald-400/50 text-xs text-emerald-300 font-semibold transition-all"
        >
          <Sparkles size={13} className="text-emerald-400" />
          While you were away: {growth.newNodes > 0 && `${growth.newNodes} new topic${growth.newNodes !== 1 ? 's' : ''}`}
          {growth.newNodes > 0 && growth.newConnections > 0 && ' and '}
          {growth.newConnections > 0 && `${growth.newConnections} new connection${growth.newConnections !== 1 ? 's' : ''}`}
          {' '}joined the archive <ArrowRight size={12} />
        </button>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Feed column ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Connect hero */}
          <button
            onClick={() => setCurrentView('connect')}
            className="group w-full text-left p-5 rounded-2xl border border-purple-500/25 hover:border-purple-400/50 transition-all"
            style={{ background: 'linear-gradient(120deg, rgba(124,58,237,.22), rgba(6,182,212,.14))' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Compass size={15} className="text-purple-300" />
              <span className="text-[11px] font-black uppercase tracking-widest text-purple-300">Pathfinder</span>
            </div>
            <div className="text-lg font-black text-white mb-1">How is everything connected?</div>
            <div className="text-sm text-slate-300/90 flex items-center gap-1.5">
              Pick any two topics and trace every path between them
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {visible.map((n, i) => {
            // Every 4th slot, render a hidden-connection card instead.
            if (i > 0 && i % 4 === 0) {
              const e = edges[(i * 3) % edges.length];
              const from = e && byId.get(e.from); const to = e && byId.get(e.to);
              if (e && from && to) {
                const color = REL_COLOR[e.relationship_type] ?? '#7c3aed';
                return (
                  <div key={`edge-${e.id}`} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                    <div className="flex items-center gap-2 mb-3">
                      <Network size={13} style={{ color }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>Hidden connection</span>
                      <Chip color={color}>{humanize(e.relationship_type)}</Chip>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => openNode(from)} className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm font-semibold text-white transition-colors">{from.icon} {from.title}</button>
                      <ArrowRight size={14} className="text-slate-500" />
                      <button onClick={() => openNode(to)} className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm font-semibold text-white transition-colors">{to.icon} {to.title}</button>
                    </div>
                    {e.explanation && <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{e.explanation}</p>}
                  </div>
                );
              }
            }
            const ev = n.evidence_level;
            const kind = visited.includes(n.id) ? 'Revisit' : (degree.get(n.id) ?? 0) > 4 ? 'Trending' : 'Spotlight';
            const isSaved = bookmarks.includes(n.id);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => openNode(n)} className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300 flex items-center gap-1">
                        {kind === 'Trending' && <TrendingUp size={11} />}{kind}
                      </span>
                    </div>
                    <div className="text-base font-black text-white leading-snug flex items-center gap-2">
                      <span>{n.icon}</span><span className="truncate">{n.title}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed line-clamp-2">{n.description}</p>
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <Chip color="#7c3aed">{n.category}</Chip>
                      {ev && <Chip color={EVIDENCE_COLOR[ev] ?? '#8b91ab'}>{EVIDENCE_LABEL[ev] ?? ev}</Chip>}
                    </div>
                  </button>
                  <button
                    onClick={() => toggleBookmark(n.id)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                    title={isSaved ? 'Remove bookmark' : 'Save for later (+5 XP)'}
                  >
                    {isSaved ? <BookmarkCheck size={16} className="text-amber-400" /> : <Bookmark size={16} className="text-slate-500" />}
                  </button>
                </div>
                <button
                  onClick={() => openNode(n)}
                  className="mt-3 text-xs font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1"
                >
                  Start a thread <ArrowRight size={12} />
                </button>
              </motion.div>
            );
          })}

          {limit < spotlights.length && (
            <button
              onClick={() => setLimit(l => l + PAGE)}
              className="w-full py-3 rounded-xl border border-white/[0.07] hover:border-white/[0.14] text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              Show more from the archive <ChevronDown size={14} />
            </button>
          )}
        </div>

        {/* ── Right rail ── */}
        <aside className="w-full lg:w-72 shrink-0 space-y-3 lg:sticky lg:top-4 self-start">
          {/* Daily Mystery */}
          {mystery && (
            <div className="p-4 rounded-xl border border-indigo-500/25" style={{ background: 'linear-gradient(135deg, rgba(79,70,229,.28), rgba(124,58,237,.14))' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <HelpCircle size={13} className="text-indigo-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Today&apos;s Mystery</span>
                <span className="text-[9px] text-indigo-300/70 ml-auto">+25 XP</span>
              </div>
              <p className="text-sm font-semibold text-white leading-snug mb-2.5">{mystery.question}</p>
              <button
                onClick={() => { openMystery(today); navigateToNode(mystery.nodeId, mystery.nodeTitle); }}
                className="text-xs font-semibold text-indigo-200 hover:text-white flex items-center gap-1"
              >
                {mysteryDay === today ? 'Revisit' : 'Dig into it'} <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Daily Quest */}
          {quest && (
            <div className={`p-4 rounded-xl border ${questDone ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-white/[0.07] bg-white/[0.03]'}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={13} className={questDone ? 'text-emerald-400' : 'text-purple-300'} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Daily Quest</span>
                <span className="text-[9px] text-slate-500 ml-auto">{questDone ? '✓ +40 XP' : '+40 XP'}</span>
              </div>
              <p className="text-xs text-slate-400 mb-2.5">Trace the connection between:</p>
              <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-white mb-3">
                <span>{quest.from.icon} {quest.from.title}</span>
                <ArrowRight size={12} className="text-slate-500" />
                <span>{quest.to.icon} {quest.to.title}</span>
              </div>
              {questDone ? (
                <div className="text-xs font-semibold text-emerald-400">Quest complete — nice work!</div>
              ) : (
                <button onClick={() => setCurrentView('connect')} className="text-xs font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1">
                  Open Pathfinder <ArrowRight size={12} />
                </button>
              )}
            </div>
          )}

          {/* Streak */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Flame size={13} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Streak</span>
              <span className="text-sm font-black text-amber-400 ml-auto font-mono">{streak}d</span>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className={`flex-1 h-1.5 rounded-full ${i < Math.min(streak, 7) ? 'bg-amber-400' : 'bg-white/[0.08]'}`} />
              ))}
            </div>
          </div>

          {/* Rank progress */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-white">{rank.name}</span>
              <span className="text-xs font-mono text-slate-400">{xp} XP</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${rankProgress(xp) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#22d3ee)' }} />
            </div>
            {nxt && <div className="text-[11px] text-slate-500 mt-1.5">{nxt.xpNeeded} XP to {nxt.name}</div>}
          </div>

          {/* Saved for later */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Bookmark size={13} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Saved for later</span>
            </div>
            {savedNodes.length === 0 ? (
              <p className="text-xs text-slate-500">Bookmark topics to build a reading list.</p>
            ) : (
              <div className="space-y-1.5">
                {savedNodes.slice(0, 6).map(n => (
                  <button key={n.id} onClick={() => openNode(n)} className="w-full text-left text-xs text-slate-300 hover:text-white flex items-center gap-1.5 truncate">
                    <span>{n.icon}</span><span className="truncate">{n.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
