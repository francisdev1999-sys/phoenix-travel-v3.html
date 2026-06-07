'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, GitBranch, AlertCircle, BookOpen, Map, Clock, ExternalLink, Rabbit, Star } from 'lucide-react';
import { Theory } from '@/lib/types';
import { theories } from '@/lib/data/theories';
import { useUserStore } from '@/lib/store/userStore';
import { NODE_SOURCES } from '@/lib/graph/sources';

interface Props {
  theory: Theory;
  onClose: () => void;
}

type Tab = 'overview' | 'claims' | 'evidence' | 'criticisms' | 'mainstream' | 'sources';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABS: { id: Tab; label: string; icon: React.ElementType<any> }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'claims', label: 'Claims', icon: GitBranch },
  { id: 'evidence', label: 'Evidence', icon: AlertCircle },
  { id: 'criticisms', label: 'Criticisms', icon: ChevronDown },
  { id: 'mainstream', label: 'Mainstream', icon: BookOpen },
  { id: 'sources', label: 'Sources', icon: ExternalLink },
];

export default function TheoryPanel({ theory, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [expandedEvidence, setExpandedEvidence] = useState<number | null>(null);
  const { startRabbitHole, setCurrentView } = useUserStore();

  const relatedTheories = theories.filter(t =>
    theory.connections.includes(t.id) || theory.relatedTopics.includes(t.id)
  ).slice(0, 5);

  const handleRabbitHole = () => {
    startRabbitHole(theory.id);
    setCurrentView('graph');
  };

  const evidenceTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      artifact: '🏺', text: '📜', site: '🗿', observation: '🔭', testimony: '👤', document: '📄'
    };
    return icons[type] || '•';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 sm:p-6 border-b border-purple-900/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{theory.icon}</span>
              <span className="text-xs text-purple-400/70 tracking-widest uppercase font-medium">
                {theory.category}
              </span>
            </div>
            <h2 className="text-xl font-black text-white leading-tight">{theory.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                theory.difficulty === 'beginner' ? 'border-green-500/40 text-green-400' :
                theory.difficulty === 'intermediate' ? 'border-yellow-500/40 text-yellow-400' :
                'border-red-500/40 text-red-400'
              }`}>
                {theory.difficulty}
              </span>
              <span className="text-xs text-slate-500">
                {theory.connections.length} connections
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {theory.tags.slice(0, 5).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 border-b border-purple-900/20">
        <div className="flex overflow-x-auto scrollbar-hide px-2 pt-2 gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-purple-300 border-purple-500 bg-purple-900/20'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {/* @ts-expect-error lucide size prop */}
                <Icon size={11} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">{theory.overview}</p>
                <div className="p-3 rounded-lg bg-purple-900/10 border border-purple-500/10">
                  <h4 className="text-xs font-bold text-purple-400 mb-1 flex items-center gap-1">
                    <Clock size={11} /> Historical Background
                  </h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{theory.historicalBackground}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Clock size={10} /> Timeline
                    </div>
                    <div className="text-xs text-slate-300">{theory.timelinePlacement}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Map size={10} /> Geography
                    </div>
                    <div className="text-xs text-slate-300">{theory.geographicConnections.slice(0, 2).join(', ')}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'claims' && (
              <div className="space-y-3">
                <p className="text-xs text-amber-400/70 italic border border-amber-500/20 rounded-lg p-3 bg-amber-900/10">
                  ⚠️ The following are claims made by proponents of this theory, not established facts.
                </p>
                {theory.mainClaims.map((claim, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3 p-3 rounded-lg bg-slate-900/40 border border-white/5 hover:border-purple-500/20 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-xs text-purple-400 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{claim}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'evidence' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 italic">Evidence cited by proponents. Contested items are marked.</p>
                {theory.evidence.map((ev, i) => (
                  <div key={i} className="rounded-lg border border-white/5 overflow-hidden">
                    <button
                      onClick={() => setExpandedEvidence(expandedEvidence === i ? null : i)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <span>{evidenceTypeIcon(ev.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200">{ev.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500 capitalize">{ev.type}</span>
                          {ev.contested && (
                            <span className="text-xs text-amber-400/70 border border-amber-500/20 px-1.5 rounded-full">contested</span>
                          )}
                        </div>
                      </div>
                      {expandedEvidence === i ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                    </button>
                    {expandedEvidence === i && (
                      <div className="px-3 pb-3 pt-0 text-xs text-slate-400 leading-relaxed border-t border-white/5 bg-black/20">
                        {ev.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'criticisms' && (
              <div className="space-y-3">
                <p className="text-xs text-cyan-400/70 italic border border-cyan-500/20 rounded-lg p-3 bg-cyan-900/10">
                  ℹ️ Critical perspectives and counter-arguments to this theory.
                </p>
                {theory.criticisms.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3 p-3 rounded-lg bg-slate-900/40 border border-white/5"
                  >
                    <div className="text-red-400 mt-0.5 flex-shrink-0">✗</div>
                    <p className="text-slate-300 text-sm leading-relaxed">{c}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'mainstream' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-cyan-900/10 border border-cyan-500/20">
                  <h4 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
                    <BookOpen size={14} /> Mainstream / Academic Perspective
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{theory.mainstreamPerspective}</p>
                </div>
                <p className="text-xs text-slate-500 italic">
                  Presenting mainstream views does not invalidate alternative interpretations. We encourage readers to examine all perspectives critically.
                </p>
              </div>
            )}

            {activeTab === 'sources' && (() => {
              const graphSources = NODE_SOURCES[theory.id];
              const hasSources = graphSources && graphSources.length > 0;
              return (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 italic">
                    Curated academic sources. Credibility score reflects peer consensus (0–1).
                  </p>
                  {hasSources ? graphSources.map((src) => (
                    <div key={src.id} className="p-3 rounded-lg bg-slate-900/40 border border-white/5 hover:border-purple-500/20 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-200 leading-snug">&ldquo;{src.title}&rdquo;</div>
                          {src.author && <div className="text-xs text-slate-500 mt-0.5">by {src.author}</div>}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {src.publication_year && (
                              <span className="text-xs text-slate-600">
                                {src.publication_year < 0 ? `${Math.abs(src.publication_year)} BCE` : src.publication_year}
                              </span>
                            )}
                            <span className="text-xs text-purple-400/60">{src.source_type}</span>
                            {src.link_type === 'contradicts' && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-500/20">contradicts</span>
                            )}
                            <div className="flex items-center gap-0.5 ml-auto">
                              <Star size={9} className="text-yellow-500" />
                              <span className="text-xs text-yellow-500/70">{(src.credibility_score * 10).toFixed(1)}/10</span>
                            </div>
                          </div>
                          {src.notes && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{src.notes}</p>}
                          {src.url && (
                            <a href={src.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1.5 transition-colors">
                              <ExternalLink size={10} /> View source
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    theory.sources?.map((src, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-900/40 border border-white/5">
                        <div className="text-sm font-medium text-slate-200">&ldquo;{src.title}&rdquo;</div>
                        {src.author && <div className="text-xs text-slate-500 mt-0.5">by {src.author}</div>}
                        <div className="flex items-center gap-2 mt-1">
                          {src.year && <span className="text-xs text-slate-600">{src.year < 0 ? `${Math.abs(src.year)} BCE` : src.year}</span>}
                          <span className="text-xs text-purple-400/60 capitalize">{src.type?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>

        {relatedTheories.length > 0 && (
          <div className="border-t border-white/5 pt-5">
            <h4 className="text-xs font-bold text-slate-400 mb-3 tracking-widest uppercase">
              Related Theories
            </h4>
            <div className="flex flex-wrap gap-2">
              {relatedTheories.map(rel => (
                <motion.button
                  key={rel.id}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: rel.color + '22',
                    border: `1px solid ${rel.color}44`,
                    color: rel.color,
                  }}
                >
                  <span>{rel.icon}</span>
                  {rel.title}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-4 border-t border-purple-900/20 flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRabbitHole}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold transition-colors"
        >
          <Rabbit size={14} />
          Dive Deeper
        </motion.button>
      </div>
    </div>
  );
}
