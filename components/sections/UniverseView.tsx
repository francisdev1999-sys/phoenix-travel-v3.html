'use client';
import { useRef, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { nodes } from '@/lib/graph/nodes';
import { edges } from '@/lib/graph/edges';
import { GraphNode } from '@/lib/graph/types';
import { useUserStore } from '@/lib/store/userStore';
import { usePerformanceStore, getPerfConfig } from '@/lib/store/performanceStore';

// Module-level adjacency map — computed once, never changes
const connectionsMap: Record<string, string[]> = {};
edges.forEach(edge => {
  if (!connectionsMap[edge.from]) connectionsMap[edge.from] = [];
  if (!connectionsMap[edge.to]) connectionsMap[edge.to] = [];
  connectionsMap[edge.from].push(edge.to);
  connectionsMap[edge.to].push(edge.from);
});

function buildPositions(nodeList: GraphNode[]): Record<string, [number, number, number]> {
  const pos: Record<string, [number, number, number]> = {};
  nodeList.forEach((node, i) => {
    const phi = Math.acos(-1 + (2 * i) / nodeList.length);
    const theta = Math.sqrt(nodeList.length * Math.PI) * phi;
    const r = 12;
    pos[node.id] = [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
  });
  return pos;
}

function TheoryNode({ theory, position, isSelected, onSelect }: {
  theory: GraphNode;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: (t: GraphNode) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Memoize Color object — avoids allocation on every render
  const color = useMemo(() => new THREE.Color(theory.color ?? '#7c3aed'), [theory.color]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.01;
    const pulse = Math.sin(state.clock.elapsedTime * 2 + theory.id.length) * 0.1 + 1;
    meshRef.current.scale.setScalar(isSelected ? 1.5 * pulse : hovered ? 1.2 * pulse : pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(isSelected ? 2.5 : hovered ? 2 : 1.5);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        isSelected ? 0.4 : hovered ? 0.3 : 0.15;
    }
  });

  return (
    <group position={position}>
      {/* Reduced from 16×16 to 8×8 — visually identical at this scale */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>

      {/* Reduced icosahedron from subdivision 1 to 0 — saves ~50% geometry vertices */}
      <mesh
        ref={meshRef}
        onClick={() => onSelect(theory)}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.5 : hovered ? 1 : 0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {(hovered || isSelected) && (
        <Billboard>
          <Text
            position={[0, 0.7, 0]}
            fontSize={0.18}
            color={theory.color}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {theory.title}
          </Text>
        </Billboard>
      )}

    </group>
  );
}

type SelectHandler = (t: GraphNode) => void;

// Single LineSegments draw call for all edges — replaces N individual Line objects
function EdgeLines({ nodeList, positions }: {
  nodeList: GraphNode[];
  positions: Record<string, [number, number, number]>;
}) {
  const lineSegments = useMemo(() => {
    const pts: number[] = [];
    const seen = new Set<string>();
    nodeList.forEach(node => {
      (connectionsMap[node.id] ?? []).forEach(connId => {
        const key = [node.id, connId].sort().join('|');
        if (seen.has(key) || !positions[node.id] || !positions[connId]) return;
        seen.add(key);
        pts.push(...positions[node.id], ...positions[connId]);
      });
    });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pts), 3));
    const mat = new THREE.LineBasicMaterial({ color: '#7c3aed', transparent: true, opacity: 0.1 });
    return new THREE.LineSegments(geom, mat);
  }, [nodeList, positions]);

  return <primitive object={lineSegments} />;
}

function Scene({ visibleNodes, onSelect }: { visibleNodes: GraphNode[]; onSelect: SelectHandler }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Positions computed once per node list — stable reference for EdgeLines memo
  const positions = useMemo(() => buildPositions(visibleNodes), [visibleNodes]);

  const handleSelect = (node: GraphNode) => {
    setSelected(node.id === selected ? null : node.id);
    onSelect(node);
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} color="#8060ff" />
      <directionalLight position={[-8, -5, -8]} intensity={0.3} color="#4040aa" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <EdgeLines nodeList={visibleNodes} positions={positions} />

      {visibleNodes.map(node => (
        <TheoryNode
          key={node.id}
          theory={node}
          position={positions[node.id]}
          isSelected={selected === node.id}
          onSelect={handleSelect}
        />
      ))}

      {/* autoRotate handles camera movement — no useFrame camera orbit needed */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={30}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export default function UniverseView() {
  const [selectedTheory, setSelectedTheory] = useState<GraphNode | null>(null);
  const { exploreTheory, setCurrentView } = useUserStore();
  const { mode } = usePerformanceStore();
  const config = useMemo(() => getPerfConfig(mode), [mode]);

  // Apply performance mode node cap
  const visibleNodes = useMemo(
    () => nodes.length <= config.maxNodes ? nodes : nodes.slice(0, config.maxNodes),
    [config.maxNodes]
  );

  const handleSelect = (node: GraphNode) => {
    setSelectedTheory(node);
    exploreTheory(node.id);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene visibleNodes={visibleNodes} onSelect={handleSelect} />
        </Suspense>
      </Canvas>

      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="glass rounded-xl px-4 py-3">
          <h2 className="text-sm font-black text-white tracking-widest">UNIVERSE VIEW</h2>
          <p className="text-xs text-slate-500 mt-0.5">{visibleNodes.length} nodes · Navigate the knowledge constellation</p>
        </div>
        <div className="glass rounded-xl px-4 py-3 text-xs text-slate-400 space-y-1">
          <div>Drag to rotate</div>
          <div>Scroll to zoom</div>
          <div>Click nodes to explore</div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTheory && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 glass rounded-2xl p-4 max-w-lg w-[calc(100%-2rem)]"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">{selectedTheory.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-purple-400/70 uppercase tracking-widest">{selectedTheory.category}</div>
                <h3 className="text-base font-bold text-white">{selectedTheory.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{selectedTheory.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTheory.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => { exploreTheory(selectedTheory.id); setCurrentView('graph'); }}
                  className="mt-3 w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-colors"
                >
                  Open Full Theory →
                </button>
              </div>
              <button
                onClick={() => setSelectedTheory(null)}
                className="text-slate-500 hover:text-white text-sm flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
