'use client';
import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { ancientSites } from '@/lib/data/sites';
import { AncientSite } from '@/lib/types';

function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[3, 64, 64]} />
      <meshStandardMaterial
        color="#0a0a2e"
        metalness={0.3}
        roughness={0.7}
        wireframe={false}
      />
    </mesh>
  );
}

function GlobeWireframe() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[3.01, 24, 24]} />
      <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.08} />
    </mesh>
  );
}

function SiteMarker({ site, onSelect }: { site: AncientSite; onSelect: (s: AncientSite) => void }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const lat = (site.coordinates[0] * Math.PI) / 180;
  const lon = (site.coordinates[1] * Math.PI) / 180;
  const r = 3.08;
  const x = r * Math.cos(lat) * Math.cos(lon);
  const y = r * Math.sin(lat);
  const z = r * Math.cos(lat) * Math.sin(lon);

  const colors: Record<string, string> = {
    pyramid: '#ffd700',
    megalith: '#7c3aed',
    ufo_hotspot: '#22c55e',
    mystery: '#ef4444',
    ancient_city: '#06b6d4',
  };

  const color = new THREE.Color(colors[site.type] || '#ffffff');

  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = Math.sin(state.clock.elapsedTime * 3 + site.id.length) * 0.15 + 1;
    meshRef.current.scale.setScalar(hovered ? pulse * 2 : pulse);
    (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = hovered ? 2 : 0.8;
  });

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={meshRef}
        onClick={() => onSelect(site)}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>

      {hovered && (
        <Html distanceFactor={10} center>
          <div className="glass rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap pointer-events-none">
            {site.name}
          </div>
        </Html>
      )}

      <pointLight color={color} intensity={0.5} distance={0.5} />
    </group>
  );
}

function AtmosphereGlow() {
  return (
    <mesh>
      <sphereGeometry args={[3.2, 32, 32]} />
      <meshBasicMaterial color="#1e40af" transparent opacity={0.06} side={THREE.BackSide} />
    </mesh>
  );
}

export default function AncientGlobe() {
  const [selectedSite, setSelectedSite] = useState<AncientSite | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const siteTypes = [
    { id: 'all', label: 'All Sites', color: '#ffffff' },
    { id: 'pyramid', label: 'Pyramids', color: '#ffd700' },
    { id: 'megalith', label: 'Megaliths', color: '#7c3aed' },
    { id: 'ufo_hotspot', label: 'UFO Hotspots', color: '#22c55e' },
    { id: 'mystery', label: 'Mysteries', color: '#ef4444' },
    { id: 'ancient_city', label: 'Ancient Cities', color: '#06b6d4' },
  ];

  const filteredSites = filter === 'all' ? ancientSites : ancientSites.filter(s => s.type === filter);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-purple-900/20">
        <h2 className="text-lg font-black text-white mb-3">Ancient Sites Globe</h2>
        <div className="flex flex-wrap gap-2">
          {siteTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setFilter(type.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
              style={{
                borderColor: filter === type.id ? type.color + '60' : 'rgba(255,255,255,0.1)',
                background: filter === type.id ? type.color + '20' : 'transparent',
                color: filter === type.id ? type.color : '#64748b',
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} color="#4060ff" />
          <directionalLight position={[-5, -5, -5]} intensity={0.2} color="#8040ff" />

          <Suspense fallback={null}>
            <GlobeMesh />
            <GlobeWireframe />
            <AtmosphereGlow />
            {filteredSites.map(site => (
              <SiteMarker key={site.id} site={site} onSelect={setSelectedSite} />
            ))}
          </Suspense>

          <OrbitControls enablePan={false} minDistance={4} maxDistance={12} autoRotate autoRotateSpeed={0.5} />
        </Canvas>

        <AnimatePresence>
          {selectedSite && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="absolute right-4 top-4 glass rounded-xl p-4 max-w-xs"
            >
              <button
                onClick={() => setSelectedSite(null)}
                className="absolute top-2 right-2 text-slate-500 hover:text-white text-xs"
              >✕</button>

              <div className="text-xs text-purple-400/70 uppercase tracking-widest mb-1">
                {selectedSite.type.replace('_', ' ')}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{selectedSite.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{selectedSite.description}</p>

              <div className="text-xs text-slate-500 mb-2">Related Theories:</div>
              <div className="flex flex-wrap gap-1">
                {selectedSite.relatedTheories.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">
                    {t.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>

              <div className="mt-3 text-xs text-slate-600">
                📍 {selectedSite.coordinates[0].toFixed(2)}°, {selectedSite.coordinates[1].toFixed(2)}°
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-4 left-4 glass rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium mb-2">Site Types</div>
          {siteTypes.filter(t => t.id !== 'all').map(type => (
            <div key={type.id} className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: type.color }} />
              {type.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
