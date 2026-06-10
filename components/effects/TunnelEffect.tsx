'use client';
import { useEffect, useRef } from 'react';
import { usePerformanceStore, getEffectiveMode } from '@/lib/store/performanceStore';

export default function TunnelEffect() {
  const { mode } = usePerformanceStore();
  const eff = getEffectiveMode(mode);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const timeRef   = useRef(0);

  // Skip entirely on low-end — saves a full RAF + Canvas draw per frame
  if (eff === 'low') return null;

  const rings     = eff === 'performance' ? 8  : 16;
  const lineCount = eff === 'performance' ? 12 : 24;
  const targetFPS = eff === 'performance' ? 30 : 60;

  return <TunnelCanvas canvasRef={canvasRef} frameRef={frameRef} timeRef={timeRef}
    rings={rings} lineCount={lineCount} targetFPS={targetFPS} mode={eff} />;
}

function TunnelCanvas({ canvasRef, frameRef, timeRef, rings, lineCount, targetFPS, mode }: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  frameRef:  React.MutableRefObject<number>;
  timeRef:   React.MutableRefObject<number>;
  rings:      number;
  lineCount:  number;
  targetFPS:  number;
  mode:       string;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const frameBudget = 1000 / targetFPS;
    let lastFrameTime = 0;

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      const now = performance.now();
      if (now - lastFrameTime < frameBudget) return;
      lastFrameTime = now;

      timeRef.current += 0.005;
      const t  = timeRef.current;
      const cx = canvas.width  / 2;
      const cy = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = rings; i > 0; i--) {
        const depth  = ((i / rings) + t % 1) % 1;
        const radius = (1 - depth) * Math.max(cx, cy) * 1.8;
        const opacity = depth * 0.6;

        ctx.beginPath();
        for (let side = 0; side < 6; side++) {
          const angle = (side * Math.PI * 2) / 6 + t * 0.2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (side === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(124,58,237,${opacity * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        if (i % 3 === 0) {
          ctx.strokeStyle = `rgba(6,182,212,${opacity * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Skip radial lines on performance mode to halve draw calls
      if (mode !== 'performance') {
        for (let i = 0; i < lineCount; i++) {
          const angle   = (i / lineCount) * Math.PI * 2 + t * 0.1;
          const fadePos = (t * 0.3) % 1;
          const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * cx * 1.5, cy + Math.sin(angle) * cy * 1.5);
          grad.addColorStop(0, 'rgba(124,58,237,0)');
          grad.addColorStop(fadePos, 'rgba(124,58,237,0.15)');
          grad.addColorStop(1, 'rgba(124,58,237,0)');
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * cx * 1.5, cy + Math.sin(angle) * cy * 1.5);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      centerGlow.addColorStop(0, 'rgba(124,58,237,0.15)');
      centerGlow.addColorStop(0.5, 'rgba(6,182,212,0.05)');
      centerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(frameRef.current); };
  // Re-run when quality settings change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rings, lineCount, targetFPS, mode]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.6 }} />;
}
