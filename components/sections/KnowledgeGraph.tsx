'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';
import { nodes as staticNodes, edges as staticEdges, GraphNode, GraphEdge, CATEGORY_COLORS, EVIDENCE_COLORS } from '@/lib/graph';
import { useUserStore } from '@/lib/store/userStore';
import NodePanel from '@/components/sections/NodePanel';

interface VisualNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  node: GraphNode;
  radius: number;
  pulsePhase: number;
}

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<VisualNode[]>([]);
  const frameRef = useRef<number>(0);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const draggingRef = useRef<{ nodeId: string | null; panStart: { x: number; y: number } | null }>({ nodeId: null, panStart: null });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchDistRef = useRef<number>(0);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const { exploreTheory, discoverConnection } = useUserStore();

  // Live graph data: static base + approved DB proposals
  const graphNodesRef = useRef<GraphNode[]>(staticNodes);
  const graphEdgesRef = useRef<GraphEdge[]>(staticEdges);

  // Keep refs in sync so draw() reads current values without reinitializing canvas
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);
  useEffect(() => { hoveredIdRef.current = hoveredId; }, [hoveredId]);

  // Merge approved DB proposals on mount (non-blocking)
  useEffect(() => {
    fetch('/api/graph')
      .then(r => r.ok ? r.json() : null)
      .then((data: { nodes: GraphNode[]; edges: GraphEdge[] } | null) => {
        if (!data || (data.nodes.length === 0 && data.edges.length === 0)) return;
        const existingIds = new Set(staticNodes.map(n => n.id));
        const existingEdgeIds = new Set(staticEdges.map(e => e.id));
        const newNodes = data.nodes.filter(n => !existingIds.has(n.id));
        const newEdges = data.edges.filter(e => !existingEdgeIds.has(e.id));
        if (newNodes.length === 0 && newEdges.length === 0) return;
        graphNodesRef.current = [...staticNodes, ...newNodes];
        graphEdgesRef.current = [...staticEdges, ...newEdges];
        const canvas = canvasRef.current;
        if (canvas) initGraph(canvas.width, canvas.height);
      })
      .catch(() => {/* silently ignore — graph still works from static data */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initGraph = useCallback((w: number, h: number) => {
    const nodes = graphNodesRef.current;
    const edges = graphEdgesRef.current;
    const cx = w / 2;
    const cy = h / 2;
    const categories = [...new Set(nodes.map(n => n.category))];

    nodesRef.current = nodes.map(gNode => {
      const catIdx = categories.indexOf(gNode.category);
      const catCount = categories.length;
      const catAngle = (catIdx / catCount) * Math.PI * 2;
      const catRadius = Math.min(w, h) * 0.3;
      const catNodes = nodes.filter(n => n.category === gNode.category);
      const tIdx = catNodes.indexOf(gNode);
      const spreadAngle = ((tIdx + 0.5) / catNodes.length) * Math.PI * 0.4 - Math.PI * 0.2;
      const angle = catAngle + spreadAngle;
      const radiusVariation = catRadius * (0.7 + Math.random() * 0.5);

      const isHighDegree = edges.filter(e => e.from === gNode.id || e.to === gNode.id).length >= 5;

      return {
        id: gNode.id,
        x: cx + Math.cos(angle) * radiusVariation,
        y: cy + Math.sin(angle) * radiusVariation,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        node: gNode,
        radius: isHighDegree ? 26 : 18,
        pulsePhase: Math.random() * Math.PI * 2,
      };
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
    const getVNode = (id: string) => nodesRef.current.find(n => n.id === id);

    const applyForces = () => {
      const vNodes = nodesRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      vNodes.forEach(vn => {
        vn.vx += (cx - vn.x) * 0.0002;
        vn.vy += (cy - vn.y) * 0.0002;

        vNodes.forEach(other => {
          if (other.id === vn.id) return;
          const dx = vn.x - other.x;
          const dy = vn.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = (vn.radius + other.radius) * 3;
          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 0.3;
            vn.vx += dx * force * 0.05;
            vn.vy += dy * force * 0.05;
          }
        });

        graphEdgesRef.current.forEach(edge => {
          if (edge.from === vn.id || edge.to === vn.id) {
            const otherId = edge.from === vn.id ? edge.to : edge.from;
            const other = getVNode(otherId);
            if (!other) return;
            const dx = other.x - vn.x;
            const dy = other.y - vn.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const target = 180 + (1 - edge.strength_score) * 80;
            if (dist > target) {
              vn.vx += dx * 0.0003 * edge.strength_score;
              vn.vy += dy * 0.0003 * edge.strength_score;
            }
          }
        });

        if (draggingRef.current.nodeId !== vn.id) {
          vn.vx *= 0.95;
          vn.vy *= 0.95;
          vn.x += vn.vx;
          vn.y += vn.vy;
        }
      });
    };

    const draw = () => {
      time += 0.02;
      const selectedN = selectedNodeRef.current;
      const hId = hoveredIdRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: tx, y: ty, scale } = transformRef.current;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      // Draw edges
      graphEdgesRef.current.forEach(edge => {
        const src = getVNode(edge.from);
        const tgt = getVNode(edge.to);
        if (!src || !tgt) return;

        const srcSelected = src.id === selectedN?.id;
        const tgtSelected = tgt.id === selectedN?.id;
        const isHighlighted = srcSelected || tgtSelected;
        const isHovered = src.id === hId || tgt.id === hId;

        const alpha = isHighlighted ? 0.7 : isHovered ? 0.45 : 0.1;
        const srcColor = src.node.color ?? CATEGORY_COLORS[src.node.category] ?? '#7c3aed';
        const tgtColor = tgt.node.color ?? CATEGORY_COLORS[tgt.node.category] ?? '#7c3aed';

        const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y);
        grad.addColorStop(0, srcColor + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(1, tgtColor + Math.floor(alpha * 255).toString(16).padStart(2, '0'));

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = isHighlighted ? 2 : isHovered ? 1.5 : 1;
        ctx.stroke();

        // Animated particle on highlighted edge
        if (isHighlighted || isHovered) {
          const t = (time * 0.3 * edge.strength_score) % 1;
          const px = src.x + (tgt.x - src.x) * t;
          const py = src.y + (tgt.y - src.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = EVIDENCE_COLORS[src.node.evidence_level] ?? '#7c3aed';
          ctx.fill();
        }
      });

      // Draw nodes
      nodesRef.current.forEach(vn => {
        const isSelected = vn.id === selectedN?.id;
        const isHovered = vn.id === hId;
        const pulse = Math.sin(time * 2 + vn.pulsePhase) * 0.3 + 0.7;
        const r = vn.radius * (isSelected ? 1.35 : isHovered ? 1.18 : 1);
        const nodeColor = vn.node.color ?? CATEGORY_COLORS[vn.node.category] ?? '#7c3aed';
        const evidenceColor = EVIDENCE_COLORS[vn.node.evidence_level] ?? '#7c3aed';

        // Glow
        const glowSize = r * (isSelected ? 3.2 : isHovered ? 2.6 : 2);
        const glow = ctx.createRadialGradient(vn.x, vn.y, 0, vn.x, vn.y, glowSize);
        glow.addColorStop(0, nodeColor + 'aa');
        glow.addColorStop(0.5, nodeColor + '33');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(vn.x, vn.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(vn.x, vn.y, r + 8 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = evidenceColor + '60';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Node body
        const bodyGrad = ctx.createRadialGradient(vn.x - r * 0.3, vn.y - r * 0.3, 0, vn.x, vn.y, r);
        bodyGrad.addColorStop(0, nodeColor + 'ff');
        bodyGrad.addColorStop(1, nodeColor + '99');
        ctx.beginPath();
        ctx.arc(vn.x, vn.y, r, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Border (evidence level color)
        ctx.beginPath();
        ctx.arc(vn.x, vn.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? evidenceColor + 'cc' : nodeColor + '70';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Icon
        ctx.font = `${r * 0.75}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vn.node.icon ?? '◈', vn.x, vn.y);

        // Label
        if (isHovered || isSelected || graphEdgesRef.current.filter(e => e.from === vn.id || e.to === vn.id).length >= 5) {
          ctx.font = `bold ${Math.min(11, r * 0.45)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(vn.node.title, vn.x, vn.y + r + 4);
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
  }, [initGraph]);

  const getCanvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const { x, y, scale } = transformRef.current;
    return { x: (clientX - rect.left - x) / scale, y: (clientY - rect.top - y) / scale };
  };

  const findNodeAt = (x: number, y: number) =>
    nodesRef.current.find(n => Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) < n.radius + 5);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    const vn = findNodeAt(pos.x, pos.y);
    if (vn) {
      draggingRef.current = { nodeId: vn.id, panStart: null };
    } else {
      draggingRef.current = { nodeId: null, panStart: { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y } };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    const vn = findNodeAt(pos.x, pos.y);
    setHoveredId(vn?.id ?? null);

    if (draggingRef.current.nodeId) {
      const n = nodesRef.current.find(n => n.id === draggingRef.current.nodeId);
      if (n) { n.x = pos.x; n.y = pos.y; n.vx = 0; n.vy = 0; }
    } else if (draggingRef.current.panStart) {
      transformRef.current.x = e.clientX - draggingRef.current.panStart.x;
      transformRef.current.y = e.clientY - draggingRef.current.panStart.y;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDraggingNode = draggingRef.current.nodeId;
    draggingRef.current = { nodeId: null, panStart: null };
    if (wasDraggingNode) {
      const pos = getCanvasPos(e.clientX, e.clientY);
      const vn = findNodeAt(pos.x, pos.y);
      if (vn) {
        setSelectedNode(vn.node);
        exploreTheory(vn.node.id);
        if (selectedNode) discoverConnection(selectedNode.id, vn.node.id);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    const vn = findNodeAt(pos.x, pos.y);
    if (vn) {
      setSelectedNode(vn.node);
      exploreTheory(vn.node.id);
      if (selectedNode && selectedNode.id !== vn.node.id) {
        discoverConnection(selectedNode.id, vn.node.id);
      }
    } else if (!draggingRef.current.panStart) {
      setSelectedNode(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    transformRef.current.scale = Math.max(0.3, Math.min(3, transformRef.current.scale * delta));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const pos = getCanvasPos(t.clientX, t.clientY);
      const vn = findNodeAt(pos.x, pos.y);
      draggingRef.current = vn
        ? { nodeId: vn.id, panStart: null }
        : { nodeId: null, panStart: { x: t.clientX - transformRef.current.x, y: t.clientY - transformRef.current.y } };
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      draggingRef.current = { nodeId: null, panStart: null };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const pos = getCanvasPos(t.clientX, t.clientY);
      if (draggingRef.current.nodeId) {
        const n = nodesRef.current.find(n => n.id === draggingRef.current.nodeId);
        if (n) { n.x = pos.x; n.y = pos.y; n.vx = 0; n.vy = 0; }
      } else if (draggingRef.current.panStart) {
        transformRef.current.x = t.clientX - draggingRef.current.panStart.x;
        transformRef.current.y = t.clientY - draggingRef.current.panStart.y;
      }
    } else if (e.touches.length === 2 && pinchDistRef.current > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      transformRef.current.scale = Math.max(0.3, Math.min(3, transformRef.current.scale * (newDist / pinchDistRef.current)));
      pinchDistRef.current = newDist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (touchStartRef.current && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        const pos = getCanvasPos(t.clientX, t.clientY);
        const vn = findNodeAt(pos.x, pos.y);
        if (vn) {
          setSelectedNode(vn.node);
          exploreTheory(vn.node.id);
          if (selectedNode && selectedNode.id !== vn.node.id) {
            discoverConnection(selectedNode.id, vn.node.id);
          }
        } else {
          setSelectedNode(null);
        }
      }
    }
    draggingRef.current = { nodeId: null, panStart: null };
    touchStartRef.current = null;
    pinchDistRef.current = 0;
  };

  const resetView = () => { transformRef.current = { x: 0, y: 0, scale: 1 }; };

  return (
    <div className="relative w-full h-full flex">
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair"
        style={{ background: 'transparent', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Zoom controls */}
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

      {/* Category legend */}
      <div className="absolute bottom-4 left-4 glass rounded-xl p-3 text-xs space-y-1.5 hidden sm:block">
        <div className="text-slate-400 font-medium mb-2 flex items-center gap-1">
          <Layers size={11} /> Categories
        </div>
        {Object.entries(CATEGORY_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Node panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-full sm:w-[500px] glass-dark border-l border-purple-900/30 overflow-hidden flex flex-col"
          >
            <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
