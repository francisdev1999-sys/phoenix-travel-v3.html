'use client';
import { useEffect, useRef } from 'react';

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

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      const count = Math.floor((canvas.width * canvas.height) / 8000);
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(canvas.width, canvas.height));
      }
    };

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

    initParticles();

    // Constellation connections
    const drawConnections = () => {
      const particles = particlesRef.current.filter(p => p.type === 'star');
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(124, 58, 237, ${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw tunnel effect - radial gradient from center
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const tunnelGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cx, cy));
      tunnelGrad.addColorStop(0, 'rgba(124, 58, 237, 0.03)');
      tunnelGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.02)');
      tunnelGrad.addColorStop(1, 'rgba(0, 0, 5, 0)');
      ctx.fillStyle = tunnelGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawConnections();

      particlesRef.current.forEach((p, idx) => {
        p.life++;
        if (p.life > p.maxLife) {
          particlesRef.current[idx] = createParticle(canvas.width, canvas.height);
          return;
        }

        // Mouse repulsion
        const mdx = p.x - mouseRef.current.x;
        const mdy = p.y - mouseRef.current.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 100) {
          p.vx += (mdx / mdist) * 0.1;
          p.vy += (mdy / mdist) * 0.1;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Fade in/out
        const progress = p.life / p.maxLife;
        const fade = progress < 0.1 ? progress / 0.1 : progress > 0.9 ? (1 - progress) / 0.1 : 1;
        const opacity = p.opacity * fade;

        ctx.globalAlpha = opacity;

        if (p.type === 'star') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          // Twinkle glow
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

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}
