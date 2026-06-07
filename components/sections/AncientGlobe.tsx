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

    const gridMat = new THREE.LineBasicMaterial({ color: '#1e3a6f', transparent: true, opacity: 0.35 });
    const axisMat = new THREE.LineBasicMaterial({ color: '#2563eb', transparent: true, opacity: 0.85 });

    const lats = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
    lats.forEach(lat => {
      const points: THREE.Vector3[] = [];
      const φ = (lat * Math.PI) / 180;
      for (let i = 0; i <= 128; i++) {
        const λ = ((i / 128) * 2 - 1) * Math.PI;
        points.push(new THREE.Vector3(R * Math.cos(φ) * Math.cos(λ), R * Math.sin(φ), R * Math.cos(φ) * Math.sin(λ)));
      }
      result.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lat === 0 ? axisMat : gridMat));
    });

    const lons = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
    lons.forEach(lon => {
      const points: THREE.Vector3[] = [];
      const λ = (lon * Math.PI) / 180;
      for (let i = 0; i <= 64; i++) {
        const φ = ((i / 64) - 0.5) * Math.PI;
        points.push(new THREE.Vector3(R * Math.cos(φ) * Math.cos(λ), R * Math.sin(φ), R * Math.cos(φ) * Math.sin(λ)));
      }
      result.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lon === 0 ? axisMat : gridMat));
    });

    return result;
  }, []);

  return <>{lines.map((line, i) => <primitive key={i} object={line} />)}</>;
}

function SiteMarker({ site, onSelect }: { site: AncientSite; onSelect: (s: AncientSite) => void }) {
  const [hovered, setHovered] = useState(false);
  const dotRef = useRef<THREE.Mesh>(null);
  const pos = latLonToXYZ(site.coordinates[0], site.coordinates[1], R + 0.06);
  const color = new THREE.Color(COLORS[site.type] || '#ffffff');

  useFrame(({ clock }) => {
    if (!dotRef.current) return;
    const pulse = Math.sin(clock.elapsedTime * 2.5 + site.id.length) * 0.2 + 1;
    dotRef.current.scale.setScalar(hovered ? pulse * 2.5 : pulse);
    (dotRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = hovered ? 3 : 1.5;
  });

  return (
    <group position={pos}>
      <mesh
        ref={dotRef}
        onClick={e => { e.stopPropagation(); onSelect(site); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>

      <Html center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,5,0.8)',
          border: `1px solid ${COLORS[site.type] || '#fff'}70`,
          borderRadius: 3,
          padding: '1px 5px',
          fontSize: 8,
          color: COLORS[site.type] || '#fff',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          letterSpacing: '0.04em',
          marginTop: 16,
          userSelect: 'none',
        }}>
          {site.name}
        </div>
      </Html>

      <pointLight color={color} intensity={hovered ? 1.5 : 0.7} distance={0.9} />
    </group>
  );
}

function RotatingGlobe({ filteredSites, onSelect }: { filteredSites: AncientSite[]; onSelect: (s: AncientSite) => void }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.0015;
  });

  return (
    <group ref={groupRef}>
      {/* Globe base */}
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial color="#071a2e" metalness={0.15} roughness={0.85} />
      </mesh>

      {/* Lat/lon grid */}
      <GlobeGrid />

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[R * 1.08, 32, 32]} />
        <meshBasicMaterial color="#1e40af" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>

      {/* Site markers — rotate with globe */}
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
        <Canvas camera={{ position: [0, 1.5, 7.5], fov: 45 }}>
          <color attach="background" args={['#000008']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[8, 5, 5]} intensity={1.2} color="#5070ff" />
          <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#3030aa" />
          <pointLight position={[0, 6, 0]} intensity={0.4} color="#ffffff" />

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
          <div className="text-xs text-slate-500">Drag to rotate · Scroll to zoom · Click dots to explore</div>
        </div>
      </div>
    </div>
  );
}
