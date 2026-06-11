'use client';
import { useRef, useState, Suspense, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useUserStore } from '@/lib/store/userStore';
import type { GalaxyWithCounts } from '@/app/api/galaxies/route';

// ── Sphere packing — 8 points evenly spaced on a sphere ──────────────────────

function galaxyPositions(count: number, radius = 10): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const phi   = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    return [
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    ] as [number, number, number];
  });
}

// ── Single galaxy orb ─────────────────────────────────────────────────────────

function GalaxyOrb({
  galaxy, position, onSelect,
}: {
  galaxy: GalaxyWithCounts;
  position: [number, number, number];
  onSelect: (g: GalaxyWithCounts) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => new THREE.Color(galaxy.color ?? '#7c3aed'), [galaxy.color]);

  // Orb radius: base 0.7, scale up slightly for larger galaxies (max ~1.1)
  const baseR = 0.7 + Math.min(galaxy.nodeCount / 400, 0.4);

  useFrame(state => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.004;
    const pulse = Math.sin(state.clock.elapsedTime * 1.5 + galaxy.id.length) * 0.06 + 1;
    meshRef.current.scale.setScalar(hovered ? 1.25 * pulse : pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(hovered ? 2.2 : 1.7);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.35 : 0.15;
    }
  });

  return (
    <group position={position}>
      {/* Glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[baseR * 1.4, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>

      {/* Main orb */}
      <mesh
        ref={meshRef}
        onClick={() => onSelect(galaxy)}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <icosahedronGeometry args={[baseR, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 1.2 : 0.45}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Label — always visible */}
      <Billboard>
        <Text
          position={[0, baseR + 0.55, 0]}
          fontSize={hovered ? 0.28 : 0.22}
          color={galaxy.color ?? '#c084fc'}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.025}
          outlineColor="#000000"
        >
          {galaxy.name}
        </Text>
        {hovered && (
          <Text
            position={[0, baseR + 0.22, 0]}
            fontSize={0.15}
            color="#94a3b8"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {`${galaxy.nodeCount} nodes · ${galaxy.clusterCount} clusters`}
          </Text>
        )}
      </Billboard>
    </group>
  );
}

// ── Ambient orbital ring around each orb ──────────────────────────────────────

function OrbitalRing({ position, color }: { position: [number, number, number]; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const c = useMemo(() => new THREE.Color(color), [color]);

  useFrame(state => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.3;
    ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.4;
  });

  return (
    <mesh ref={ringRef} position={position}>
      <torusGeometry args={[1.5, 0.015, 4, 40]} />
      <meshBasicMaterial color={c} transparent opacity={0.15} />
    </mesh>
  );
}

// ── 3D Scene ──────────────────────────────────────────────────────────────────

function CosmosScene({
  galaxies, onSelect,
}: {
  galaxies: GalaxyWithCounts[];
  onSelect: (g: GalaxyWithCounts) => void;
}) {
  const positions = useMemo(() => galaxyPositions(galaxies.length), [galaxies.length]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[15, 10, 8]}  intensity={0.7} color="#8060ff" />
      <directionalLight position={[-10, -8, -10]} intensity={0.25} color="#4040aa" />
      <pointLight position={[0, 0, 0]} intensity={0.15} color="#ffffff" />

      <Stars radius={120} depth={60} count={6000} factor={4} saturation={0} fade speed={0.6} />

      {galaxies.map((g, i) => (
        <group key={g.id}>
          <GalaxyOrb galaxy={g} position={positions[i]} onSelect={onSelect} />
          <OrbitalRing position={positions[i]} color={g.color ?? '#7c3aed'} />
        </group>
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        minDistance={6}
        maxDistance={28}
        autoRotate
        autoRotateSpeed={0.25}
      />
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  galaxies: GalaxyWithCounts[];
  onClose?: () => void;
}

export default function UniverseView({ galaxies, onClose }: Props) {
  const { navigateToGalaxy } = useUserStore();
  const [selected, setSelected] = useState<GalaxyWithCounts | null>(null);

  const handleSelect = (g: GalaxyWithCounts) => {
    setSelected(prev => prev?.id === g.id ? null : g);
  };

  const handleEnter = () => {
    if (!selected) return;
    navigateToGalaxy(selected.slug, selected.name);
    onClose?.();
  };

  return (
    <div className="relative w-full h-full bg-[#000005]">
      <Canvas
        camera={{ position: [0, 0, 22], fov: 55 }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <CosmosScene galaxies={galaxies} onSelect={handleSelect} />
        </Suspense>
      </Canvas>

      {/* HUD: top controls */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
        <div className="glass rounded-xl px-4 py-2.5 pointer-events-none">
          <p className="text-xs font-bold tracking-widest text-purple-300 uppercase">Cosmos View</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Click a galaxy to select · Enter to explore</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="glass rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors pointer-events-auto"
          >
            ✕ Grid view
          </button>
        )}
      </div>

      {/* Controls hint bottom-left */}
      <div className="absolute bottom-16 left-4 glass rounded-xl px-3 py-2 text-[10px] text-slate-500 space-y-0.5 pointer-events-none">
        <div>Drag to rotate</div>
        <div>Scroll to zoom</div>
        <div>Click to select</div>
      </div>

      {/* Selected galaxy info panel */}
      {selected && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-full max-w-sm px-4">
          <div
            className="glass rounded-2xl p-4 border"
            style={{ borderColor: (selected.color ?? '#7c3aed') + '40' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-0.5"
                  style={{ color: selected.color ?? '#c084fc' }}
                >
                  Galaxy
                </p>
                <h3 className="text-lg font-black text-white leading-tight">{selected.name}</h3>
                {selected.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{selected.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                  <span><span className="font-bold text-white">{selected.nodeCount}</span> nodes</span>
                  <span><span className="font-bold text-slate-300">{selected.clusterCount}</span> clusters</span>
                  <span><span className="font-bold text-slate-300">{selected.sourceCount}</span> sources</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-600 hover:text-slate-400 flex-shrink-0"
              >
                ✕
              </button>
            </div>
            <button
              onClick={handleEnter}
              className="mt-3 w-full py-2 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: selected.color ?? '#7c3aed' }}
            >
              Enter Galaxy →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
