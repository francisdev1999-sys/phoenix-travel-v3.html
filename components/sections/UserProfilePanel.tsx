'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Award, Loader2 } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  awardedAt: string;
}

interface ProfileData {
  name: string;
  image?: string;
  role: string;
  rank: string;
  trustScore: number;
  trustLevel: string;
  activityScore: number;
  memberSince: string;
  stats: { submissions: number; approved: number; rejected: number };
  badges: Badge[];
}

const RANK_COLORS: Record<string, string> = {
  'New Seeker':           'text-slate-400',
  'Active Seeker':        'text-blue-400',
  'Archive Explorer':     'text-cyan-400',
  'Source Contributor':   'text-green-400',
  'Evidence Builder':     'text-emerald-400',
  'Trusted Seeker':       'text-purple-400',
  'Verified Contributor': 'text-violet-400',
  'Research Ally':        'text-amber-400',
  'Archive Fellow':       'text-orange-400',
  'Council Reviewer':     'text-red-400',
};

const TRUST_COLORS: Record<string, string> = {
  Low:      'text-red-400',
  Moderate: 'text-yellow-400',
  Good:     'text-green-400',
  Trusted:  'text-emerald-400',
  Elite:    'text-purple-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  legacy:       '🏛️ Legacy',
  milestone:    '📅 Milestone',
  contribution: '📝 Contribution',
  trust:        '🔐 Trust',
  authority:    '⚡ Authority',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function UserProfilePanel({ open, onClose }: Props) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !session?.user) return;
    setLoading(true);
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [open, session?.user]);

  const approvalRate =
    profile && profile.stats.submissions > 0
      ? Math.round((profile.stats.approved / profile.stats.submissions) * 100)
      : null;

  const byCategory = profile?.badges.reduce<Record<string, Badge[]>>((acc, b) => {
    (acc[b.category] ??= []).push(b);
    return acc;
  }, {}) ?? {};

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-[#080814] border-l border-purple-900/30 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-purple-900/20 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Trophy size={15} className="text-purple-400" />
                <span className="text-sm font-bold text-white">My Profile</span>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-purple-400" size={22} />
                </div>
              ) : !profile ? (
                <p className="text-xs text-slate-500 text-center py-16">Failed to load profile.</p>
              ) : (
                <>
                  {/* Identity */}
                  <div className="flex items-center gap-4">
                    {profile.image ? (
                      <img src={profile.image} alt="" className="w-14 h-14 rounded-full border-2 border-purple-500/40" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-purple-900/60 flex items-center justify-center text-xl font-bold text-purple-300">
                        {profile.name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{profile.name}</p>
                      <p className={`text-xs font-medium ${RANK_COLORS[profile.rank] ?? 'text-slate-400'}`}>
                        {profile.rank}
                      </p>
                      {profile.role !== 'user' && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-900/50 text-purple-300">
                          {profile.role.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trust & Activity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-purple-900/10 border border-purple-900/20">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Trust Score</p>
                      <p className="text-2xl font-bold text-white">{profile.trustScore}</p>
                      <p className={`text-[10px] font-medium ${TRUST_COLORS[profile.trustLevel] ?? 'text-slate-400'}`}>
                        {profile.trustLevel}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-900/10 border border-purple-900/20">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Activity</p>
                      <p className="text-2xl font-bold text-white">{Math.round(profile.activityScore)}</p>
                      <p className="text-[10px] text-slate-500">score</p>
                    </div>
                  </div>

                  {/* Contribution stats */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-3">Contributions</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-white">{profile.stats.submissions}</p>
                        <p className="text-[10px] text-slate-500">Submitted</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-400">{profile.stats.approved}</p>
                        <p className="text-[10px] text-slate-500">Approved</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-red-400">{profile.stats.rejected}</p>
                        <p className="text-[10px] text-slate-500">Rejected</p>
                      </div>
                    </div>
                    {approvalRate !== null && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Approval rate</span>
                          <span>{approvalRate}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${approvalRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Award size={13} className="text-purple-400" />
                      <p className="text-xs font-bold text-white">Badges</p>
                      <span className="text-[10px] text-slate-500">({profile.badges.length})</span>
                    </div>

                    {profile.badges.length === 0 ? (
                      <div className="text-center py-8 rounded-xl border border-dashed border-slate-800">
                        <p className="text-xs text-slate-500">No badges yet</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          Get submissions approved to earn your first badge
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(byCategory).map(([cat, badges]) => (
                          <div key={cat}>
                            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                              {CATEGORY_LABELS[cat] ?? cat}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {badges.map(b => (
                                <div
                                  key={b.id}
                                  className="group relative flex items-center gap-2 p-2.5 rounded-xl bg-purple-900/10 border border-purple-900/20 hover:border-purple-500/40 transition-all"
                                >
                                  <span className="text-xl leading-none flex-shrink-0">{b.icon}</span>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-slate-300 truncate">{b.name}</p>
                                    <p className="text-[9px] text-slate-600">
                                      {new Date(b.awardedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-0 mb-2 w-52 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                                    {b.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <p className="text-center text-[10px] text-slate-700 pb-2">
                    Member since{' '}
                    {new Date(profile.memberSince).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
