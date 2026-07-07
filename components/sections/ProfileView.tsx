'use client';
/**
 * Profile — the player card. Rank + XP progress, headline stats, the 12
 * achievements grid (unlocked vs in-progress), collections management and the
 * saved-nodes reading list. All driven by the engagement store.
 */
import { useState } from 'react';
import {
  Footprints, BookOpen, Library, Waypoints, Spline, Rabbit, Flag, Bookmark,
  FolderOpen, FilePlus, Target, Flame, Network, Layers, Plus, X, ArrowRight, Award,
} from 'lucide-react';
import { useNodes } from '@/lib/graph/useNodes';
import type { GraphNode } from '@/lib/graph/types';
import { useUserStore } from '@/lib/store/userStore';
import { useEngagement } from '@/lib/store/engagementStore';
import {
  ACHIEVEMENTS, ACHIEVEMENT_XP, rankForXp, nextRank, rankProgress, type AchievementState,
} from '@/lib/engagement/rules';

const ICONS: Record<string, typeof Award> = {
  footprints: Footprints, 'book-open': BookOpen, library: Library, waypoints: Waypoints,
  spline: Spline, rabbit: Rabbit, flag: Flag, bookmark: Bookmark, 'folder-open': FolderOpen,
  'file-plus': FilePlus, target: Target, flame: Flame,
};

function StatCard({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-1">
      <Icon size={16} className="text-purple-400/70" />
      <div className="text-2xl font-black text-white font-mono">{value}</div>
      <div className="text-[11px] text-slate-500 tracking-wide">{label}</div>
    </div>
  );
}

export default function ProfileView() {
  const nodes = useNodes();
  const { navigateToNode } = useUserStore();

  const xp               = useEngagement(s => s.xp);
  const streak           = useEngagement(s => s.streak);
  const visited          = useEngagement(s => s.visited);
  const connectionsFound = useEngagement(s => s.connectionsFound);
  const maxDepth         = useEngagement(s => s.maxDepth);
  const bookmarks        = useEngagement(s => s.bookmarks);
  const expeditions      = useEngagement(s => s.expeditions);
  const collections      = useEngagement(s => s.collections);
  const proposals        = useEngagement(s => s.proposals);
  const questDay         = useEngagement(s => s.questDay);
  const achUnlocked      = useEngagement(s => s.achUnlocked);
  const createCollection = useEngagement(s => s.createCollection);
  const deleteCollection = useEngagement(s => s.deleteCollection);

  const [newCollection, setNewCollection] = useState('');

  const byId = new Map(nodes.map(n => [n.id, n]));
  const rank = rankForXp(xp);
  const nxt = nextRank(xp);
  const savedNodes = bookmarks.map(id => byId.get(id)).filter((n): n is GraphNode => !!n);

  const metricState: AchievementState = {
    visitedCount: visited.length, connectionsCount: connectionsFound.length, maxDepth,
    expeditionsCount: expeditions.length, bookmarksCount: bookmarks.length,
    collectionsCount: collections.length, proposalsCount: proposals.length,
    questCompleted: questDay != null, streak,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header card */}
      <div className="p-6 rounded-2xl border border-purple-500/25" style={{ background: 'linear-gradient(120deg, rgba(124,58,237,.22), rgba(34,211,238,.10))' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#22d3ee)' }} />
          <div className="flex-1 min-w-0">
            <div className="text-xl font-black text-white">{rank.name}</div>
            <div className="text-xs text-slate-300/80 font-mono">{xp} XP</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 rounded-full bg-black/30 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${rankProgress(xp) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#22d3ee)' }} />
          </div>
          <div className="text-[11px] text-slate-300/70 mt-1.5">
            {nxt ? `${nxt.xpNeeded} XP to ${nxt.name}` : 'Top rank reached — Nexus Keeper'}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Layers}   label="Nodes explored" value={visited.length} />
        <StatCard icon={Network}  label="Connections"    value={connectionsFound.length} />
        <StatCard icon={Bookmark} label="Bookmarks"      value={bookmarks.length} />
        <StatCard icon={Flame}    label="Day streak"     value={streak} />
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
          <Award size={15} className="text-amber-400" /> Achievements
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map(a => {
            const unlocked = achUnlocked.includes(a.key);
            const cur = Math.min(a.metric(metricState), a.goal);
            const Icon = ICONS[a.icon] ?? Award;
            return (
              <div
                key={a.key}
                className={`p-3 rounded-xl border transition-all ${unlocked ? 'border-amber-400/40 bg-amber-400/[0.06] shadow-lg shadow-amber-900/10' : 'border-white/[0.07] bg-white/[0.02] opacity-70'}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${unlocked ? 'bg-amber-400/15' : 'bg-white/[0.04]'}`}>
                    <Icon size={15} className={unlocked ? 'text-amber-400' : 'text-slate-500'} />
                  </span>
                  <span className="text-sm font-bold text-white leading-tight">{a.name}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug mb-1.5">{a.desc}</p>
                {unlocked ? (
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wide">Unlocked · +{ACHIEVEMENT_XP} XP</span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">{cur} / {a.goal}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Collections */}
      <div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
          <FolderOpen size={15} className="text-purple-400" /> Collections
        </h2>
        <form
          onSubmit={e => { e.preventDefault(); createCollection(newCollection); setNewCollection(''); }}
          className="flex items-center gap-2 mb-3 max-w-sm"
        >
          <input
            value={newCollection}
            onChange={e => setNewCollection(e.target.value)}
            placeholder="New collection…"
            className="flex-1 bg-white/[0.03] border border-white/[0.07] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none"
          />
          <button type="submit" className="px-3 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </form>
        {collections.length === 0 ? (
          <p className="text-xs text-slate-500">No collections yet — create one to group your bookmarks.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {collections.map(c => (
              <span key={c.id} className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-slate-200">
                {c.name} <span className="text-[11px] text-slate-500 font-mono">{c.nodeIds.length}</span>
                <button onClick={() => deleteCollection(c.id)} className="text-slate-500 hover:text-red-400"><X size={13} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expeditions */}
      {expeditions.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
            <Flag size={15} className="text-cyan-400" /> Saved expeditions
          </h2>
          <div className="space-y-2">
            {expeditions.map(e => (
              <div key={e.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{e.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{e.depth} hops</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved nodes */}
      <div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
          <Bookmark size={15} className="text-amber-400" /> Saved nodes
        </h2>
        {savedNodes.length === 0 ? (
          <p className="text-xs text-slate-500">Nothing saved yet. Bookmark topics as you explore.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {savedNodes.map(n => (
              <button
                key={n.id}
                onClick={() => navigateToNode(n.id, n.title)}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] text-left flex items-center justify-between gap-2 transition-colors"
              >
                <span className="text-sm text-slate-200 truncate flex items-center gap-2"><span>{n.icon}</span>{n.title}</span>
                <ArrowRight size={13} className="text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
