'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, GitBranch, AlertCircle, Globe, Clock, Link2, HelpCircle, FileText, Rabbit, MapPin } from 'lucide-react';
import {
  GraphNode, getEdgesForNode, getNode, getRelatedEdges, getTimelineNeighbors,
  getGeographicNeighbors, computeResearchScore, CATEGORY_COLORS, EVIDENCE_LABELS,
} from '@/lib/graph';
import { useUserStore } from '@/lib/store/userStore';
import EvidenceBadge from '@/components/research/EvidenceBadge';
import ConfidenceMeter from '@/components/research/ConfidenceMeter';
import ResearchScore from '@/components/research/ResearchScore';
import SourceCard from '@/components/research/SourceCard';
import RelationshipCard from '@/components/research/RelationshipCard';
import ClaimBlock from '@/components/research/ClaimBlock';

type Tab = 'overview' | 'claims' | 'criticisms' | 'mainstream' | 'relationships' | 'sources' | 'questions';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',       label: 'Overview',       icon: BookOpen },
  { id: 'claims',         label: 'Claims',         icon: GitBranch },
  { id: 'criticisms',     label: 'Criticisms',     icon: AlertCircle },
  { id: 'mainstream',     label: 'Mainstream',     icon: Globe },
  { id: 'relationships',  label: 'Connections',    icon: Link2 },
  { id: 'sources',        label: 'Sources',        icon: FileText },
  { id: 'questions',      label: 'Questions',      icon: HelpCircle },
];

interface Props {
  node: GraphNode;
  onClose: () => void;
}

function formatYear(y: number): string {
  if (y < 0) return `${Math.abs(y).toLocaleString()} BCE`;
  if (y === 0) return '1 CE';
  return `${y} CE`;
}

export default function NodePanel({ node, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { startRabbitHole, setCurrentView } = useUserStore();
  const researchScore = computeResearchScore(node);
  const relatedEdges = getRelatedEdges(node.id);
  const timelineNeighbors = getTimelineNeighbors(node.id);
  const geoNeighbors = getGeographicNeighbors(node.id);
  const nodeColor = node.color ?? CATEGORY_COLORS[node.category] ?? '#7c3aed';

  const { setRabbitHoleNodeId } = useUserStore();

  const handleRabbitHole = () => {
    startRabbitHole(node.id);
    setRabbitHoleNodeId(node.id);
    setCurrentView('rabbit-hole');
    onClose();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 sm:p-5 border-b border-purple-900/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl">{node.icon ?? '◈'}</span>
              <span className="text-xs tracking-widest uppercase font-medium" style={{ color: nodeColor + 'cc' }}>
                {node.category}
              </span>
            </div>
            <h2 className="text-xl font-black text-white leading-tight">{node.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <EvidenceBadge level={node.evidence_level} />
              {node.year !== undefined && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={10} /> {formatYear(node.year)}
                </span>
              )}
              {node.country && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin size={10} /> {node.region ? `${node.region}, ` : ''}{node.country}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {node.tags.slice(0, 6).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-purple-900/20">
        <div className="flex overflow-x-auto scrollbar-hide px-2 pt-2 gap-0.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-purple-300 border-purple-500 bg-purple-900/20'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {/* @ts-expect-error lucide size */}
                <Icon size={10} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >

            {activeTab === 'overview' && (
              <>
                <p className="text-slate-300 text-sm leading-relaxed">{node.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <ResearchScore score={researchScore} />
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                    <ConfidenceMeter score={node.confidence_score} label="Source Confidence" />
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                    <div className="text-xs text-slate-500 mb-1">Connections</div>
                    <div className="text-lg font-black text-white">{relatedEdges.length}</div>
                    <div className="text-xs text-slate-600">linked nodes</div>
                  </div>
                </div>

                {(node.date_start !== undefined || node.year !== undefined) && (
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Clock size={10} /> Timeline
                    </div>
                    {node.date_start !== undefined && node.date_end !== undefined ? (
                      <div className="text-xs text-slate-300">
                        {formatYear(node.date_start)} — {formatYear(node.date_end)}
                        {node.date_precision && <span className="text-slate-600 ml-1">({node.date_precision} precision)</span>}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300">
                        {node.year !== undefined ? formatYear(node.year) : '—'}
                      </div>
                    )}
                  </div>
                )}

                {timelineNeighbors.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Timeline Neighbors</div>
                    <div className="flex flex-wrap gap-2">
                      {timelineNeighbors.map(n => (
                        <div key={n.id} className="text-xs px-2 py-1 rounded-lg bg-slate-900/40 border border-white/5 text-slate-400">
                          {n.icon} {n.title} {n.year !== undefined && <span className="text-slate-600">({formatYear(n.year)})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {geoNeighbors.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Geographic Neighbors</div>
                    <div className="flex flex-wrap gap-2">
                      {geoNeighbors.map(n => (
                        <div key={n.id} className="text-xs px-2 py-1 rounded-lg bg-slate-900/40 border border-white/5 text-slate-400">
                          {n.icon} {n.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'claims' && (
              <>
                <div className="p-3 rounded-lg bg-amber-900/10 border border-amber-500/20 text-xs text-amber-400/80 italic">
                  ⚠ The following are claims made by proponents — not established facts.
                </div>
                <ClaimBlock claims={node.claims} type="claim" />
              </>
            )}

            {activeTab === 'criticisms' && (
              <>
                <div className="p-3 rounded-lg bg-cyan-900/10 border border-cyan-500/20 text-xs text-cyan-400/80 italic">
                  ℹ Critical perspectives and counter-arguments.
                </div>
                <ClaimBlock claims={node.criticisms} type="criticism" />
              </>
            )}

            {activeTab === 'mainstream' && (
              <div className="p-4 rounded-xl bg-cyan-900/10 border border-cyan-500/20 space-y-2">
                <div className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <Globe size={14} /> Academic / Mainstream View
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{node.mainstream_view}</p>
                <p className="text-xs text-slate-600 italic mt-2">
                  Presenting mainstream views does not invalidate alternative interpretations.
                </p>
              </div>
            )}

            {activeTab === 'relationships' && (
              <>
                <p className="text-xs text-slate-500">
                  {relatedEdges.length} documented relationship{relatedEdges.length !== 1 ? 's' : ''} — sorted by confidence.
                </p>
                {relatedEdges.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No relationships documented yet.</p>
                ) : (
                  <div className="space-y-3">
                    {relatedEdges.map(({ edge, neighbor }) => (
                      <RelationshipCard
                        key={edge.id}
                        edge={edge}
                        neighbor={neighbor}
                        direction={edge.from === node.id ? 'to' : 'from'}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'sources' && (
              <>
                {(!node.sources || node.sources.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
                    <div className="text-slate-600 text-sm">No sources catalogued yet.</div>
                    <div className="text-xs text-slate-700 mt-1">Sources will appear here as the archive is expanded.</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {node.sources.map(src => (
                      <SourceCard key={src.id} source={src} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'questions' && (
              <>
                <p className="text-xs text-slate-500 italic">Open questions — areas of active debate or incomplete understanding.</p>
                {(!node.open_questions || node.open_questions.length === 0) ? (
                  <p className="text-xs text-slate-600 italic">No open questions recorded.</p>
                ) : (
                  <ClaimBlock claims={node.open_questions} type="question" />
                )}
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-purple-900/20">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRabbitHole}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold transition-colors"
        >
          <Rabbit size={14} />
          Dive Deeper
        </motion.button>
      </div>
    </div>
  );
}
