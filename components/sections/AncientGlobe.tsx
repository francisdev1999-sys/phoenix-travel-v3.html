'use client';
import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { ancientSites } from '@/lib/data/sites';
import { AncientSite } from '@/lib/types';

const R = 3;

function latLonToXYZ(lat: number, lon: number, r = R): [number, number, number] {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  return [r * Math.cos(φ) * Math.cos(λ), r * Math.sin(φ), r * Math.cos(φ) * Math.sin(λ)];
}

const COLORS: Record<string, string> = {
  pyramid: '#ffd700',
  megalith: '#a78bfa',
  ufo_hotspot: '#34d399',
  mystery: '#f87171',
  ancient_city: '#38bdf8',
};

function GlobeGrid() {
  const lines = useMemo(() => {
    const result: THREE.Line[] = [];
    const gridMat = new THREE.LineBasicMaterial({ color: '#2a5298', transparent: true, opacity: 0.55 });
    const equatorMat = new THREE.LineBasicMaterial({ color: '#4a8fff', transparent: true, opacity: 0.9 });
    const primeMat = new THREE.LineBasicMaterial({ color: '#4a8fff', transparent: true, opacity: 0.9 });

    // Latitude lines
    [-60, -45, -30, -15, 0, 15, 30, 45, 60].forEach(lat => {
      const pts: THREE.Vector3[] = [];
      const φ = (lat * Math.PI) / 180;
      for (let i = 0; i <= 128; i++) {
        const λ = ((i / 128) * 2 - 1) * Math.PI;
        pts.push(new THREE.Vector3(R * Math.cos(φ) * Math.cos(λ), R * Math.sin(φ), R * Math.cos(φ) * Math.sin(λ)));
      }
      result.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? equatorMat : gridMat));
    });

    // Longitude lines
    [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].forEach(lon => {
      const pts: THREE.Vector3[] = [];
      const λ = (lon * Math.PI) / 180;
      for (let i = 0; i <= 64; i++) {
        const φ = ((i / 64) - 0.5) * Math.PI;
        pts.push(new THREE.Vector3(R * Math.cos(φ) * Math.cos(λ), R * Math.sin(φ), R * Math.cos(φ) * Math.sin(λ)));
      }
      result.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lon === 0 ? primeMat : gridMat));
    });

    return result;
  }, []);

  return <>{lines.map((line, i) => <primitive key={i} object={line} />)}</>;
}

function SiteMarker({ site, onSelect }: { site: AncientSite; onSelect: (s: AncientSite) => void }) {
  const [hovered, setHovered] = useState(false);
  const dotRef = useRef<THREE.Mesh>(null);
  const pos = latLonToXYZ(site.coordinates[0], site.coordinates[1], R + 0.08);
  const color = new THREE.Color(COLORS[site.type] || '#ffffff');
  const colorHex = COLORS[site.type] || '#ffffff';

  useFrame(({ clock }) => {
    if (!dotRef.current) return;
    const pulse = Math.sin(clock.elapsedTime * 2.5 + site.id.length) * 0.18 + 1;
    dotRef.current.scale.setScalar(hovered ? pulse * 2.8 : pulse);
    (dotRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = hovered ? 4 : 2;
  });

  return (
    <group position={pos}>
      <mesh
        ref={dotRef}
        onClick={e => { e.stopPropagation(); onSelect(site); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.12, 14, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>

      <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,8,0.85)',
          border: `1px solid ${colorHex}80`,
          borderRadius: 3,
          padding: '2px 6px',
          fontSize: 9,
          color: colorHex,
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          marginTop: 18,
          userSelect: 'none',
          textShadow: `0 0 6px ${colorHex}`,
        }}>
          {site.name}
        </div>
      </Html>

      <pointLight color={color} intensity={hovered ? 2 : 1} distance={1.2} />
    </group>
  );
}

function RotatingGlobe({ filteredSites, onSelect }: { filteredSites: AncientSite[]; onSelect: (s: AncientSite) => void }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.0018;
  });

  return (
    <group ref={groupRef}>
      {/* Solid globe */}
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial color="#081830" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Lat/lon grid — rotates with globe */}
      <GlobeGrid />

      {/* Outer atmosphere */}
      <mesh>
        <sphereGeometry args={[R * 1.06, 32, 32]} />
        <meshBasicMaterial color="#1e40af" transparent opacity={0.10} side={THREE.BackSide} />
      </mesh>

      {/* Inner rim glow */}
      <mesh>
        <sphereGeometry args={[R * 1.02, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>

      {/* Markers — rotate with globe so they stay on correct lat/lon */}
      {filteredSites.map(site => (
        <SiteMarker key={site.id} site={site} onSelect={onSelect} />
      ))}
    </group>
  );
}

export default function AncientGlobe() {
  const [selectedSite, setSelectedSite] = useState<AncientSite | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const siteTypes = [
    { id: 'all', label: 'All Sites', color: '#ffffff' },
    { id: 'pyramid', label: 'Pyramids', color: '#ffd700' },
    { id: 'megalith', label: 'Megaliths', color: '#a78bfa' },
    { id: 'ufo_hotspot', label: 'UFO Hotspots', color: '#34d399' },
    { id: 'mystery', label: 'Mysteries', color: '#f87171' },
    { id: 'ancient_city', label: 'Ancient Cities', color: '#38bdf8' },
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

      <div className="flex-1 relative min-h-0">
        <Canvas camera={{ position: [0, 2, 7.5], fov: 48 }}>
          <color attach="background" args={['#00000a']} />

          <ambientLight intensity={0.7} />
          <directionalLight position={[8, 5, 5]} intensity={1.5} color="#6080ff" />
          <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#3030aa" />
          <pointLight position={[0, 8, 0]} intensity={0.6} color="#ffffff" />
          <pointLight position={[0, -8, 0]} intensity={0.2} color="#3060ff" />

          <RotatingGlobe filteredSites={filteredSites} onSelect={setSelectedSite} />

          <OrbitControls
            enablePan={false}
            minDistance={4.5}
            maxDistance={14}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.6}
          />
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
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: COLORS[selectedSite.type] || '#a78bfa' }}>
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

        <div className="absolute top-4 left-4 glass rounded-lg px-3 py-2">
          <div className="text-xs text-slate-500">Drag · Scroll · Click dots</div>
        </div>
      </div>
    </div>
  );
}
