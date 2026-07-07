'use client';
/**
 * First-visit onboarding tour. Five bottom-docked steps, each navigating to the
 * screen it describes so the user sees the real thing as they read. Persisted
 * via the engagement store's onboardingDone flag, so it shows exactly once.
 * Mounted in the app shell; renders nothing on the landing page or once done.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Compass, Rabbit, Network, Home, Sparkles } from 'lucide-react';
import { useUserStore, type ViewType } from '@/lib/store/userStore';
import { useEngagement } from '@/lib/store/engagementStore';

interface Step { view: ViewType; icon: typeof Home; title: string; body: string }

const STEPS: Step[] = [
  { view: 'home',        icon: Home,    title: 'Welcome to the Archive', body: 'This is your Home feed — a living stream of topics and the hidden connections between them. Earn XP as you explore.' },
  { view: 'connect',     icon: Compass, title: 'Trace any connection',   body: 'Pathfinder answers “how is everything connected?” Pick any two topics and see every path between them.' },
  { view: 'rabbit-hole', icon: Rabbit,  title: 'Fall down a rabbit hole', body: 'Follow a chain of linked topics one hop at a time. Save your trail as an expedition to resume later.' },
  { view: 'graph',       icon: Network, title: 'See the whole web',       body: 'The graph shows the archive as a living network. Zoom, drag, and click any node to dive in.' },
  { view: 'home',        icon: Sparkles,title: 'You’re all set',          body: 'Come back daily for a new Mystery and Quest, build a streak, and unlock achievements. Start exploring!' },
];

export default function OnboardingTour() {
  const { currentView, setCurrentView } = useUserStore();
  const onboardingDone   = useEngagement(s => s.onboardingDone);
  const markOnboardingDone = useEngagement(s => s.markOnboardingDone);

  const [i, setI] = useState(0);
  const [active, setActive] = useState(false);

  // Start the tour once the user is inside the app (not on landing) and hasn't done it.
  useEffect(() => {
    if (!onboardingDone && currentView !== 'landing') {
      const t = setTimeout(() => setActive(true), 900);
      return () => clearTimeout(t);
    }
  }, [onboardingDone, currentView]);

  if (!active || onboardingDone) return null;

  const step = STEPS[i];
  const Icon = step.icon;
  const isLast = i === STEPS.length - 1;

  const goto = (idx: number) => {
    setI(idx);
    setCurrentView(STEPS[idx].view);
  };
  const finish = () => { setActive(false); markOnboardingDone(); };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 24, stiffness: 240 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] w-[92vw] max-w-md"
      >
        <div className="rounded-2xl bg-[#0a0a18] border border-purple-500/30 shadow-2xl shadow-purple-950/40 p-5">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/15 shrink-0">
              <Icon size={17} className="text-purple-300" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-white">{step.title}</div>
              <p className="text-[13px] text-slate-400 leading-relaxed mt-1">{step.body}</p>
            </div>
            <button onClick={finish} className="text-slate-500 hover:text-white shrink-0" aria-label="Skip tour"><X size={16} /></button>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-purple-400' : 'w-1.5 bg-white/15'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <button onClick={() => goto(i - 1)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white">
                  <ArrowLeft size={13} /> Back
                </button>
              )}
              {isLast ? (
                <button onClick={finish} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold">
                  Start exploring <ArrowRight size={13} />
                </button>
              ) : (
                <button onClick={() => goto(i + 1)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold">
                  Next <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
