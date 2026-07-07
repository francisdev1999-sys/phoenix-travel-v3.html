'use client';
/**
 * Redesigned left sidebar (208px). Grouped nav, a rank/XP profile card at the
 * bottom, and a quiet staff link to the admin console. Becomes an off-canvas
 * drawer ≤860px (parent controls the open/close + backdrop).
 */
import {
  Home, Compass, Globe2, Network, Map, Clock, Rabbit, Search,
  GitCompare, FilePlus, User, Shield,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useUserStore, type ViewType } from '@/lib/store/userStore';
import { useEngagement } from '@/lib/store/engagementStore';
import { rankForXp } from '@/lib/engagement/rules';

interface NavItem { icon: typeof Home; label: string; view: ViewType; group: string }

const NAV: NavItem[] = [
  { icon: Home,       label: 'Home',       view: 'home',        group: 'Explore' },
  { icon: Compass,    label: 'Pathfinder', view: 'connect',     group: 'Explore' },
  { icon: Globe2,     label: 'Galaxies',   view: 'universe',    group: 'Explore' },
  { icon: Network,    label: 'Graph',      view: 'graph',       group: 'Explore' },
  { icon: Map,        label: 'Map',        view: 'globe',       group: 'Explore' },
  { icon: Clock,      label: 'Timeline',   view: 'timeline',    group: 'Explore' },
  { icon: Rabbit,     label: 'Rabbit Hole',view: 'rabbit-hole', group: 'Research' },
  { icon: Search,     label: 'Search',     view: 'search',      group: 'Research' },
  { icon: GitCompare, label: 'Compare',    view: 'compare',     group: 'Research' },
  { icon: FilePlus,   label: 'Propose',    view: 'propose',     group: 'Contribute' },
  { icon: User,       label: 'Profile',    view: 'profile',     group: 'Contribute' },
];

const STAFF_ROLES = new Set(['owner', 'admin', 'moderation_admin', 'reviewer', 'source_verifier']);

// Which nav item is "active" for a given view (hierarchy views map to Galaxies).
function activeView(view: ViewType): ViewType {
  if (view === 'galaxy' || view === 'cluster') return 'universe';
  if (view === 'research-graph') return 'graph';
  return view;
}

export default function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { currentView, setCurrentView } = useUserStore();
  const { data: session } = useSession();
  const xp     = useEngagement(s => s.xp);
  const streak = useEngagement(s => s.streak);
  const rank   = rankForXp(xp);
  const active = activeView(currentView);
  const role   = (session?.user as { role?: string } | undefined)?.role;
  const isStaff = !!role && STAFF_ROLES.has(role);

  const go = (v: ViewType) => { setCurrentView(v); onNavigate?.(); };

  const groups = Array.from(new Set(NAV.map(n => n.group)));

  return (
    <div className="flex flex-col h-full w-52 bg-[#0a0a18] border-r border-white/[0.07]">
      {/* Logo */}
      <button onClick={() => go('home')} className="flex items-center gap-2 px-4 h-[52px] shrink-0 border-b border-white/[0.06]">
        <span className="text-purple-400 text-base">✦</span>
        <span className="text-[13px] font-black text-white tracking-tight uppercase">Nexus Archive</span>
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {groups.map(group => (
          <div key={group}>
            <div className="px-2 mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">{group}</div>
            <div className="space-y-0.5">
              {NAV.filter(n => n.group === group).map(item => {
                const Icon = item.icon;
                const on = active === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => go(item.view)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                      on ? 'bg-[rgba(124,58,237,0.18)] text-[#e9d5ff]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon size={15} className={on ? 'text-[#c4b5fd]' : ''} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Staff link */}
      {isStaff && (
        <button
          onClick={() => go('admin')}
          className="mx-2 mb-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
        >
          <Shield size={14} /> Admin · Staff
        </button>
      )}

      {/* Profile card */}
      <button onClick={() => go('profile')} className="m-2 mt-1 flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors text-left">
        <span className="w-[30px] h-[30px] rounded-full shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#22d3ee)' }} />
        <span className="min-w-0">
          <span className="block text-[12px] font-bold text-white truncate">{rank.name}</span>
          <span className="block text-[10px] text-slate-500 font-mono">{xp} XP · {streak}d streak</span>
        </span>
      </button>
    </div>
  );
}
