'use client';
/**
 * Map Explorer — an equirectangular world map with archive topics pinned by
 * their real coordinates. Plate-carrée projection (x=(lon+180)/360,
 * y=(90-lat)/180), category-colored pins, a 30° graticule, continent labels,
 * category filters and a selection card. Nodes without coordinates are counted
 * as "non-geographic" and never plotted.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, BookOpen, Rabbit, X, Globe2 } from 'lucide-react';
import { useNodes } from '@/lib/graph/useNodes';
import { CATEGORY_COLORS } from '@/lib/graph';
import type { GraphNode } from '@/lib/graph/types';
import { useUserStore } from '@/lib/store/userStore';

const CONTINENTS: { label: string; lat: number; lon: number }[] = [
  { label: 'NORTH AMERICA', lat: 45,  lon: -100 },
  { label: 'SOUTH AMERICA', lat: -15, lon: -60 },
  { label: 'EUROPE',        lat: 52,  lon: 15 },
  { label: 'AFRICA',        lat: 3,   lon: 22 },
  { label: 'ASIA',          lat: 48,  lon: 90 },
  { label: 'OCEANIA',       lat: -25, lon: 133 },
];

const proj = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * 100,
  y: ((90 - lat) / 180) * 100,
});

const catColor = (c: string) => (CATEGORY_COLORS as Record<string, string>)[c] ?? '#64748b';

export default function MapExplorer() {
  const nodes = useNodes();
  const { navigateToNode, startRabbitHole, setCurrentView } = useUserStore();

  const [filter, setFilter]   = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const geo = useMemo(
    () => nodes.filter(n => Array.isArray(n.coordinates) && n.coordinates.length === 2),
    [nodes],
  );
  const nonGeoCount = nodes.length - geo.length;

  const categories = useMemo(
    () => Array.from(new Set(geo.map(n => n.category))).sort(),
    [geo],
  );

  const visible = filter ? geo.filter(n => n.category === filter) : geo;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Globe2 size={18} className="text-cyan-400" />
        <h1 className="text-xl font-black text-white">Map Explorer</h1>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        {geo.length} located topic{geo.length !== 1 ? 's' : ''}
        {nonGeoCount > 0 && <span className="text-slate-600"> · {nonGeoCount} non-geographic</span>}
      </p>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${filter === null ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}
          >
            All
          </button>
          {categories.map(c => {
            const on = filter === c;
            const color = catColor(c);
            return (
              <button
                key={c}
                onClick={() => setFilter(on ? null : c)}
                className="px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors"
                style={{ background: on ? `${color}22` : 'transparent', color: on ? color : '#8b91ab', borderColor: on ? `${color}66` : 'rgba(255,255,255,0.1)' }}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      {/* Map */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#04040c]" style={{ aspectRatio: '2 / 1' }}>
        {/* Basemap */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/earth-equirect.jpg"
          alt="World map"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(.55) brightness(.62) contrast(1.05)' }}
          draggable={false}
        />
        {/* Radial vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(4,4,12,0.55) 100%)' }} />

        {/* 30° graticule */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 360 180" preserveAspectRatio="none">
          {Array.from({ length: 11 }, (_, i) => (i + 1) * 30).map(lon => (
            <line key={`v${lon}`} x1={lon} y1={0} x2={lon} y2={180} stroke="rgba(226,232,255,0.08)" strokeWidth={0.4} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (i + 1) * 30).map(lat => (
            <line key={`h${lat}`} x1={0} y1={lat} x2={360} y2={lat} stroke="rgba(226,232,255,0.08)" strokeWidth={0.4} />
          ))}
        </svg>

        {/* Continent labels */}
        {CONTINENTS.map(c => {
          const p = proj(c.lat, c.lon);
          return (
            <span
              key={c.label}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                fontSize: 10, fontWeight: 800, letterSpacing: '0.22em',
                color: 'rgba(226,232,255,0.45)', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {c.label}
            </span>
          );
        })}

        {/* Pins */}
        {visible.map(n => {
          const [lat, lon] = n.coordinates as [number, number];
          const p = proj(lat, lon);
          const color = catColor(n.category);
          const isSel = selected?.id === n.id;
          const size = isSel ? 18 : 12;
          return (
            <button
              key={n.id}
              onClick={() => setSelected(n)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all hover:scale-125"
              style={{
                left: `${p.x}%`, top: `${p.y}%`, width: size, height: size,
                background: color, boxShadow: `0 0 6px ${color}aa`,
                border: isSel ? '2px solid #fff' : '1px solid rgba(255,255,255,0.5)',
                zIndex: isSel ? 20 : 10,
              }}
              title={n.title}
              aria-label={n.title}
            />
          );
        })}
      </div>

      {/* Selection card */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: catColor(selected.category), boxShadow: `0 0 6px ${catColor(selected.category)}aa` }} />
                <span className="text-base font-black text-white flex items-center gap-2"><span>{selected.icon}</span>{selected.title}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin size={11} />
                {(selected.coordinates as [number, number])[0].toFixed(2)}, {(selected.coordinates as [number, number])[1].toFixed(2)}
                <span className="text-slate-600">·</span>
                <span style={{ color: catColor(selected.category) }}>{selected.category}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white shrink-0"><X size={16} /></button>
          </div>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed line-clamp-3">{selected.description}</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => navigateToNode(selected.id, selected.title)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-colors"
            >
              <BookOpen size={13} /> Read
            </button>
            <button
              onClick={() => { startRabbitHole(selected.id); setCurrentView('rabbit-hole'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <Rabbit size={13} /> Dive
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
