'use client';
import { useRef, useState, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { ancientSites } from '@/lib/data/sites';
import { AncientSite } from '@/lib/types';
import { useUserStore } from '@/lib/store/userStore';

/** Maximum pins rendered on the globe at once */
const GLOBE_LIMIT = 500;

/** Validate that a coordinate value is a finite number within [min, max] */
function isValidCoord(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && isFinite(v) && v >= min && v <= max;
}

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

const CONTINENT_LABELS = [
  { name: 'NORTH AMERICA', lat: 48, lon: -100 },
  { name: 'SOUTH AMERICA', lat: -18, lon: -57 },
  { name: 'EUROPE', lat: 54, lon: 13 },
  { name: 'AFRICA', lat: 5, lon: 23 },
  { name: 'ASIA', lat: 52, lon: 88 },
  { name: 'AUSTRALIA', lat: -26, lon: 133 },
  { name: 'ANTARCTICA', lat: -80, lon: 0 },
];

function createEarthTexture(): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // lat/lon → canvas pixel (equirectangular)
  const px = (lat: number, lon: number): [number, number] => [
    (lon + 180) / 360 * W,
    (90 - lat) / 180 * H,
  ];

  const drawPoly = (pts: [number, number][]) => {
    ctx.beginPath();
    const [x0, y0] = px(pts[0][0], pts[0][1]);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = px(pts[i][0], pts[i][1]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };

  // Deep ocean background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#040f1c');
  grad.addColorStop(0.45, '#061a2e');
  grad.addColorStop(0.55, '#061a2e');
  grad.addColorStop(1, '#040f1c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Land masses
  ctx.fillStyle = '#1e4a1a';

  // North America
  drawPoly([[72,-168],[72,-95],[65,-64],[47,-53],[44,-66],[35,-76],
    [25,-81],[20,-87],[9,-79],[10,-84],[22,-106],[30,-112],
    [32,-117],[40,-124],[48,-124],[58,-136],[60,-141],[65,-168]]);

  // Greenland
  drawPoly([[83,-68],[83,-18],[60,-44],[60,-50],[75,-68]]);

  // Iceland
  drawPoly([[66,-24],[66,-13],[63,-13],[63,-24]]);

  // Cuba / Caribbean (tiny)
  drawPoly([[23,-85],[23,-74],[20,-74],[20,-85]]);

  // South America
  drawPoly([[12,-72],[12,-61],[8,-60],[5,-52],[0,-50],
    [-5,-35],[-15,-39],[-22,-41],[-34,-53],[-40,-62],
    [-56,-68],[-55,-67],[-40,-70],[-18,-70],[-5,-81],[0,-78],[8,-77]]);

  // Europe
  drawPoly([[71,28],[70,32],[65,28],[60,25],[57,22],[55,15],[55,8],
    [51,2],[48,-5],[43,-9],[36,-9],[36,5],[37,11],[38,16],
    [40,18],[42,20],[45,14],[47,20],[49,22],[54,18],
    [57,22],[60,25],[65,25],[70,32]]);

  // Great Britain
  drawPoly([[58,-5],[58,2],[51,2],[50,-5],[55,-6]]);

  // Ireland
  drawPoly([[55,-10],[55,-6],[51,-6],[51,-10]]);

  // Scandinavia
  drawPoly([[71,15],[70,30],[63,28],[57,6],[57,8],[60,12],[65,14],[68,20],[71,28]]);

  // Africa
  drawPoly([[37,-6],[37,14],[31,33],[22,38],[15,42],[12,44],[11,43],
    [8,44],[2,42],[-8,40],[-15,37],[-26,33],[-35,22],[-35,18],
    [-26,14],[-18,12],[-5,10],[5,2],[4,-9],[8,-15],[15,-17],[21,-17],[32,-14]]);

  // Madagascar
  drawPoly([[-12,44],[-12,50],[-26,47],[-26,44]]);

  // Main Asia body
  drawPoly([[71,30],[72,60],[73,100],[72,130],[68,140],[62,142],
    [55,135],[42,130],[38,128],[35,127],[22,115],[5,100],[1,104],
    [15,120],[22,120],[25,122],[32,122],[37,122],[45,133],
    [50,142],[55,140],[62,163],[68,172],[72,140],[73,100],[72,60]]);

  // Arabian Peninsula
  drawPoly([[30,32],[30,60],[12,45],[12,44],[15,42],[22,38]]);

  // India
  drawPoly([[22,68],[8,78],[8,80],[22,88]]);

  // Sri Lanka
  drawPoly([[10,80],[6,80],[7,82],[10,80]]);

  // Indochina / SE Asia
  drawPoly([[22,100],[22,108],[14,102],[10,104],[1,104],[5,100]]);

  // Borneo
  drawPoly([[7,108],[7,117],[1,117],[1,108]]);

  // Sumatra
  drawPoly([[5,95],[5,106],[-6,106],[-6,95]]);

  // Java
  drawPoly([[-6,105],[-6,114],[-9,114],[-9,105]]);

  // Philippines (rough)
  drawPoly([[18,120],[18,122],[10,122],[8,124],[10,125],[18,120]]);

  // Japan (Honshu + Kyushu rough)
  drawPoly([[42,141],[45,141],[43,145],[38,141],[33,131],[34,130],[42,141]]);

  // New Guinea
  drawPoly([[-2,132],[-2,150],[-8,148],[-8,132]]);

  // Australia
  drawPoly([[-14,130],[-14,136],[-14,140],[-24,154],
    [-38,147],[-39,144],[-38,140],[-32,134],
    [-26,114],[-22,114],[-16,122],[-14,128]]);

  // New Zealand (South)
  drawPoly([[-40,172],[-47,168],[-46,171],[-40,172]]);
  // New Zealand (North)
  drawPoly([[-36,174],[-41,174],[-38,178],[-34,173]]);

  // Polar ice caps
  ctx.fillStyle = '#b8d8f0';
  // Arctic
  drawPoly([[90,-180],[90,180],[72,180],[70,0],[72,-180]]);
  // Antarctica
  drawPoly([[-68,-180],[-68,180],[-90,180],[-90,-180]]);

  // Antarctica jagged edge blending with land
  ctx.fillStyle = '#d0e8f8';
  drawPoly([[-74,-180],[-74,180],[-90,180],[-90,-180]]);

  // Very subtle ocean depth variation
  ctx.fillStyle = 'rgba(10,40,80,0.2)';
  ctx.fillRect(0, H * 0.45, W, H * 0.1);

  return new THREE.CanvasTexture(canvas);
}

function GlobeGrid() {
  const lines = useMemo(() => {
    const GRID_R = R + 0.012; // slightly above sphere surface
    const result: THREE.Line[] = [];
    const gridMat = new THREE.LineBasicMaterial({ color: '#3060a8', transparent: true, opacity: 0.3 });
    const equatorMat = new THREE.LineBasicMaterial({ color: '#5080d0', transparent: true, opacity: 0.6 });
    const primeMat = new THREE.LineBasicMaterial({ color: '#5080d0', transparent: true, opacity: 0.6 });

    [-60, -45, -30, -15, 0, 15, 30, 45, 60].forEach(lat => {
      const pts: THREE.Vector3[] = [];
      const φ = (lat * Math.PI) / 180;
      for (let i = 0; i <= 128; i++) {
        const λ = ((i / 128) * 2 - 1) * Math.PI;
        pts.push(new THREE.Vector3(GRID_R * Math.cos(φ) * Math.cos(λ), GRID_R * Math.sin(φ), GRID_R * Math.cos(φ) * Math.sin(λ)));
      }
      result.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? equatorMat : gridMat));
    });

    [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].forEach(lon => {
      const pts: THREE.Vector3[] = [];
      const λ = (lon * Math.PI) / 180;
      for (let i = 0; i <= 64; i++) {
        const φ = ((i / 64) - 0.5) * Math.PI;
        pts.push(new THREE.Vector3(GRID_R * Math.cos(φ) * Math.cos(λ), GRID_R * Math.sin(φ), GRID_R * Math.cos(φ) * Math.sin(λ)));
      }
      result.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lon === 0 ? primeMat : gridMat));
    });

    return result;
  }, []);

  return <>{lines.map((line, i) => <primitive key={i} object={line} />)}</>;
}

