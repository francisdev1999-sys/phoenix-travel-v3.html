'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, GitBranch, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { theories } from '@/lib/data/theories';
import { Theory } from '@/lib/types';
import { useUserStore } from '@/lib/store/userStore';
import TheoryPanel from '@/components/sections/TheoryPanel';

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  theory: Theory;
  radius: number;
  selected: boolean;
  hovered: boolean;
  pulsePhase: number;
}

interface Edge {
  source: string;
  target: string;
}

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const frameRef = useRef<number>(0);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const draggingRef = useRef<{ nodeId: string | null; panStart: { x: number; y: number } | null }>({ nodeId: null, panStart: null });
  const [selectedTheory, setSelectedTheory] = useState<Theory | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { exploreTheory, discoverConnection } = useUserStore();

  const initGraph = useCallback((w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const categories = [...new Set(theories.map(t => t.category))];

    nodesRef.current = theories.map((theory, i) => {
      const catIdx = categories.indexOf(theory.category);
      const catCount = categories.length;
      const catAngle = (catIdx / catCount) * Math.PI * 2;
      const catRadius = Math.min(w, h) * 0.28;
      const theoryInCat = theories.filter(t => t.category === theory.category);
      const tIdx = theoryInCat.indexOf(theory);
      const spreadAngle = ((tIdx + 0.5) / theoryInCat.length) * Math.PI * 0.4 - Math.PI * 0.2;
      const angle = catAngle + spreadAngle;
      const radiusVariation = catRadius * (0.8 + Math.random() * 0.4);

      return {
        id: theory.id,
        x: cx + Math.cos(angle) * radiusVariation,
        y: cy + Math.sin(angle) * radiusVariation,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        theory,
        radius: theory.featured ? 28 : 20,
        selected: false,
        hovered: false,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });

    edgesRef.current = [];
    theories.forEach(theory => {
      theory.connections.forEach(connId => {
        if (theories.find(t => t.id === connId)) {
          const exists = edgesRef.current.some(
            e => (e.source === theory.id && e.target === connId) ||
                 (e.source === connId && e.target === theory.id)
          );
          if (!exists) {
            edgesRef.current.push({ source: theory.id, target: connId });
          }
        }
      });
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initGraph(canvas.width, canvas.height);
    };
    resize();

    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(canvas);

    let time = 0;

    const getNode = (id: string) => nodesRef.current.find(n => n.id === id);

    const applyForces = () => {
      const nodes = nodesRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      nodes.forEach(node => {
        node.vx += (cx - node.x) * 0.0002;
        node.vy += (cy - node.y) * 0.0002;

        nodes.forEach(other => {
          if (other.id === node.id) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = (node.radius + other.radius) * 3;
          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.3;
            node.vx += dx * force * 0.05;
            node.vy += dy * force * 0.05;
          }
        });

        edgesRef.current.forEach(edge => {
          if (edge.source === node.id || edge.target === node.id) {
            const otherId = edge.source === node.id ? edge.target : edge.source;
            const other = getNode(otherId);
            if (!other) return;
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const target = 200;
            if (dist > target) {
              node.vx += dx * 0.0003;
              node.vy += dy * 0.0003;
            }
          }
        });

        if (draggingRef.current.nodeId !== node.id) {
          node.vx *= 0.95;
          node.vy *= 0.95;
          node.x += node.vx;
          node.y += node.vy;
        }
      });
    };

    const draw = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: tx, y: ty, scale } = transformRef.current;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      edgesRef.current.forEach(edge => {
        const src = getNode(edge.source);
        const tgt = getNode(edge.target);
        if (!src || !tgt) return;

        const selected = src.id === selectedTheory?.id || tgt.id === selectedTheory?.id;
        const hovered = src.id === hoveredId || tgt.id === hoveredId;

        const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y);
        const alpha = selected ? 0.7 : hovered ? 0.5 : 0.12;
        grad.addColorStop(0, `${src.theory.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, `${tgt.theory.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = selected ? 2 : hovered ? 1.5 : 1;
        ctx.stroke();

        if (selected || hovered) {
          const t = (time * 0.3) % 1;
          const px = src.x + (tgt.x - src.x) * t;
          const py = src.y + (tgt.y - src.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#7c3aed';
          ctx.fill();
        }
      });

      nodesRef.current.forEach(node => {
        const isSelected = node.theory.id === selectedTheory?.id;
        const isHovered = node.id === hoveredId;
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7;
        const r = node.radius * (isSelected ? 1.3 : isHovered ? 1.15 : 1);

        const glowSize = r * (isSelected ? 3 : isHovered ? 2.5 : 2);
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
        glow.addColorStop(0, node.theory.color + 'aa');
        glow.addColorStop(0.5, node.theory.color + '33');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 8 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = node.theory.color + '60';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        const bodyGrad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, 0, node.x, node.y, r);
        bodyGrad.addColorStop(0, node.theory.color + 'ff');
        bodyGrad.addColorStop(1, node.theory.color + '99');

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#ffffff88' : node.theory.color + '80';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        ctx.font = `${r * 0.75}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.theory.icon, node.x, node.y);

        if (isHovered || isSelected || node.theory.featured) {
          ctx.font = `bold ${Math.min(11, r * 0.4)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(node.theory.title, node.x, node.y + r + 4);
          ctx.shadowBlur = 0;
        }
      });

      ctx.restore();

      applyForces();
      frameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObs.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [selectedTheory, hoveredId, initGraph]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const { x, y, scale } = transformRef.current;
    return {
      x: (e.clientX - rect.left - x) / scale,
      y: (e.clientY - rect.top - y) / scale,
    };
  };

  const findNodeAt = (x: number, y: number) => {
    return nodesRef.current.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < n.radius + 5;
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    if (node) {
      draggingRef.current = { nodeId: node.id, panStart: null };
    } else {
      draggingRef.current = { nodeId: null, panStart: { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y } };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    setHoveredId(node?.id ?? null);

    if (draggingRef.current.nodeId) {
      const n = nodesRef.current.find(n => n.id === draggingRef.current.nodeId);
      if (n) { n.x = pos.x; n.y = pos.y; n.vx = 0; n.vy = 0; }
    } else if (draggingRef.current.panStart) {
      transformRef.current.x = e.clientX - draggingRef.current.panStart.x;
      transformRef.current.y = e.clientY - draggingRef.current.panStart.y;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current.nodeId && !draggingRef.current.panStart) return;
    const wasDraggingNode = draggingRef.current.nodeId;
    draggingRef.current = { nodeId: null, panStart: null };

    if (wasDraggingNode) {
      const pos = getCanvasPos(e);
      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        setSelectedTheory(node.theory);
        exploreTheory(node.theory.id);
        if (selectedTheory) discoverConnection(selectedTheory.id, node.theory.id);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    if (node) {
      setSelectedTheory(node.theory);
      exploreTheory(node.theory.id);
      if (selectedTheory && selectedTheory.id !== node.theory.id) {
        discoverConnection(selectedTheory.id, node.theory.id);
      }
    } else if (!draggingRef.current.panStart) {
      setSelectedTheory(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    transformRef.current.scale = Math.max(0.3, Math.min(3, transformRef.current.scale * delta));
  };

  const resetView = () => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
  };

  return (
    <div className="relative w-full h-full flex">
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair"
        style={{ background: 'transparent' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={() => { transformRef.current.scale = Math.min(3, transformRef.current.scale * 1.2); }}
          className="p-2 glass rounded-lg text-slate-400 hover:text-white transition-colors">
          <ZoomIn size={16} />
        </button>
        <button onClick={() => { transformRef.current.scale = Math.max(0.3, transformRef.current.scale * 0.8); }}
          className="p-2 glass rounded-lg text-slate-400 hover:text-white transition-colors">
          <ZoomOut size={16} />
        </button>
        <button onClick={resetView}
          className="p-2 glass rounded-lg text-slate-400 hover:text-white transition-colors">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 glass rounded-xl p-3 text-xs space-y-1.5">
        <div className="text-slate-400 font-medium mb-2 flex items-center gap-1">
          <GitBranch size={11} /> Categories
        </div>
        {[
          { color: '#00bfff', label: 'Ancient Civilizations' },
          { color: '#ffd700', label: 'Egyptian Mysteries' },
          { color: '#ef4444', label: 'Giants / Nephilim' },
          { color: '#f59e0b', label: 'Book of Enoch' },
          { color: '#22c55e', label: 'UFOs / UAPs' },
          { color: '#8b5cf6', label: 'Secret Societies' },
          { color: '#7c3aed', label: 'Simulation Theory' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span className="text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedTheory && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] glass-dark border-l border-purple-900/30 overflow-y-auto"
          >
            <TheoryPanel theory={selectedTheory} onClose={() => setSelectedTheory(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
