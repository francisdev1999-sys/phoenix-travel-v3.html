'use client';
import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, SlidersHorizontal, BookOpen, X } from 'lucide-react';
import { nodes } from '@/lib/graph/index';
import { GraphNode, EvidenceLevel } from '@/lib/graph/types';
import {
  getCredibilityDisplay,
  nodePassesFilter,
  getAppearanceReason,
  isValidCoordinate,
  EVIDENCE_CFG,
  CredibilityOptions,
  DEFAULT_PUBLIC_OPTIONS,
} from '@/lib/credibility-display';

// ── Constants ───────────────────────────────────────────────────────────────

const R = 3;

const EVIDENCE_LEVELS_ORDERED: EvidenceLevel[] = [
  'verified', 'strong_evidence', 'debated', 'speculative', 'mythological',
];

// ── Globe geometry helpers ──────────────────────────────────────────────────

function latLonToXYZ(lat: number, lon: number, r = R): [number, number, number] {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  return [r * Math.cos(φ) * Math.cos(λ), r * Math.sin(φ), r * Math.cos(φ) * Math.sin(λ)];
}

// ── Earth texture (unchanged from original) ─────────────────────────────────

function createEarthTexture(): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

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

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#040f1c');
  grad.addColorStop(0.45, '#061a2e');
  grad.addColorStop(0.55, '#061a2e');
  grad.addColorStop(1, '#040f1c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1e4a1a';
  drawPoly([[72,-168],[72,-95],[65,-64],[47,-53],[44,-66],[35,-76],[25,-81],[20,-87],[9,-79],[10,-84],[22,-106],[30,-112],[32,-117],[40,-124],[48,-124],[58,-136],[60,-141],[65,-168]]);
  drawPoly([[83,-68],[83,-18],[60,-44],[60,-50],[75,-68]]);
  drawPoly([[66,-24],[66,-13],[63,-13],[63,-24]]);
  drawPoly([[23,-85],[23,-74],[20,-74],[20,-85]]);
  drawPoly([[12,-72],[12,-61],[8,-60],[5,-52],[0,-50],[-5,-35],[-15,-39],[-22,-41],[-34,-53],[-40,-62],[-56,-68],[-55,-67],[-40,-70],[-18,-70],[-5,-81],[0,-78],[8,-77]]);
  drawPoly([[71,28],[70,32],[65,28],[60,25],[57,22],[55,15],[55,8],[51,2],[48,-5],[43,-9],[36,-9],[36,5],[37,11],[38,16],[40,18],[42,20],[45,14],[47,20],[49,22],[54,18],[57,22],[60,25],[65,25],[70,32]]);
  drawPoly([[58,-5],[58,2],[51,2],[50,-5],[55,-6]]);
  drawPoly([[55,-10],[55,-6],[51,-6],[51,-10]]);
  drawPoly([[71,15],[70,30],[63,28],[57,6],[57,8],[60,12],[65,14],[68,20],[71,28]]);
  drawPoly([[37,-6],[37,14],[31,33],[22,38],[15,42],[12,44],[11,43],[8,44],[2,42],[-8,40],[-15,37],[-26,33],[-35,22],[-35,18],[-26,14],[-18,12],[-5,10],[5,2],[4,-9],[8,-15],[15,-17],[21,-17],[32,-14]]);
  drawPoly([[-12,44],[-12,50],[-26,47],[-26,44]]);
  drawPoly([[71,30],[72,60],[73,100],[72,130],[68,140],[62,142],[55,135],[42,130],[38,128],[35,127],[22,115],[5,100],[1,104],[15,120],[22,120],[25,122],[32,122],[37,122],[45,133],[50,142],[55,140],[62,163],[68,172],[72,140],[73,100],[72,60]]);
  drawPoly([[30,32],[30,60],[12,45],[12,44],[15,42],[22,38]]);
  drawPoly([[22,68],[8,78],[8,80],[22,88]]);
  drawPoly([[10,80],[6,80],[7,82],[10,80]]);
  drawPoly([[22,100],[22,108],[14,102],[10,104],[1,104],[5,100]]);
  drawPoly([[7,108],[7,117],[1,117],[1,108]]);
  drawPoly([[5,95],[5,106],[-6,106],[-6,95]]);
  drawPoly([[-6,105],[-6,114],[-9,114],[-9,105]]);
  drawPoly([[18,120],[18,122],[10,122],[8,124],[10,125],[18,120]]);
  drawPoly([[42,141],[45,141],[43,145],[38,141],[33,131],[34,130],[42,141]]);
  drawPoly([[-2,132],[-2,150],[-8,148],[-8,132]]);
  drawPoly([[-14,130],[-14,136],[-14,140],[-24,154],[-38,147],[-39,144],[-38,140],[-32,134],[-26,114],[-22,114],[-16,122],[-14,128]]);
  drawPoly([[-40,172],[-47,168],[-46,171],[-40,172]]);
  drawPoly([[-36,174],[-41,174],[-38,178],[-34,173]]);

  ctx.fillStyle = '#b8d8f0';
  drawPoly([[90,-180],[90,180],[72,180],[70,0],[72,-180]]);
  drawPoly([[-68,-180],[-68,180],[-90,180],[-90,-180]]);
  ctx.fillStyle = '#d0e8f8';
  drawPoly([[-74,-180],[-74,180],[-90,180],[-90,-180]]);
  ctx.fillStyle = 'rgba(10,40,80,0.2)';
  ctx.fillRect(0, H * 0.45, W, H * 0.1);

  return new THREE.CanvasTexture(canvas);
}

