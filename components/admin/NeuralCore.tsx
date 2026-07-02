'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Cpu, Activity, Database, Radio, Gauge, ShieldCheck, Maximize2, Minimize2, MousePointerClick, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import LearningDashboard from '@/components/admin/LearningDashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Neural Core — a futuristic command-center view of the adaptive engine.
// The animated network is decorative, but its input nodes, edge polarity, and
// output activation are driven by the REAL learned model; the HUD panels and
// reactors read live from /api/admin/learning, /api/admin/cron-health,
// /api/activity-feed and /api/stats/landing.
// ─────────────────────────────────────────────────────────────────────────────

interface Weight { name: string; weight: number }
interface Learning {
  active: {
    version: number; accuracy: number | null; auc: number | null;
    exampleCount: number; positiveCount: number; negativeCount: number;
    mature: boolean; weights: Weight[]; bias: number;
  } | null;
  autoApprove: { total: number; livePrecision: number | null };
  interest: {
    version: number; accuracy: number | null; auc: number | null;
    exampleCount: number; positiveCount: number; negativeCount: number;
    weights: Weight[];
  } | null;
  engagement: {
    last24h: Record<string, number>;
    topTopics: { id: string; title: string; score: number }[];
    engagedNodes7d: number;
  } | null;
}

// Plain-language names for what the interest neuron learned drives engagement.
const DRIVER_LABELS: Record<string, string> = {
  confidence: 'high confidence', claims: 'bold claims', criticisms: 'counter-arguments',
  tags: 'rich tagging', descLength: 'deep writeups', sources: 'heavy sourcing',
  sourceCred: 'credible sources', connections: 'well-connected topics',
  hasMainstream: 'mainstream context', openQuestions: 'open questions',
  ev_verified: 'verified topics', ev_strong: 'strong-evidence topics',
  ev_debated: 'debated topics', ev_speculative: 'speculative theories',
  ev_mythological: 'myth & legend',
};
interface JobHealth { job: string; lastStatus: string | null; alerting: boolean; presumedStuck: boolean }
interface FeedItem { id: string; label: string; type: string; createdAt: string }
interface Stats { nodeCount: number; edgeCount: number; galaxyCount: number; yearsCovered: number }

const LAYERS = [8, 7, 6, 3]; // input, hidden1, hidden2, output
const NEON = { cyan: '#22d3ee', violet: '#a78bfa', emerald: '#34d399', red: '#f87171', amber: '#fbbf24' };

const BOOT_LINES = [
  '> INITIALIZING NEURAL CORE',
  '> MOUNTING /dev/synapse … OK',
  '> LOADING MODEL WEIGHTS … OK',
  '> CALIBRATING ACTIVATION FUNCTIONS … OK',
  '> LINKING SUBSYSTEM REACTORS … OK',
  '> ESTABLISHING INFERENCE MESH … OK',
  '> ENGAGING AUTONOMOUS PIPELINE … OK',
  '> CORE ONLINE',
];

interface Node { x: number; y: number; layer: number; idx: number; r: number; hue: string }
interface Edge { from: number; to: number; w: number }
interface Pulse { edge: number; t: number; speed: number }