function ContinentLabels() {
  return (
    <>
      {CONTINENT_LABELS.map(({ name, lat, lon }) => {
        const pos = latLonToXYZ(lat, lon, R + 0.08);
        return (
          <group key={name} position={pos}>
            <Html center distanceFactor={9} style={{ pointerEvents: 'none' }}>
              <div style={{
                fontSize: 7,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                letterSpacing: '0.18em',
                color: 'rgba(160, 200, 255, 0.55)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                textTransform: 'uppercase',
                textShadow: '0 0 8px rgba(80,140,255,0.5)',
              }}>
                {name}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

function SiteMarker({ site, onSelect }: { site: AncientSite; onSelect: (s: AncientSite) => void }) {
  const [hovered, setHovered] = useState(false);
  const dotRef = useRef<THREE.Mesh>(null);
  const pos = latLonToXYZ(site.coordinates[0], site.coordinates[1], R + 0.1);
  const color = new THREE.Color(COLORS[site.type] || '#ffffff');
  const colorHex = COLORS[site.type] || '#ffffff';

  useFrame(({ clock }) => {
    if (!dotRef.current) return;
    const pulse = Math.sin(clock.elapsedTime * 2.5 + site.id.length) * 0.18 + 1;
    dotRef.current.scale.setScalar(hovered ? pulse * 2.8 : pulse);
    (dotRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = hovered ? 4 : 2.5;
  });

  return (
    <group position={pos}>
      <mesh
        ref={dotRef}
        onClick={e => { e.stopPropagation(); onSelect(site); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.11, 14, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} />
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

      <pointLight color={color} intensity={hovered ? 2 : 0.8} distance={1.2} />
    </group>
  );
}

function RotatingGlobe({
  filteredSites, onSelect, focusTarget,
}: {
  filteredSites: AncientSite[];
  onSelect: (s: AncientSite) => void;
  focusTarget: [number, number] | null;
}) {
  const groupRef    = useRef<THREE.Group>(null);
  const earthTexture = useMemo(() => createEarthTexture(), []);
  const targetYRef  = useRef<number | null>(null);
  const focusingRef = useRef(false);

  // When focusTarget changes, compute target Y rotation (shortest path)
  useEffect(() => {
    if (!focusTarget || !groupRef.current) return;
    const [, lon] = focusTarget;
    // Camera is at +Z: to face lon toward camera, targetY = π/2 - lon_rad
    const rawTarget = Math.PI / 2 - (lon * Math.PI) / 180;
    const cur = groupRef.current.rotation.y;
    let diff  = (rawTarget - cur) % (2 * Math.PI);
    if (diff < -Math.PI) diff += 2 * Math.PI;
    if (diff >  Math.PI) diff -= 2 * Math.PI;
    targetYRef.current  = cur + diff;
    focusingRef.current = true;
  }, [focusTarget]);

  useFrame(() => {
    if (!groupRef.current) return;
    if (focusingRef.current && targetYRef.current !== null) {
      const diff = targetYRef.current - groupRef.current.rotation.y;
      if (Math.abs(diff) < 0.008) {
        groupRef.current.rotation.y = targetYRef.current;
        focusingRef.current = false;
      } else {
        groupRef.current.rotation.y += diff * 0.06; // smooth lerp
      }
    } else {
      groupRef.current.rotation.y += 0.0018; // idle auto-rotate
    }
  });

  return (
    <group ref={groupRef}>
      {/* Earth-textured globe */}
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial map={earthTexture} metalness={0.05} roughness={0.88} />
      </mesh>

      {/* Lat/lon grid */}
      <GlobeGrid />

      {/* Continent name labels */}
      <ContinentLabels />

      {/* Outer atmosphere */}
      <mesh>
        <sphereGeometry args={[R * 1.06, 32, 32]} />
        <meshBasicMaterial color="#1e40af" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>

      {/* Inner rim glow */}
      <mesh>
        <sphereGeometry args={[R * 1.02, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      {/* Site markers */}
      {filteredSites.map(site => (
        <SiteMarker key={site.id} site={site} onSelect={onSelect} />
      ))}
    </group>
  );
}

/** Inner canvas component — wrapped in Suspense by the parent for error isolation */
function GlobeCanvas({
  filteredSites,
  onSelect,
  focusTarget,
}: {
  filteredSites: AncientSite[];
  onSelect: (s: AncientSite) => void;
  focusTarget: [number, number] | null;
}) {
  try {
    return (
      <Canvas className="w-full h-full" camera={{ position: [0, 2, 7.5], fov: 48 }}>
        <color attach="background" args={['#00000a']} />

        <ambientLight intensity={0.8} />
        <directionalLight position={[8, 5, 5]} intensity={1.4} color="#7090e0" />
        <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#3040aa" />
        <pointLight position={[0, 8, 0]} intensity={0.5} color="#ffffff" />
        <pointLight position={[0, -8, 0]} intensity={0.2} color="#3060ff" />

        <RotatingGlobe filteredSites={filteredSites} onSelect={onSelect} focusTarget={focusTarget} />

        <OrbitControls
          enablePan={false}
          minDistance={4.5}
          maxDistance={14}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.6}
        />
      </Canvas>
    );
  } catch {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Globe unavailable</div>;
  }
}

export default function AncientGlobe() {
  const [selectedSite, setSelectedSite] = useState<AncientSite | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const { focusedTheoryId, setFocusedTheoryId } = useUserStore();

  // When Timeline (or any view) sets focusedTheoryId, find and highlight the matching site
  useEffect(() => {
    if (!focusedTheoryId) return;
    const match = ancientSites.find(s => s.relatedTheories.includes(focusedTheoryId));
    if (match) setSelectedSite(match);
  }, [focusedTheoryId]);

  const handleSiteSelect = (site: AncientSite) => {
    setSelectedSite(site);
    setFocusedTheoryId(site.relatedTheories[0] ?? null);
  };

  // Focus target: coords of the site matched by focusedTheoryId (or selected site)
  const focusTarget = useMemo<[number, number] | null>(() => {
    if (focusedTheoryId) {
      const match = ancientSites.find(s => s.relatedTheories.includes(focusedTheoryId));
      if (match) return match.coordinates;
    }
    return null;
  }, [focusedTheoryId]);

  const siteTypes = [
    { id: 'all', label: 'All Sites', color: '#ffffff' },
    { id: 'pyramid', label: 'Pyramids', color: '#ffd700' },
    { id: 'megalith', label: 'Megaliths', color: '#a78bfa' },
    { id: 'ufo_hotspot', label: 'UFO Hotspots', color: '#34d399' },
    { id: 'mystery', label: 'Mysteries', color: '#f87171' },
    { id: 'ancient_city', label: 'Ancient Cities', color: '#38bdf8' },
  ];

  const { filteredSites, totalBeforeLimit } = useMemo(() => {
    // 1. Filter by selected type
    const typeFiltered = filter === 'all'
      ? ancientSites
      : ancientSites.filter(s => s.type === filter);

    // 2. Validate coordinates — skip any site with bad lat/lon
    const valid = typeFiltered.filter(s => {
      const [lat, lon] = s.coordinates;
      return isValidCoord(lat, -90, 90) && isValidCoord(lon, -180, 180);
    });

    // 3. Deduplicate markers sharing the exact same lat/lon (within 0.001°).
    //    We mutate a copy of coordinates so the original data is untouched.
    const SNAP = 0.001;
    const seen = new Map<string, number>(); // key → count of sites at that bucket
    const deduped: AncientSite[] = valid.map(s => {
      const lat0 = s.coordinates[0];
      const lon0 = s.coordinates[1];
      const key  = `${Math.round(lat0 / SNAP)},${Math.round(lon0 / SNAP)}`;
      const idx  = seen.get(key) ?? 0;
      seen.set(key, idx + 1);
      if (idx === 0) return s;
      // Offset duplicates slightly so they don't stack invisibly
      return {
        ...s,
        coordinates: [lat0 + idx * 0.002, lon0 + idx * 0.002] as [number, number],
      };
    });

    // 4. Cap at GLOBE_LIMIT
    const totalBeforeLimit = deduped.length;
    const capped = deduped.slice(0, GLOBE_LIMIT);

    return { filteredSites: capped, totalBeforeLimit };
  }, [filter]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-purple-900/20">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-black text-white">Ancient Sites Globe</h2>
          <div className="flex items-center gap-2">
            {totalBeforeLimit > GLOBE_LIMIT && (
              <div className="text-[10px] text-slate-500 bg-slate-800/40 border border-slate-700/40 rounded-full px-2.5 py-1">
                Showing {GLOBE_LIMIT} of {totalBeforeLimit} locations
              </div>
            )}
            {focusedTheoryId && ancientSites.some(s => s.relatedTheories.includes(focusedTheoryId)) && (
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-900/20 border border-cyan-500/30 rounded-full px-2.5 py-1">
                <Clock size={9} />
                Synced with Timeline
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {siteTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setFilter(type.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
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
        <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 text-sm">Globe unavailable</div>}>
          <GlobeCanvas filteredSites={filteredSites} onSelect={handleSiteSelect} focusTarget={focusTarget} />
        </Suspense>

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

        <div className="absolute bottom-4 left-4 glass rounded-xl p-3 hidden sm:block">
          <div className="text-xs text-slate-400 font-medium mb-2">Site Types</div>
          {siteTypes.filter(t => t.id !== 'all').map(type => (
            <div key={type.id} className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: type.color }} />
              {type.label}
            </div>
          ))}
        </div>

        <div className="absolute top-4 left-4 glass rounded-lg px-3 py-2 hidden sm:block">
          <div className="text-xs text-slate-500">Drag · Scroll · Click dots</div>
        </div>
      </div>
    </div>
  );
}
