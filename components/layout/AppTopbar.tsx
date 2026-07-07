'use client';
/**
 * Redesigned top bar (52px): hamburger (mobile drawer), global search that
 * routes to the Search screen, and live streak / XP pills fed by the
 * engagement store.
 */
import { useState } from 'react';
import { Menu, Search, Flame, Zap } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { useEngagement } from '@/lib/store/engagementStore';

export default function AppTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { setSearchQuery, setCurrentView } = useUserStore();
  const xp     = useEngagement(s => s.xp);
  const streak = useEngagement(s => s.streak);
  const [q, setQ] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) { setCurrentView('search'); return; }
    setSearchQuery(q.trim());
    setCurrentView('search');
  };

  return (
    <div className="h-[52px] shrink-0 flex items-center gap-3 px-3 sm:px-4 bg-[#06060f]/90 backdrop-blur-md border-b border-white/[0.07]">
      <button onClick={onOpenMenu} className="lg:hidden p-1.5 text-slate-400 hover:text-white" aria-label="Open menu">
        <Menu size={18} />
      </button>

      <form onSubmit={submit} className="flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] focus-within:border-[#7c3aed] focus-within:ring-[3px] focus-within:ring-[rgba(124,58,237,0.12)] rounded-lg px-3 py-1.5 transition-all">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => setCurrentView('search')}
            placeholder="Search theories, people, phenomena…"
            className="flex-1 bg-transparent text-[13px] text-white placeholder-slate-500 outline-none"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
          <Flame size={13} /> {streak}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd' }}>
          <Zap size={13} /> {xp} XP
        </span>
      </div>
    </div>
  );
}