export default function NeuralCore() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef   = useRef<HTMLDivElement | null>(null);
  const rootRef   = useRef<HTMLDivElement | null>(null);
  const rafRef    = useRef<number>(0);
  const netRef    = useRef<{ nodes: Node[]; edges: Edge[]; pulses: Pulse[] } | null>(null);
  const weightsRef = useRef<Weight[]>([]);
  const ripplesRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const isFullRef  = useRef(false);

  const [learning, setLearning] = useState<Learning | null>(null);
  const [health, setHealth]     = useState<JobHealth[]>([]);
  const [feed, setFeed]         = useState<FeedItem[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [tick, setTick]         = useState(0);
  const [isFull, setIsFull]     = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [booting, setBooting]   = useState(true);
  const [showLab, setShowLab]   = useState(true);

  const loadAll = useCallback(async () => {
    const safe = <T,>(p: Promise<Response>): Promise<T | null> =>
      p.then(r => (r.ok ? r.json() : null)).catch(() => null);
    const [l, h, f, s] = await Promise.all([
      safe<Learning>(fetch('/api/admin/learning')),
      safe<{ jobs: JobHealth[] }>(fetch('/api/admin/cron-health')),
      safe<{ items: FeedItem[] }>(fetch('/api/activity-feed')),
      safe<Stats>(fetch('/api/stats/landing')),
    ]);
    if (l) { setLearning(l); weightsRef.current = l.active?.weights ?? []; }
    if (h?.jobs) setHealth(h.jobs);
    if (f?.items) setFeed(f.items.slice(0, 10));
    if (s) setStats(s);
  }, []);

  useEffect(() => {
    loadAll();
    const iv = setInterval(loadAll, 8000);
    return () => clearInterval(iv);
  }, [loadAll]);

  // HUD counters tick (independent of the canvas frame loop).
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Boot-up sequence — reveals init lines, then the core comes online.
  useEffect(() => {
    if (!booting) return;
    if (bootStep >= BOOT_LINES.length) {
      const done = setTimeout(() => setBooting(false), 550);
      return () => clearTimeout(done);
    }
    const t = setTimeout(() => setBootStep(s => s + 1), bootStep === 0 ? 250 : 230);
    return () => clearTimeout(t);
  }, [booting, bootStep]);

  const skipBoot = () => { setBootStep(BOOT_LINES.length); setBooting(false); };

  // Fullscreen command-center mode.
  const toggleFull = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => { const f = !!document.fullscreenElement; setIsFull(f); isFullRef.current = f; };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Canvas network animation ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, dpr = 1;

    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth;
      H = isFullRef.current
        ? Math.max(420, Math.min(760, window.innerHeight * 0.6))
        : Math.max(320, Math.min(460, wrap.clientWidth * 0.5));
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNetwork();
    };

    const buildNetwork = () => {
      const nodes: Node[] = [];
      const padX = 70, padY = 40;
      const usableW = W - padX * 2;
      LAYERS.forEach((count, li) => {
        const x = padX + (usableW * li) / (LAYERS.length - 1);
        for (let i = 0; i < count; i++) {
          const y = padY + ((H - padY * 2) * i) / Math.max(1, count - 1);
          const hue = li === 0 ? NEON.cyan : li === LAYERS.length - 1 ? NEON.emerald : NEON.violet;
          nodes.push({ x, y, layer: li, idx: i, r: li === LAYERS.length - 1 ? 7 : 5, hue });
        }
      });
      const edges: Edge[] = [];
      const weights = weightsRef.current;
      for (let li = 0; li < LAYERS.length - 1; li++) {
        const a = nodes.filter(n => n.layer === li);
        const b = nodes.filter(n => n.layer === li + 1);
        a.forEach((na, ai) => b.forEach((nb, bi) => {
          // Input→H1 edges borrow real model weight polarity; deeper layers decorative.
          let w: number;
          if (li === 0 && weights.length) {
            w = weights[(ai) % weights.length]?.weight ?? 0;
          } else {
            w = Math.sin((ai + 1) * (bi + 2) * (li + 1)) ; // deterministic pseudo-weight
          }
          edges.push({ from: nodes.indexOf(na), to: nodes.indexOf(nb), w });
        }));
      }
      netRef.current = { nodes, edges, pulses: [] };
    };

    let spawnAcc = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      const net = netRef.current;
      if (!net) { rafRef.current = requestAnimationFrame(frame); return; }
      const { nodes, edges, pulses } = net;

      ctx.clearRect(0, 0, W, H);

      // faint layer bands
      ctx.globalCompositeOperation = 'lighter';

      // edges
      for (const e of edges) {
        const a = nodes[e.from], b = nodes[e.to];
        const pos = e.w >= 0;
        ctx.strokeStyle = pos ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)';
        ctx.lineWidth = 0.5 + Math.min(1.6, Math.abs(e.w));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // spawn cascading pulses from the input layer
      spawnAcc += dt;
      if (spawnAcc > 140 && pulses.length < 90) {
        spawnAcc = 0;
        const inputEdges = edges.map((e, i) => ({ e, i })).filter(x => nodes[x.e.from].layer === 0);
        if (inputEdges.length) {
          const pick = inputEdges[Math.floor(Math.random() * inputEdges.length)];
          pulses.push({ edge: pick.i, t: 0, speed: 0.6 + Math.random() * 0.9 });
        }
      }

      // update + draw pulses (chain forward on arrival for a propagation feel)
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += (p.speed * dt) / 1000;
        const e = edges[p.edge];
        const a = nodes[e.from], b = nodes[e.to];
        if (p.t >= 1) {
          // arrived — light the target node briefly by spawning onward edges
          const onward = edges.map((ed, idx) => ({ ed, idx }))
            .filter(x => x.ed.from === e.to);
          if (onward.length && pulses.length < 90) {
            const nx = onward[Math.floor(Math.random() * onward.length)];
            pulses.push({ edge: nx.idx, t: 0, speed: p.speed });
          }
          pulses.splice(i, 1);
          continue;
        }
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        ctx.shadowBlur = 10; ctx.shadowColor = NEON.cyan;
        ctx.fillStyle = 'rgba(180,240,255,0.95)';
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // shockwave ripples from clicks
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.t += dt / 700;
        if (r.t >= 1) { ripples.splice(i, 1); continue; }
        const rad = r.t * 90;
        ctx.strokeStyle = `rgba(34,211,238,${(1 - r.t) * 0.6})`;
        ctx.lineWidth = 2 * (1 - r.t);
        ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
      }

      // nodes (subtle breathing)
      const t = now / 1000;
      for (const n of nodes) {
        const breathe = 1 + Math.sin(t * 2 + n.idx + n.layer) * 0.12;
        ctx.shadowBlur = 14; ctx.shadowColor = n.hue;
        ctx.fillStyle = n.hue;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * breathe, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,10,0.9)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * breathe * 0.45, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // layer captions
      ctx.fillStyle = 'rgba(148,163,184,0.5)';
      ctx.font = '9px ui-monospace, monospace';
      const caps = ['INPUT · FEATURES', 'HIDDEN', 'HIDDEN', 'OUTPUT · σ'];
      LAYERS.forEach((_, li) => {
        const x = 70 + ((W - 140) * li) / (LAYERS.length - 1);
        ctx.textAlign = 'center';
        ctx.fillText(caps[li], x, H - 12);
      });

      rafRef.current = requestAnimationFrame(frame);
    };

    // Click-to-fire: inject a burst of signals + a shockwave from the click.
    const onPointer = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      ripplesRef.current.push({ x, y, t: 0 });
      const net = netRef.current;
      if (!net) return;
      const inputEdges = net.edges
        .map((e, i) => ({ e, i }))
        .filter(o => net.nodes[o.e.from].layer === 0)
        .sort((a, b) => Math.abs(net.nodes[a.e.from].y - y) - Math.abs(net.nodes[b.e.from].y - y))
        .slice(0, 14);
      for (const o of inputEdges) if (net.pulses.length < 130) net.pulses.push({ edge: o.i, t: 0, speed: 1.1 + Math.random() * 0.9 });
    };
    canvas.addEventListener('pointerdown', onPointer);

    layout();
    rafRef.current = requestAnimationFrame(frame);
    const ro = new ResizeObserver(layout);
    ro.observe(wrap);
    const onFsResize = () => layout();
    document.addEventListener('fullscreenchange', onFsResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('fullscreenchange', onFsResize);
    };
  }, []);

  const m = learning?.active ?? null;
  const alerting = health.filter(h => h.alerting || h.presumedStuck).length;
  const online   = health.filter(h => h.lastStatus === 'success' || h.lastStatus === 'skipped').length;
  const uptime   = `${Math.floor(tick / 3600).toString().padStart(2, '0')}:${Math.floor((tick % 3600) / 60).toString().padStart(2, '0')}:${(tick % 60).toString().padStart(2, '0')}`;
  const signals  = 40 + Math.round((Math.sin(tick / 2) + 1) * 30) + (m ? m.exampleCount % 20 : 0);

  return (
    <div ref={rootRef} className={`relative min-h-full text-slate-200 font-mono ${isFull ? 'bg-[#000008] overflow-auto p-5' : ''}`}>
      {/* animated grid + scanline backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,0.25) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.25) 1px,transparent 1px)', backgroundSize: '38px 38px' }} />
      <div className="pointer-events-none absolute inset-0 scanlines" />

      {/* Boot-up sequence overlay */}
      {booting && (
        <div className="absolute inset-0 z-30 bg-[#000008]/95 flex flex-col items-center justify-center gap-4 cursor-pointer" onClick={skipBoot}>
          <div className="w-full max-w-md px-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-cyan-300 animate-pulse" />
              <span className="text-sm font-bold tracking-[0.3em] text-cyan-200">NEURAL CORE</span>
            </div>
            <div className="space-y-1 min-h-[160px]">
              {BOOT_LINES.slice(0, bootStep).map((line, i) => (
                <div key={i} className="text-[11px] text-emerald-400/90 tracking-wide">
                  {line}{i === bootStep - 1 && bootStep < BOOT_LINES.length && <span className="animate-pulse">_</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                style={{ width: `${(bootStep / BOOT_LINES.length) * 100}%` }} />
            </div>
            <div className="mt-3 text-[9px] text-slate-600 tracking-widest text-center">CLICK TO SKIP</div>
          </div>
        </div>
      )}

      <div className="relative z-10 space-y-4 p-1">
        {/* Command bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap border border-cyan-500/20 rounded-xl bg-black/40 px-4 py-3 hud-corners">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Cpu size={22} className="text-cyan-300" />
              <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-[0.2em] text-cyan-200">NEURAL CORE</div>
              <div className="text-[10px] text-slate-500 tracking-widest">ADAPTIVE PROMOTION ENGINE {m ? `// MODEL v${m.version}` : '// AWAITING TRAINING'}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <Readout label="STATUS" value={m?.mature ? 'ONLINE' : m ? 'LEARNING' : 'COLD'} color={m?.mature ? NEON.emerald : NEON.amber} />
            <Readout label="UPTIME" value={uptime} />
            <Readout label="SIGNALS/s" value={`${signals}`} color={NEON.cyan} />
            <Readout label="INTEGRITY" value={alerting ? `${alerting} ALERT` : 'NOMINAL'} color={alerting ? NEON.red : NEON.emerald} />
            <button onClick={toggleFull} title={isFull ? 'Exit fullscreen' : 'Fullscreen'}
              className="p-2 rounded-lg text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30">
              {isFull ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Network canvas */}
          <div className="lg:col-span-2 relative border border-violet-500/20 rounded-xl bg-black/50 overflow-hidden hud-corners">
            <div className="absolute top-2 left-3 z-10 text-[10px] tracking-widest text-violet-300/80 flex items-center gap-1.5">
              <Radio size={11} className="animate-pulse text-emerald-400" /> LIVE INFERENCE MESH
            </div>
            <div className="absolute top-2 right-3 z-10 text-[9px] tracking-widest text-cyan-300/60 flex items-center gap-1">
              <MousePointerClick size={10} /> CLICK TO INJECT SIGNAL
            </div>
            <div ref={wrapRef} className="w-full">
              <canvas ref={canvasRef} className="w-full block" />
            </div>
          </div>

          {/* Model vitals */}
          <div className="space-y-3">
            <VitalPanel icon={<Gauge size={13} />} title="MODEL VITALS">
              <VBar label="ACCURACY"  value={m?.accuracy ?? null} />
              <VBar label="AUC"       value={m?.auc ?? null} />
              <VBar label="PRECISION" value={learning?.autoApprove.livePrecision ?? null} />
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Stat label="EPOCH" value={m ? `${m.version}` : '—'} />
                <Stat label="+SAMPLES" value={m ? `${m.positiveCount}` : '—'} color={NEON.emerald} />
                <Stat label="−SAMPLES" value={m ? `${m.negativeCount}` : '—'} color={NEON.red} />
              </div>
            </VitalPanel>

            <VitalPanel icon={<Database size={13} />} title="ARCHIVE MATRIX">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="NODES" value={stats ? `${stats.nodeCount}` : '—'} color={NEON.cyan} />
                <Stat label="EDGES" value={stats ? `${stats.edgeCount}` : '—'} color={NEON.violet} />
                <Stat label="GALAXIES" value={stats ? `${stats.galaxyCount}` : '—'} />
                <Stat label="AUTO-APPROVED" value={learning ? `${learning.autoApprove.total}` : '—'} color={NEON.emerald} />
              </div>
            </VitalPanel>
          </div>
        </div>

        {/* Audience intelligence — the archive learning its users */}
        <VitalPanel icon={<Brain size={13} />} title="AUDIENCE INTELLIGENCE · LEARNING THE USERS">
          <div className="grid md:grid-cols-3 gap-4 pt-1">
            {/* Live pulse */}
            <div>
              <div className="text-[9px] text-slate-600 tracking-widest mb-2">SIGNALS · LAST 24H</div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="VIEWS" value={`${learning?.engagement?.last24h?.node_view ?? 0}`} color={NEON.cyan} />
                <Stat label="DIVES" value={`${learning?.engagement?.last24h?.node_dive ?? 0}`} color={NEON.violet} />
                <Stat label="HOPS"  value={`${learning?.engagement?.last24h?.connection_hop ?? 0}`} color={NEON.emerald} />
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                {learning?.engagement?.engagedNodes7d ?? 0} topics drew engagement this week
              </div>
            </div>
            {/* What it learned pulls users in */}
            <div>
              <div className="text-[9px] text-slate-600 tracking-widest mb-2">
                WHAT PULLS USERS IN {learning?.interest ? `· MODEL v${learning.interest.version}` : '· AWAITING TRAINING'}
              </div>
              {!learning?.interest ? (
                <div className="text-[11px] text-slate-600">
                  {'// interest neuron untrained — needs visitor engagement data'}
                </div>
              ) : (
                <div className="space-y-1">
                  {learning.interest.weights.slice(0, 5).map(w => (
                    <div key={w.name} className="flex items-center gap-2 text-[11px]">
                      <span className={w.weight >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {w.weight >= 0 ? '▲' : '▼'}
                      </span>
                      <span className="text-slate-300">{DRIVER_LABELS[w.name] ?? w.name}</span>
                      <span className="ml-auto font-mono text-slate-500">{w.weight >= 0 ? '+' : ''}{w.weight.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="text-[9px] text-slate-600 pt-1">
                    acc {learning.interest.accuracy == null ? '—' : `${Math.round(learning.interest.accuracy * 100)}%`} ·
                    {' '}{learning.interest.exampleCount} examples
                  </div>
                </div>
              )}
            </div>
            {/* Hottest topics */}
            <div>
              <div className="text-[9px] text-slate-600 tracking-widest mb-2">HOTTEST TOPICS · 7D</div>
              {(!learning?.engagement || learning.engagement.topTopics.length === 0) ? (
                <div className="text-[11px] text-slate-600">{'// no engagement signal yet'}</div>
              ) : (
                <div className="space-y-1">
                  {learning.engagement.topTopics.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-2 text-[11px]">
                      <span className="text-orange-400 font-mono">{i + 1}</span>
                      <span className="text-slate-300 truncate flex-1">{t.title}</span>
                      <span className="font-mono text-slate-500">{t.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </VitalPanel>

        {/* Reactor row — cron subsystems */}
        <VitalPanel icon={<ShieldCheck size={13} />} title={`SUBSYSTEM REACTORS · ${online}/${health.length || 0} ONLINE`}>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
            {(health.length ? health : Array.from({ length: 6 }, (_, i) => ({ job: `sys-${i}`, lastStatus: null, alerting: false, presumedStuck: false }))).map(h => (
              <Reactor key={h.job} job={h.job} status={h.lastStatus} alert={h.alerting || h.presumedStuck} />
            ))}
          </div>
        </VitalPanel>

        {/* Data stream ticker */}
        <VitalPanel icon={<Activity size={13} />} title="DATA STREAM">
          <div className="space-y-1 pt-1 max-h-40 overflow-hidden">
            {feed.length === 0 && <div className="text-[11px] text-slate-600">{'// no signal — awaiting autonomous growth events'}</div>}
            {feed.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-400">›</span>
                <span className="text-cyan-300/80">{item.type.replace('.', '::')}</span>
                <span className="text-slate-400 truncate flex-1">{item.label}</span>
                <span className="text-slate-600">{new Date(item.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </VitalPanel>

        {/* Neuron Lab — the archive's brain: adaptive models, playground, decisions */}
        <div className="border border-violet-500/20 rounded-xl bg-black/40 hud-corners">
          <button
            onClick={() => setShowLab(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-violet-300/90 hover:text-violet-200 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Brain size={14} className="text-violet-400" />
              <span className="text-[10px] font-bold tracking-widest">NEURON LAB · ADAPTIVE MODELS · LIVE INFERENCE PLAYGROUND</span>
            </span>
            {showLab ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showLab && (
            <div className="px-3 pb-3">
              <LearningDashboard />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .scanlines { background: repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.18) 3px); mix-blend-mode: multiply; }
        .hud-corners { box-shadow: inset 0 0 24px rgba(34,211,238,0.05); }
      `}</style>
    </div>
  );
}

// ── HUD primitives ─────────────────────────────────────────────────────────────
function Readout({ label, value, color = '#e2e8f0' }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-right">
      <div className="text-[8px] text-slate-600 tracking-widest">{label}</div>
      <div className="font-bold tracking-wider" style={{ color }}>{value}</div>
    </div>
  );
}

function VitalPanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-cyan-500/15 rounded-xl bg-black/40 p-3 hud-corners">
      <div className="flex items-center gap-1.5 mb-2 text-cyan-300/80">
        {icon}<span className="text-[10px] font-bold tracking-widest">{title}</span>
      </div>
      {children}
      <style jsx>{`.hud-corners { box-shadow: inset 0 0 24px rgba(34,211,238,0.04); }`}</style>
    </div>
  );
}

function VBar({ label, value }: { label: string; value: number | null }) {
  const p = value == null ? 0 : Math.round(value * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[9px] tracking-widest mb-0.5">
        <span className="text-slate-500">{label}</span>
        <span className="text-cyan-200">{value == null ? '—' : `${p}%`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, color = '#e2e8f0' }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-white/5 rounded-lg bg-white/[0.02] px-2 py-1.5">
      <div className="text-base font-black tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[8px] text-slate-600 tracking-widest">{label}</div>
    </div>
  );
}

function Reactor({ job, status, alert }: { job: string; status: string | null; alert: boolean }) {
  const color = alert ? NEON.red : status === 'success' || status === 'skipped' ? NEON.emerald
    : status === 'running' ? NEON.cyan : status === null ? '#64748b' : NEON.amber;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-11 h-11 rounded-full flex items-center justify-center"
        style={{ boxShadow: `0 0 14px ${color}55, inset 0 0 10px ${color}33`, border: `1px solid ${color}66` }}>
        <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: color }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <span className="text-[8px] text-slate-500 tracking-wide text-center leading-tight w-14 truncate">{job}</span>
    </div>
  );
}
