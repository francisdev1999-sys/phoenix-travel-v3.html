'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, Loader2 } from 'lucide-react';
import { EVIDENCE_COLORS, CATEGORY_COLORS } from '@/lib/graph';

interface MissingSourceNode {
  id: string; label: string; category: string;
  evidenceLevel: string; confidence: number;
}
interface LowConfEdge {
  id: string; from: string; to: string; relationship: string;
  confidence: number; evidenceBasis: string; sourceType: string;
}
interface LowConfNode {
  id: string; label: string; category: string;
  confidence: number; evidenceLevel: string;
}
interface Reports {
  missingSources: MissingSourceNode[];
  lowConfidenceEdges: LowConfEdge[];
  lowConfidenceNodes: LowConfNode[];
}

export default function AdminReports() {
  const [data, setData] = useState<Reports | null>(null);
  const [tab, setTab] = useState<'missing' | 'lowEdge' | 'lowNode'>('missing');

  useEffect(() => {
    fetch('/api/admin/reports').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400" size={20} /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {([
          { id: 'missing',  label: `Missing sources (${data.missingSources.length})`,      icon: <AlertTriangle size={12} /> },
          { id: 'lowEdge',  label: `Low confidence edges (${data.lowConfidenceEdges.length})`, icon: <TrendingDown size={12} /> },
          { id: 'lowNode',  label: `Low confidence nodes (${data.lowConfidenceNodes.length})`, icon: <TrendingDown size={12} /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? 'bg-purple-900/50 text-purple-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'missing' && (
        <div className="flex flex-col gap-2">
          {data.missingSources.length === 0 ? (
            <p className="text-xs text-green-400 text-center py-8">All nodes have at least one source linked.</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">These graph nodes have no approved sources linked to them. Sorted by confidence (highest first — high confidence without sources is a priority).</p>
              {data.missingSources.map(n => {
                const catColor = (CATEGORY_COLORS as Record<string, string>)[n.category] ?? '#94a3b8';
                const evColor  = (EVIDENCE_COLORS as Record<string, string>)[n.evidenceLevel]  ?? '#94a3b8';
                return (
                  <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-purple-900/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: catColor + '22', color: catColor }}>{n.category}</span>
                        <span className="text-[10px]" style={{ color: evColor }}>{n.evidenceLevel.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm font-medium text-white">{n.label}</p>
                      <p className="text-[10px] font-mono text-slate-500">{n.id}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-300">{Math.round(n.confidence * 100)}%</div>
                      <div className="text-[10px] text-slate-500">confidence</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === 'lowEdge' && (
        <div className="flex flex-col gap-2">
          {data.lowConfidenceEdges.length === 0 ? (
            <p className="text-xs text-green-400 text-center py-8">No low-confidence edges found.</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">Edges with confidence below 45%. Consider reviewing or adding sources.</p>
              {data.lowConfidenceEdges.map(e => {
                const pct = Math.round(e.confidence * 100);
                return (
                  <div key={e.id} className="p-3 rounded-xl bg-white/5 border border-red-900/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-400 capitalize">{e.sourceType.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-500 capitalize">{e.relationship}</span>
                      <span className="ml-auto text-xs font-bold text-red-400">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mb-1.5">
                      <code className="text-cyan-400 font-mono text-[10px]">{e.from}</code>
                      <span className="text-slate-600">→</span>
                      <code className="text-purple-400 font-mono text-[10px]">{e.to}</code>
                    </div>
                    <div className="h-1 rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === 'lowNode' && (
        <div className="flex flex-col gap-2">
          {data.lowConfidenceNodes.length === 0 ? (
            <p className="text-xs text-green-400 text-center py-8">No low-confidence nodes found.</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">Nodes with confidence below 40%. Review evidence or link stronger sources.</p>
              {data.lowConfidenceNodes.map(n => {
                const catColor = (CATEGORY_COLORS as Record<string, string>)[n.category] ?? '#94a3b8';
                const pct = Math.round(n.confidence * 100);
                return (
                  <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-orange-900/20">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded mr-2" style={{ background: catColor + '22', color: catColor }}>{n.category}</span>
                      <span className="text-sm font-medium text-white">{n.label}</span>
                      <div className="mt-1.5 h-1 rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-orange-400">{pct}%</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
