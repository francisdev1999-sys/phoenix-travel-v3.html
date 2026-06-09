'use client';
import { useEffect, useRef } from 'react';
import { usePerformanceStore, getPerfConfig } from '@/lib/store/performanceStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  type: 'star' | 'symbol' | 'dot';
  char?: string;
  life: number;
  maxLife: number;
}

const SYMBOLS = ['✦', '⬡', '◈', '⊕', '⟁', '△', '◇', '⬟', '✧', '⊗'];
const COLORS = ['#7c3aed', '#06b6d4', '#3b82f6', '#8b5cf6', '#00bfff', '#a855f7'];
const CONN_DIST = 120;
const CONN_DIST_SQ = CONN_DIST * CONN_DIST;

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const { mode } = usePerformanceStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const particleMultiplier = getPerfConfig(mode).particleMultiplier;

    // Cached tunnel gradient — rebuilt only on resize
    let cachedTunnelGrad: CanvasGradient | null = null;
    let cachedW = 0;
    let cachedH = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cachedTunnelGrad = null;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse);

    const createParticle = (w: number, h: number): Particle => {
      const type = Math.random() < 0.7 ? 'star' : Math.random() < 0.5 ? 'symbol' : 'dot';
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: type === 'star' ? Math.random() * 2 + 0.5 : Math.random() * 8 + 6,
        opacity: Math.random() * 0.7 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        type,
        char: type === 'symbol' ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : undefined,
        life: 0,
        maxLife: Math.random() * 300 + 150,
      };
    };

    const initParticles = () => {
      particlesRef.current = [];
      const count = Math.floor((canvas.width * canvas.height) / 8000 * particleMultiplier);
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(canvas.width, canvas.height));
      }
    };

    initParticles();

    // Spatial-grid constellation connections — O(n) instead of O(n²)
    const drawConnections = () => {
      const stars = particlesRef.current.filter(p => p.type === 'star');
      const cols = Math.ceil(canvas.width / CONN_DIST) + 1;
      const grid = new Map<number, number[]>();
      stars.forEach((p, i) => {
        const key = Math.floor(p.y / CONN_DIST) * cols + Math.floor(p.x / CONN_DIST);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(i);
      });
      stars.forEach((p, i) => {
        const ci = Math.floor(p.x / CONN_DIST);
        const ri = Math.floor(p.y / CONN_DIST);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const cell = grid.get((ri + dr) * cols + (ci + dc));
            if (!cell) continue;
            for (const j of cell) {
              if (j <= i) continue;
              const dx = p.x - stars[j].x;
              const dy = p.y - stars[j].y;
              const d2 = dx * dx + dy * dy;
              if (d2 < CONN_DIST_SQ) {
                const dist = Math.sqrt(d2);
                ctx.beginPath();
                ctx.strokeStyle = `rgba(124, 58, 237, ${0.15 * (1 - dist / CONN_DIST)})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(stars[j].x, stars[j].y);
                ctx.stroke();
              }
            }
          }
        }
      });
    };

    const targetFPS = getPerfConfig(mode).targetFPS;
    const frameBudget = 1000 / targetFPS;
    let lastFrameTime = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      if (now - lastFrameTime < frameBudget) return;
      lastFrameTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!cachedTunnelGrad || cachedW !== canvas.width || cachedH !== canvas.height) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        cachedTunnelGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cx, cy));
        cachedTunnelGrad.addColorStop(0, 'rgba(124, 58, 237, 0.03)');
        cachedTunnelGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.02)');
        cachedTunnelGrad.addColorStop(1, 'rgba(0, 0, 5, 0)');
        cachedW = canvas.width;
        cachedH = canvas.height;
      }
      ctx.fillStyle = cachedTunnelGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawConnections();

      particlesRef.current.forEach((p, idx) => {
        p.life++;
        if (p.life > p.maxLife) {
          particlesRef.current[idx] = createParticle(canvas.width, canvas.height);
          return;
        }

        const mdx = p.x - mouseRef.current.x;
        const mdy = p.y - mouseRef.current.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 100) {
          p.vx += (mdx / mdist) * 0.1;
          p.vy += (mdy / mdist) * 0.1;
        }

        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const progress = p.life / p.maxLife;
        const fade = progress < 0.1 ? progress / 0.1 : progress > 0.9 ? (1 - progress) / 0.1 : 1;
        const opacity = p.opacity * fade;

        ctx.globalAlpha = opacity;

        if (p.type === 'star') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          if (Math.random() < 0.01) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace(')', ', 0.2)').replace('rgb', 'rgba');
            ctx.fill();
          }
        } else if (p.type === 'symbol' && p.char) {
          ctx.font = `${p.size}px monospace`;
          ctx.fillStyle = p.color;
          ctx.fillText(p.char, p.x, p.y);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      });

    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}
