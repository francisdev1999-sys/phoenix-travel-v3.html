'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ChevronDown, Compass, Zap } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import TunnelEffect from '@/components/effects/TunnelEffect';
import ParticleField from '@/components/effects/ParticleField';

const GLYPHS = ['⬡', '◈', '⊕', '△', '◇', '✦', '⟁', '⬟', '✧', '⊗', '⌬', '⎔'];

export default function LandingPage() {
  const setCurrentView = useUserStore((s) => s.setCurrentView);
  const [glyphIndex, setGlyphIndex] = useState(0);
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 30, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 30 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer1 = setTimeout(() => setTitleVisible(true), 600);
    const timer2 = setTimeout(() => setSubtitleVisible(true), 1400);
    const timer3 = setTimeout(() => setButtonsVisible(true), 2200);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlyphIndex((i) => (i + 1) % GLYPHS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 40;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 40;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  return (
    <div ref={containerRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#000005]">
      {/* Background layers */}
      <TunnelEffect />
      <ParticleField />

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none z-10"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,5,0.8) 100%)' }} />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 gap-8">

        {/* Rotating glyph ring */}
        <motion.div
          style={{ rotateX: springY, rotateY: springX }}
          className="relative w-40 h-40 flex items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-rotate-slow" />
          <div className="absolute inset-3 rounded-full border border-cyan-500/20 animate-[rotate-slow_15s_linear_infinite_reverse]" />
          <div className="absolute inset-6 rounded-full border border-purple-400/20 animate-rotate-slow" />

          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <div
              key={deg}
              className="absolute w-1.5 h-1.5 rounded-full bg-purple-400"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${deg}deg) translateX(60px) translateY(-50%)`,
              }}
            />
          ))}

          <motion.div
            key={glyphIndex}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="text-4xl text-purple-300 text-glow-purple z-10"
          >
            {GLYPHS[glyphIndex]}
          </motion.div>

          <div className="absolute inset-8 rounded-full bg-purple-900/30 blur-xl" />
        </motion.div>

        {titleVisible && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="space-y-2"
            style={{ rotateX: springY, rotateY: springX }}
          >
            <div className="text-xs tracking-[0.6em] text-cyan-400/70 font-light uppercase mb-4">
              CLASSIFIED ARCHIVE — LEVEL OMEGA
            </div>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none">
              <span className="text-white text-glow-purple">THE NEXUS</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-flicker">
                ARCHIVE
              </span>
            </h1>

            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-500" />
              <span className="text-purple-400 text-sm">✦</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500" />
            </div>
          </motion.div>
        )}

        {subtitleVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-lg"
          >
            <p className="text-lg sm:text-xl text-slate-300 font-light leading-relaxed">
              &quot;What if history is more mysterious than we think?&quot;
            </p>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              An interactive archive of theories, ancient mysteries, alternative interpretations,
              and the hidden connections between unexplained phenomena.
            </p>
            <p className="text-xs text-purple-400/60 mt-2 italic">
              All content presented as theories and open questions — not established facts.
            </p>
          </motion.div>
        )}

        {buttonsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 mt-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentView('graph')}
              className="group relative px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-purple-600 group-hover:from-purple-600 group-hover:to-cyan-600 transition-all duration-500" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 glow-purple" />
              <div className="relative flex items-center gap-2">
                <Compass size={16} />
                Enter The Archive
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentView('universe')}
              className="group relative px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase overflow-hidden border border-cyan-500/30 hover:border-cyan-400/60 transition-colors"
            >
              <div className="absolute inset-0 bg-cyan-950/30 group-hover:bg-cyan-900/40 transition-all" />
              <div className="relative flex items-center gap-2 text-cyan-300">
                <Zap size={16} />
                Begin Exploration
              </div>
            </motion.button>
          </motion.div>
        )}

        {buttonsVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex items-center gap-8 mt-8"
          >
            {[
              { label: 'Theories', value: '50+' },
              { label: 'Connections', value: '200+' },
              { label: 'Ancient Sites', value: '12' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-black text-purple-300">{stat.value}</div>
                <div className="text-xs text-slate-500 tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-slate-500"
      >
        <span className="text-xs tracking-widest uppercase">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </motion.div>

      <div className="fixed top-20 left-4 z-10 text-purple-500/20 text-xs font-mono hidden lg:block">
        {['SYS: ACTIVE', 'SEC: OMEGA', 'NET: ENCRYPTED'].map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <div className="fixed top-20 right-4 z-10 text-cyan-500/20 text-xs font-mono text-right hidden lg:block">
        {['AUTH: GRANTED', 'LEVEL: ∞', 'STATUS: ONLINE'].map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
