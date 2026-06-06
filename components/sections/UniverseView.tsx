'use client';
import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { theories } from '@/lib/data/theories';
import { Theory } from '@/lib/types';
import { useUserStore } from '@/lib/store/userStore';

function TheoryNode({ theory, position, isSelected, onSelect }: {
  theory: Theory;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: (t: Theory) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

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

  const color = new THREE.Color(theory.color);

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>

      <mesh
        ref={meshRef}
        onClick={() => onSelect(theory)}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <icosahedronGeometry args={[0.4, 1]} />
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

      <pointLight color={color} intensity={isSelected ? 2 : 0.5} distance={3} />
    </group>
  );
}

function ConnectionLine({ start, end, color }: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.1 });
  const lineObj = new THREE.Line(geometry, material);

  return <primitive object={lineObj} />;
}

function Scene({ onSelect }: { onSelect: (t: Theory) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { camera } = useThree();

  useFrame((state) => {
    camera.position.x = Math.sin(state.clock.elapsedTime * 0.05) * 20;
    camera.position.z = Math.cos(state.clock.elapsedTime * 0.05) * 20;
    camera.lookAt(0, 0, 0);
  });

  const positions: Record<string, [number, number, number]> = {};
  theories.forEach((theory, i) => {
    const phi = Math.acos(-1 + (2 * i) / theories.length);
    const theta = Math.sqrt(theories.length * Math.PI) * phi;
    const r = 8;
    positions[theory.id] = [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
  });

  const handleSelect = (theory: Theory) => {
    setSelected(theory.id === selected ? null : theory.id);
    onSelect(theory);
  };

  return (
    <>
      <ambientLight intensity={0.2} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {theories.map(theory =>
        theory.connections.map(connId => {
          const target = theories.find(t => t.id === connId);
          if (!target || !positions[theory.id] || !positions[connId]) return null;
          return (
            <ConnectionLine
              key={`${theory.id}-${connId}`}
              start={positions[theory.id]}
              end={positions[connId]}
              color={theory.color}
            />
          );
        })
      )}

      {theories.map(theory => (
        <TheoryNode
          key={theory.id}
          theory={theory}
          position={positions[theory.id]}
          isSelected={selected === theory.id}
          onSelect={handleSelect}
        />
      ))}

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
  const [selectedTheory, setSelectedTheory] = useState<Theory | null>(null);
  const { exploreTheory } = useUserStore();

  const handleSelect = (theory: Theory) => {
    setSelectedTheory(theory);
    exploreTheory(theory.id);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene onSelect={handleSelect} />
        </Suspense>
      </Canvas>

      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="glass rounded-xl px-4 py-3">
          <h2 className="text-sm font-black text-white tracking-widest">UNIVERSE VIEW</h2>
          <p className="text-xs text-slate-500 mt-0.5">Navigate through the theory constellation</p>
        </div>
        <div className="glass rounded-xl px-4 py-3 text-xs text-slate-400 space-y-1">
          <div>🖥️ Drag to rotate</div>
          <div>🔍 Scroll to zoom</div>
          <div>👆 Click nodes to explore</div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTheory && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 glass rounded-2xl p-4 max-w-md w-full mx-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{selectedTheory.icon}</span>
              <div className="flex-1">
                <div className="text-xs text-purple-400/70 uppercase tracking-widest">{selectedTheory.category}</div>
                <h3 className="text-base font-bold text-white">{selectedTheory.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{selectedTheory.overview}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTheory.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedTheory(null)}
                className="text-slate-500 hover:text-white text-xs"
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
