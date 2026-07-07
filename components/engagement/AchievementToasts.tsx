'use client';
/**
 * Bottom-right achievement toast stack. The engagement store queues a key on
 * every unlock; we surface them one at a time (amber ring), auto-dismissing
 * after ~4s. Mounted once in the app shell.
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award } from 'lucide-react';
import { useEngagement } from '@/lib/store/engagementStore';
import { ACHIEVEMENTS, ACHIEVEMENT_XP } from '@/lib/engagement/rules';

const BY_KEY = new Map(ACHIEVEMENTS.map(a => [a.key, a]));

export default function AchievementToasts() {
  const toasts       = useEngagement(s => s.toasts);
  const dismissToast = useEngagement(s => s.dismissToast);
  const current      = toasts[0] ?? null;

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismissToast, 4000);
    return () => clearTimeout(t);
  }, [current, dismissToast]);

  const def = current ? BY_KEY.get(current) : null;

  return (
    <div className="fixed bottom-16 right-4 z-[60] pointer-events-none">
      <AnimatePresence>
        {def && (
          <motion.button
            key={def.key}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onClick={dismissToast}
            className="pointer-events-auto flex items-center gap-3 pl-3 pr-4 py-3 rounded-xl bg-[#0a0a18] border border-amber-400/40 shadow-xl shadow-amber-900/20"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400/15 ring-1 ring-amber-400/50">
              <Award size={18} className="text-amber-400" />
            </span>
            <span className="text-left">
              <span className="block text-[9px] font-black tracking-[0.18em] text-amber-400 uppercase">
                Achievement Unlocked · +{ACHIEVEMENT_XP} XP
              </span>
              <span className="block text-sm font-bold text-white leading-tight">{def.name}</span>
              <span className="block text-[11px] text-slate-400">{def.desc}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
