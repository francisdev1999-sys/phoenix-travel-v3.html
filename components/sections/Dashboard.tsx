'use client';
import { motion } from 'framer-motion';
import { Trophy, Star, GitBranch, Rabbit, Clock, Target, TrendingUp, Award } from 'lucide-react';
import { useUserStore, ACHIEVEMENTS } from '@/lib/store/userStore';
import { theories } from '@/lib/data/theories';

const LEVEL_XP: Record<string, number> = {
  'Curious Visitor': 0,
  'Researcher': 100,
  'Investigator': 300,
  'Truth Seeker': 600,
  'Deep Diver': 1000,
  'Rabbit Hole Master': 2000,
};

const LEVEL_COLORS: Record<string, string> = {
  'Curious Visitor': '#64748b',
  'Researcher': '#22c55e',
  'Investigator': '#06b6d4',
  'Truth Seeker': '#7c3aed',
  'Deep Diver': '#f59e0b',
  'Rabbit Hole Master': '#ef4444',
};

export default function Dashboard() {
  const { progress, getNextLevel } = useUserStore();
  const nextLevel = getNextLevel();
  const levelColor = LEVEL_COLORS[progress.level] || '#64748b';
  const currentLevelXP = LEVEL_XP[progress.level] || 0;
  const nextLevelXP = nextLevel ? progress.xp + nextLevel.xpNeeded : progress.xp;
  const xpProgress = nextLevel
    ? ((progress.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  const recentTheories = progress.recentDiscoveries
    .map(id => theories.find(t => t.id === id))
    .filter(Boolean)
    .slice(0, 5);

  const totalTheories = theories.length;
  const exploredCount = progress.theoriesExplored.length;
  const completionPct = Math.round((exploredCount / totalTheories) * 100);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <Target size={22} className="text-purple-400" />
          Command Center
        </h2>
        <p className="text-sm text-slate-500 mt-1">Your exploration progress and achievements</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 border relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${levelColor}15, transparent)`,
          borderColor: `${levelColor}40`,
        }}
      >
        <div className="absolute top-0 right-0 text-8xl opacity-5 font-black text-white">
          ◈
        </div>
        <div className="relative">
          <div className="text-xs text-slate-500 tracking-widest uppercase mb-1">Current Rank</div>
          <div className="text-3xl font-black" style={{ color: levelColor }}>
            {progress.level}
          </div>
          <div className="text-sm text-slate-400 mt-1">{progress.xp} XP total</div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{progress.xp - currentLevelXP} / {nextLevelXP - currentLevelXP} XP</span>
              {nextLevel && <span>Next: {nextLevel.name}</span>}
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${levelColor}, ${levelColor}cc)` }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Star, label: 'Theories Explored', value: exploredCount, total: totalTheories, color: '#7c3aed' },
          { icon: GitBranch, label: 'Connections Found', value: progress.connectionsDiscovered.length, color: '#06b6d4' },
          { icon: Rabbit, label: 'Rabbit Hole Depth', value: progress.rabbitHoleDepth, color: '#f59e0b' },
          { icon: Trophy, label: 'Achievements', value: progress.achievements.length, total: ACHIEVEMENTS.length, color: '#22c55e' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-4"
            >
              <Icon size={18} style={{ color: stat.color }} className="mb-2" />
              <div className="text-2xl font-black text-white">{stat.value}</div>
              {stat.total !== undefined && (
                <div className="text-xs text-slate-500">/ {stat.total}</div>
              )}
              <div className="text-xs text-slate-500 mt-1 leading-tight">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400" />
            Archive Completion
          </h3>
          <span className="text-xl font-black text-cyan-400">{completionPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {theories.slice(0, 9).map(theory => {
            const explored = progress.theoriesExplored.includes(theory.id);
            return (
              <div
                key={theory.id}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: explored ? theory.color : '#374151' }}
              >
                <span>{theory.icon}</span>
                <span className="truncate">{theory.title}</span>
                {explored && <span className="text-green-400 ml-auto">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {recentTheories.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Clock size={16} className="text-purple-400" />
            Recent Discoveries
          </h3>
          <div className="space-y-2">
            {recentTheories.map((theory, i) => theory && (
              <motion.div
                key={theory.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-white/5"
              >
                <span className="text-lg">{theory.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{theory.title}</div>
                  <div className="text-xs text-slate-500">{theory.category}</div>
                </div>
                <div className="text-xs text-green-400">✓ Explored</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Award size={16} className="text-yellow-400" />
          Achievements ({progress.achievements.length}/{ACHIEVEMENTS.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((achievement, i) => {
            const unlocked = progress.achievements.includes(achievement.id);
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  unlocked
                    ? 'border-yellow-500/30 bg-yellow-900/10'
                    : 'border-white/5 bg-slate-900/20 opacity-40'
                }`}
              >
                <div className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>
                  {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold ${unlocked ? 'text-yellow-300' : 'text-slate-600'}`}>
                    {achievement.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{achievement.description}</div>
                </div>
                {unlocked && (
                  <div className="text-xs text-yellow-500 font-bold">+{achievement.xpReward}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