// ── Globe grid ──────────────────────────────────────────────────────────────

function GlobeGrid() {
  const lines = useMemo(() => {
    const GRID_R = R + 0.012;
    const result: THREE.Line[] = [];
    const gridMat    = new THREE.LineBasicMaterial({ color: '#3060a8', transparent: true, opacity: 0.3 });
    const equatorMat = new THREE.LineBasicMaterial({ color: '#5080d0', transparent: true, opacity: 0.6 });
    const primeMat   = new THREE.LineBasicMaterial({ color: '#5080d0', transparent: true, opacity: 0.6 });

    [-60,-45,-30,-15,0,15,30,45,60].forEach(lat => {
      const pts: THREE.Vector3[] = [];
      const φ = (lat * Math.PI) / 180;
      for (let i = 0; i <= 128; i++) {
        const λ = ((i / 128) * 2 - 1) * Math.PI;
        pts.push(new THREE.Vector3(GRID_R * Math.cos(φ) * Math.cos(λ), GRID_R * Math.sin(φ), GRID_R * Math.cos(φ) * Math.sin(λ)));
      }
      result.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? equatorMat : gridMat));
    });

    [-150,-120,-90,-60,-30,0,30,60,90,120,150,180].forEach(lon => {
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

// ── Node marker ─────────────────────────────────────────────────────────────

function NodeMarker({
  node,
  onSelect,
}: {
  node: GraphNode;
  onSelect: (n: GraphNode) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const dotRef   = useRef<THREE.Mesh>(null);
  const cred     = getCredibilityDisplay(node);
  const colorHex = cred.badgeColor;
  const color    = new THREE.Color(colorHex);
  const pos      = latLonToXYZ(node.coordinates![0], node.coordinates![1], R + 0.1);

  useFrame(({ clock }) => {
    if (!dotRef.current) return;
    const pulse = Math.sin(clock.elapsedTime * 2.5 + node.id.length) * 0.18 + 1;
    dotRef.current.scale.setScalar(hovered ? pulse * 2.8 : pulse);
    (dotRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      hovered ? 4 : 2.5 * cred.opacity;
  });

  return (
    <group position={pos}>
      <mesh
        ref={dotRef}
        onClick={e => { e.stopPropagation(); onSelect(node); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.11, 14, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.5 * cred.opacity}
          transparent
          opacity={cred.opacity}
        />
      </mesh>

      <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{
          background:  'rgba(0,0,8,0.85)',
          border:      `1px solid ${colorHex}80`,
          borderRadius: 3,
          padding:     '2px 6px',
          fontSize:    9,
          color:       colorHex,
          whiteSpace:  'nowrap',
          fontFamily:  'monospace',
          letterSpacing: '0.05em',
          marginTop:   18,
          userSelect:  'none',
          textShadow:  `0 0 6px ${colorHex}`,
          opacity:     cred.opacity,
        }}>
          {node.title}
          <span style={{ marginLeft: 4, fontSize: 7, opacity: 0.7 }}>
            [{cred.badge}]
          </span>
        </div>
      </Html>

      <pointLight
        color={color}
        intensity={hovered ? 2 * cred.opacity : 0.8 * cred.opacity}
        distance={1.2}
      />
    </group>
  );
}

// ── Rotating globe wrapper ──────────────────────────────────────────────────

const CONTINENT_LABELS = [
  { name: 'NORTH AMERICA', lat: 48,  lon: -100 },
  { name: 'SOUTH AMERICA', lat: -18, lon: -57  },
  { name: 'EUROPE',        lat: 54,  lon: 13   },
  { name: 'AFRICA',        lat: 5,   lon: 23   },
  { name: 'ASIA',          lat: 52,  lon: 88   },
  { name: 'AUSTRALIA',     lat: -26, lon: 133  },
];

function ContinentLabels() {
  return (
    <>
      {CONTINENT_LABELS.map(({ name, lat, lon }) => {
        const pos = latLonToXYZ(lat, lon, R + 0.08);
        return (
          <group key={name} position={pos}>
            <Html center distanceFactor={9} style={{ pointerEvents: 'none' }}>
              <div style={{
                fontSize: 7, fontFamily: 'monospace', fontWeight: 'bold',
                letterSpacing: '0.18em', color: 'rgba(160,200,255,0.55)',
                whiteSpace: 'nowrap', userSelect: 'none', textTransform: 'uppercase',
                textShadow: '0 0 8px rgba(80,140,255,0.5)',
              }}>{name}</div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

function RotatingGlobe({
  visibleNodes,
  onSelect,
}: {
  visibleNodes: GraphNode[];
  onSelect: (n: GraphNode) => void;
}) {
  const groupRef     = useRef<THREE.Group>(null);
  const earthTexture = useMemo(() => createEarthTexture(), []);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.0018;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial map={earthTexture} metalness={0.05} roughness={0.88} />
      </mesh>
      <GlobeGrid />
      <ContinentLabels />
      <mesh>
        <sphereGeometry args={[R * 1.06, 32, 32]} />
        <meshBasicMaterial color="#1e40af" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.02, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      {visibleNodes.map(node => (
        <NodeMarker key={node.id} node={node} onSelect={onSelect} />
      ))}
    </group>
  );
}

// ── Controls panel ──────────────────────────────────────────────────────────

function ControlsPanel({
  opts,
  onChange,
}: {
  opts: CredibilityOptions;
  onChange: (o: CredibilityOptions) => void;
}) {
  const toggle = (key: keyof CredibilityOptions, val: boolean) =>
    onChange({ ...opts, [key]: val });

  return (
    <div className="p-3 space-y-3">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Display settings</p>

      {(
        [
          ['showSpeculative',  'Show speculative'],
          ['showMythological', 'Show mythological'],
          ['showUnverified',   'Show unverified (no sources)'],
        ] as [keyof CredibilityOptions, string][]
      ).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between cursor-pointer">
          <span className="text-[10px] text-slate-400">{label}</span>
          <button
            onClick={() => toggle(key, !opts[key])}
            className={`w-8 h-4 rounded-full transition-colors relative ${
              opts[key] ? 'bg-purple-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                opts[key] ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      ))}

      <div>
        <div className="flex justify-between text-[9px] text-slate-500 mb-1">
          <span>Min confidence</span>
          <span>{Math.round(opts.minConfidence * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.05}
          value={opts.minConfidence}
          onChange={e => onChange({ ...opts, minConfidence: Number(e.target.value) })}
          className="w-full accent-purple-500"
        />
      </div>

      <div>
        <div className="flex justify-between text-[9px] text-slate-500 mb-1">
          <span>Min sources</span>
          <span>{opts.minSourceCount}</span>
        </div>
        <input
          type="range" min={0} max={5} step={1}
          value={opts.minSourceCount}
          onChange={e => onChange({ ...opts, minSourceCount: Number(e.target.value) })}
          className="w-full accent-purple-500"
        />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AncientGlobe() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceLevel | 'all'>('all');
  const [opts, setOpts]                 = useState<CredibilityOptions>(DEFAULT_PUBLIC_OPTIONS);
  const [showControls, setShowControls] = useState(false);

  // Nodes with valid coordinates that pass credibility filter
  const globeNodes = nodes
    .filter(n => isValidCoordinate(n.coordinates))
    .filter(n => nodePassesFilter(n, opts))
    .filter(n => evidenceFilter === 'all' || n.evidence_level === evidenceFilter);

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ── */}
      <div className="flex-shrink-0 p-4 border-b border-purple-900/20">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-black text-white">Research Sites</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Map markers indicate research subjects — they do not verify claims.
            </p>
          </div>
          <button
            onClick={() => setShowControls(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all flex-shrink-0 ${
              showControls
                ? 'bg-purple-900/30 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={11} />
          </button>
        </div>

        {/* Evidence level filter buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-wrap">
          <button
            onClick={() => setEvidenceFilter('all')}
            className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border"
            style={{
              borderColor: evidenceFilter === 'all' ? '#a78bfa60' : '#ffffff10',
              background:  evidenceFilter === 'all' ? '#a78bfa20' : 'transparent',
              color:       evidenceFilter === 'all' ? '#a78bfa'   : '#64748b',
            }}
          >
            All ({globeNodes.length})
          </button>

          {EVIDENCE_LEVELS_ORDERED.map(level => {
            const cfg   = EVIDENCE_CFG[level];
            const count = nodes
              .filter(n => isValidCoordinate(n.coordinates))
              .filter(n => nodePassesFilter(n, opts))
              .filter(n => n.evidence_level === level)
              .length;
            if (count === 0) return null;
            return (
              <button
                key={level}
                onClick={() => setEvidenceFilter(level)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border"
                style={{
                  borderColor: evidenceFilter === level ? cfg.color + '60' : '#ffffff10',
                  background:  evidenceFilter === level ? cfg.color + '20'  : 'transparent',
                  color:       evidenceFilter === level ? cfg.color          : '#64748b',
                }}
              >
                {cfg.badge} ({count})
              </button>
            );
          })}
        </div>

        {/* Controls panel */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2 rounded-xl border border-purple-900/30 bg-purple-950/10"
            >
              <ControlsPanel opts={opts} onChange={setOpts} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Globe canvas ── */}
      <div className="flex-1 relative min-h-0">
        <Canvas camera={{ position: [0, 2, 7.5], fov: 48 }}>
          <color attach="background" args={['#00000a']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[8, 5, 5]}   intensity={1.4} color="#7090e0" />
          <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#3040aa" />
          <pointLight position={[0, 8, 0]}  intensity={0.5} color="#ffffff" />
          <pointLight position={[0, -8, 0]} intensity={0.2} color="#3060ff" />

          <RotatingGlobe visibleNodes={globeNodes} onSelect={setSelectedNode} />

          <OrbitControls
            enablePan={false}
            minDistance={4.5}
            maxDistance={14}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.6}
          />
        </Canvas>

        {/* ── Selected node panel ── */}
        <AnimatePresence>
          {selectedNode && (() => {
            const cred   = getCredibilityDisplay(selectedNode);
            const reason = getAppearanceReason(selectedNode);
            return (
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                className="absolute right-3 top-3 glass rounded-xl p-4 max-w-[280px] overflow-y-auto max-h-[calc(100%-2rem)]"
              >
                <button
                  onClick={() => setSelectedNode(null)}
                  className="absolute top-2 right-2 text-slate-500 hover:text-white"
                >
                  <X size={13} />
                </button>

                {/* Evidence badge */}
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                  style={{ color: cred.badgeColor, background: cred.badgeBg, borderColor: cred.badgeColor + '40' }}
                >
                  {cred.badge}
                </span>

                <h3 className="text-sm font-bold text-white mt-2 mb-1 pr-4">
                  {selectedNode.title}
                </h3>

                {/* Warning strip */}
                {cred.warningLabel && (
                  <div className="flex items-center gap-1 text-[9px] text-amber-400/80 mb-2">
                    <AlertTriangle size={9} className="flex-shrink-0" />
                    {cred.warningLabel}
                  </div>
                )}

                {/* Metrics row */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
                  <span>
                    Confidence: <span className="text-slate-400">{Math.round(selectedNode.confidence_score * 100)}%</span>
                  </span>
                  <span>
                    Sources: <span className="text-slate-400">{cred.sourceCount}</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  {selectedNode.description.slice(0, 240)}
                  {selectedNode.description.length > 240 ? '…' : ''}
                </p>

                {/* Mainstream view */}
                {selectedNode.mainstream_view && (
                  <div className="mb-3 p-2 rounded-lg border border-blue-900/30 bg-blue-950/10">
                    <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-wider mb-1">
                      Mainstream view
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {selectedNode.mainstream_view.slice(0, 180)}
                      {selectedNode.mainstream_view.length > 180 ? '…' : ''}
                    </p>
                  </div>
                )}

                {/* Why this appears here */}
                <div className="mb-3 p-2 rounded-lg border border-slate-700/50 bg-slate-900/40">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <Info size={9} />
                    Why this appears here
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{reason}</p>
                </div>

                {/* Coordinates */}
                <div className="text-[9px] text-slate-600 mb-2">
                  <BookOpen size={9} className="inline mr-1" />
                  {selectedNode.coordinates![0].toFixed(4)}°, {selectedNode.coordinates![1].toFixed(4)}°
                </div>

                {/* Disclaimer */}
                <div className="text-[9px] text-slate-600 italic border-t border-white/5 pt-2">
                  This marker indicates a research subject. Location does not verify the claim.
                </div>

                {/* Tags */}
                {selectedNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedNode.tags.slice(0, 5).map(tag => (
                      <span
                        key={tag}
                        className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* ── Evidence legend ── */}
        <div className="absolute bottom-4 left-4 glass rounded-xl p-3 hidden sm:block">
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">
            Evidence level
          </div>
          {EVIDENCE_LEVELS_ORDERED.map(level => {
            const cfg = EVIDENCE_CFG[level];
            return (
              <div key={level} className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                {cfg.badge}
              </div>
            );
          })}
          <div className="border-t border-white/5 pt-2 mt-2 text-[8px] text-slate-700 leading-relaxed">
            Opacity reflects evidence strength.<br />
            Markers do not validate claims.
          </div>
        </div>

        {/* ── Interaction hint ── */}
        <div className="absolute top-3 left-3 glass rounded-lg px-3 py-2 hidden sm:block">
          <div className="text-[10px] text-slate-500">Drag · Scroll · Click markers</div>
        </div>
      </div>
    </div>
  );
}
