'use client';
import { useEffect, useRef } from 'react';

export default function TunnelEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

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

    const draw = () => {
      timeRef.current += 0.005;
      const t = timeRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw tunnel rings
      const rings = 16;
      for (let i = rings; i > 0; i--) {
        const progress = i / rings;
        const depth = (progress + t % 1) % 1;
        const radius = (1 - depth) * Math.max(cx, cy) * 1.8;
        const opacity = depth * 0.6;

        // Hexagonal tunnel shape
        ctx.beginPath();
        for (let side = 0; side < 6; side++) {
          const angle = (side * Math.PI * 2) / 6 + t * 0.2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (side === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(124, 58, 237, ${opacity * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner glow on rings
        if (i % 3 === 0) {
          ctx.strokeStyle = `rgba(6, 182, 212, ${opacity * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Radial lines converging to center
      const lineCount = 24;
      for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2 + t * 0.1;
        const fadePos = (t * 0.3) % 1;

        const gradient = ctx.createLinearGradient(
          cx, cy,
          cx + Math.cos(angle) * cx * 1.5,
          cy + Math.sin(angle) * cy * 1.5
        );
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0)');
        gradient.addColorStop(fadePos, `rgba(124, 58, 237, 0.15)`);
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(angle) * cx * 1.5,
          cy + Math.sin(angle) * cy * 1.5
        );
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Central glow
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      centerGlow.addColorStop(0, 'rgba(124, 58, 237, 0.15)');
      centerGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.05)');
      centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
