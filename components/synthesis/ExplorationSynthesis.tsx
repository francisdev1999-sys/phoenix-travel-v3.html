'use client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Tag, Network, AlertTriangle, BarChart2,
  Layers, Compass, ChevronRight, Loader2,
} from 'lucide-react';
import type { SynthesisResult } from '@/lib/synthesis/rule-engine';

interface Props {
  result:    SynthesisResult & { narrative?: string | null };
  loading:   boolean;
  onClose:   () => void;
  onExplore: (nodeId: string) => void;
}

const EVIDENCE_COLOR: Record<string, string> = {
  verified:        '#10b981',
  strong_evidence: '#34d399',
  debated:         '#f59e0b',
  speculative:     '#8b5cf6',
  mythological:    '#ec4899',
};

const REL_COLOR: Record<string, string> = {
  historical:          '#3b82f6',
  geographical:        '#10b981',
  thematic:            '#8b5cf6',
  textual:             '#f59e0b',
  contradictory:       '#ef4444',
  speculative:         '#6366f1',
  source_relationship: '#14b8a6',
};

function QualityBar({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold" style={{ color }}>{score}/100</span>
    </div>
  );
}

export default function ExplorationSynthesis({ result, loading, onClose, onExplore }: Props) {
  const hasNarrative     = !!result.narrative;
  const hasThemes        = result.themes.length > 0;
  const hasConnections   = result.connections.length > 0;
  const hasContradiction = result.contradictions.length > 0;
  const hasBridges       = result.bridges.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{    opacity: 0, y: 20, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[75vh] flex flex-col rounded-2xl border border-purple-500/30 bg-slate-950/95 backdrop-blur-md shadow-2xl shadow-purple-900/30 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-purple-900/30 flex-shrink-0">
        <div className="p-1.5 rounded-lg bg-purple-900/40">
          <Sparkles size={14} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Exploration Synthesis</p>
          <p className="text-[10px] text-slate-500">
            {result.nodeCount} nodes · {result.pathType} path
            {result.narrative ? ' · AI narrative' : ' · rule-based'}
          </p>
        </div>
        {loading && <Loader2 size={13} className="animate-spin text-purple-400 flex-shrink-0" />}
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all flex-shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Quality */}
        {!result.isMinimallyConnected && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-500/20 text-xs text-amber-300">
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
            These nodes aren't well-connected — synthesis is partial.
          </div>
        )}
        <QualityBar score={result.qualityScore} />

        {/* AI Narrative */}
        <AnimatePresence>
          {hasNarrative && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-3 py-3 rounded-xl bg-purple-900/20 border border-purple-500/20"
            >
              <p className="text-[10px] font-bold text-purple-400 mb-1.5 uppercase tracking-wider">Discovery</p>
              <p className="text-xs text-slate-300 leading-relaxed">{result.narrative}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Convergent Themes */}
        {hasThemes && (
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Tag size={11} />Convergent themes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.themes.map(t => (
                <span key={t.tag}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-purple-900/30 border border-purple-500/20 text-purple-300">
                  {t.tag}
                  <span className="text-purple-500">{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Internal Connections */}
        {hasConnections && (
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Network size={11} />{result.connections.length} connections found
            </p>
            <div className="flex flex-col gap-1.5">
              {result.connections.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-white truncate">{c.fromTitle}</span>
                      <ChevronRight size={11} className="text-slate-600 flex-shrink-0" />
                      <span className="font-medium text-white truncate">{c.toTitle}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{c.explanation}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: (REL_COLOR[c.relationshipType] ?? '#6b7280') + '22',
                               color:      REL_COLOR[c.relationshipType] ?? '#94a3b8' }}>
                      {c.relationshipType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">{Math.round(c.confidenceScore * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contradictions */}
        {hasContradiction && (
          <div className="px-3 py-2.5 rounded-xl bg-red-900/15 border border-red-500/20">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 mb-2">
              <AlertTriangle size={11} />{result.contradictions.length} contradiction{result.contradictions.length > 1 ? 's' : ''} in your path
            </p>
            {result.contradictions.map(c => (
              <p key={c.id} className="text-[10px] text-red-300">
                {c.fromTitle} <span className="text-red-500">contradicts</span> {c.toTitle}
              </p>
            ))}
          </div>
        )}

        {/* Evidence breakdown */}
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            <BarChart2 size={11} />Evidence quality · {result.evidenceBreakdown.qualityScore}/100
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {(['verified','strong_evidence','debated','speculative','mythological'] as const).map(level => {
              const count = result.evidenceBreakdown[level];
              if (!count) return null;
              return (
                <span key={level}
                  className="px-2 py-1 rounded-full text-[10px] font-medium"
                  style={{ background: (EVIDENCE_COLOR[level] ?? '#6b7280') + '22', color: EVIDENCE_COLOR[level] ?? '#94a3b8' }}>
                  {level.replace('_', ' ')} ×{count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Category distribution */}
        {result.categoryDistribution.length > 1 && (
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Layers size={11} />Topics explored
            </p>
            <div className="flex flex-col gap-1">
              {result.categoryDistribution.map(c => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-600"
                      style={{ width: `${Math.round((c.count / result.nodeCount) * 100)}%` }} />
                  </div>
                  <span className="text-slate-400 w-32 truncate">{c.name}</span>
                  <span className="text-slate-600 w-4 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bridge nodes */}
        {hasBridges && (
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Compass size={11} />You almost found…
            </p>
            <div className="flex flex-col gap-1.5">
              {result.bridges.map(b => (
                <button key={b.id}
                  onClick={() => onExplore(b.id)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white group-hover:text-purple-300 transition-colors">{b.title}</p>
                    <p className="text-[10px] text-slate-500">
                      Connected to {b.connectionCount} of your nodes · {b.evidenceLevel.replace('_',' ')}
                    </p>
                  </div>
                  <ChevronRight size={13} className="text-slate-600 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-purple-900/20 flex-shrink-0">
        <p className="text-[10px] text-slate-600 text-center">
          Based on {result.connections.length} graph edges · no external knowledge used
        </p>
      </div>
    </motion.div>
  );
}
