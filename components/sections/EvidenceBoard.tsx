'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pin, FileText, MapPin, AlertTriangle } from 'lucide-react';
import { nodes } from '@/lib/graph/nodes';
import { GraphNode } from '@/lib/graph/types';

const PIN_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];
const NOTE_ROTATIONS = [-3, -1, 1, 2, -2, 0, 3, -1.5];

interface EvidenceCard {
  id: string;
  type: 'note' | 'document' | 'map';
  title: string;
  content: string;
  contested?: boolean;
  pinColor: string;
  rotation: number;
  x: number;
  y: number;
  connected?: string[];
}

function buildCards(node: GraphNode): EvidenceCard[] {
  const result: EvidenceCard[] = [];

  // Overview
  result.push({
    id: `${node.id}-overview`,
    type: 'document',
    title: 'Overview',
    content: node.description,
    pinColor: '#3b82f6',
    rotation: -1,
    x: 2, y: 5,
    connected: [],
  });

  // Claims
  node.claims.slice(0, 4).forEach((claim, i) => {
    result.push({
      id: `${node.id}-claim-${i}`,
      type: 'note',
      title: `Claim ${i + 1}`,
      content: claim,
      pinColor: PIN_COLORS[i % PIN_COLORS.length],
      rotation: NOTE_ROTATIONS[i % NOTE_ROTATIONS.length],
      x: 2 + (i % 2) * 36,
      y: 42 + Math.floor(i / 2) * 34,
      connected: i === 0 ? [`${node.id}-overview`] : [],
    });
  });

  // Criticisms
  node.criticisms.slice(0, 2).forEach((crit, i) => {
    result.push({
      id: `${node.id}-crit-${i}`,
      type: 'note',
      title: 'Criticism',
      content: crit,
      contested: true,
      pinColor: '#ef4444',
      rotation: NOTE_ROTATIONS[(i + 3) % NOTE_ROTATIONS.length],
      x: 73 + i * 2,
      y: 12 + i * 38,
      connected: [],
    });
  });

  // Mainstream view
  if (node.mainstream_view) {
    result.push({
      id: `${node.id}-mainstream`,
      type: 'document',
      title: 'Mainstream View',
      content: node.mainstream_view,
      pinColor: '#22c55e',
      rotation: 1,
      x: 38, y: 5,
      connected: [`${node.id}-overview`],
    });
  }

  // Sources
  node.sources?.slice(0, 2).forEach((src, i) => {
    result.push({
      id: `${node.id}-src-${i}`,
      type: 'document',
      title: src.title,
      content: [src.source_type, src.author, src.publication_year].filter(Boolean).join(' · '),
      pinColor: '#8b5cf6',
      rotation: NOTE_ROTATIONS[(i + 5) % NOTE_ROTATIONS.length],
      x: 73,
      y: 62 + i * 24,
      connected: [],
    });
  });

  return result;
}

export default function EvidenceBoard() {
  const [selectedNode, setSelectedNode] = useState<GraphNode>(nodes[0]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const allCards = buildCards(selectedNode);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText size={14} className="text-yellow-400" />;
      case 'map':      return <MapPin size={14} className="text-green-400" />;
      default:         return <FileText size={14} className="text-purple-400" />;
    }
  };

  const getCardColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-amber-950/80 border-amber-800/50';
      case 'map':      return 'bg-green-950/80 border-green-800/50';
      default:         return 'bg-yellow-950/80 border-yellow-700/50';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-purple-900/20 flex items-center gap-4 flex-wrap">
        <div className="flex-shrink-0">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Pin size={18} className="text-red-400" />
            Evidence Board
          </h2>
          <p className="text-xs text-slate-500">{nodes.length} nodes · detective-style research board</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {nodes.map(n => (
            <button
              key={n.id}
              onClick={() => { setSelectedNode(n); setSelectedCard(null); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
              style={{
                borderColor: selectedNode.id === n.id ? (n.color ?? '#7c3aed') + '80' : 'rgba(255,255,255,0.1)',
                background:  selectedNode.id === n.id ? (n.color ?? '#7c3aed') + '25' : 'transparent',
                color:       selectedNode.id === n.id ? (n.color ?? '#7c3aed') : '#64748b',
              }}
            >
              {n.icon ?? '◈'} {n.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" style={{ background: '#0d0d1a' }}>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }} />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {allCards.map(card =>
            card.connected?.map(connId => {
              const connCard = allCards.find(c => c.id === connId);
              if (!connCard) return null;
              return (
                <line
                  key={`${card.id}-${connId}`}
                  x1={`${card.x + 8}%`} y1={`${card.y + 6}%`}
                  x2={`${connCard.x + 8}%`} y2={`${connCard.y + 6}%`}
                  stroke="rgba(239,68,68,0.3)"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
              );
            })
          )}
        </svg>

        {allCards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ scale: 0, rotate: card.rotation }}
            animate={{ scale: 1, rotate: selectedCard === card.id ? 0 : card.rotation }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
            drag
            dragMomentum={false}
            style={{
              position: 'absolute',
              left: `${card.x}%`,
              top: `${card.y}%`,
              zIndex: selectedCard === card.id ? 10 : 2,
              width: selectedCard === card.id ? '280px' : '180px',
            }}
            className="cursor-pointer"
            onClick={() => setSelectedCard(selectedCard === card.id ? null : card.id)}
          >
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white/30 z-10"
              style={{ background: card.pinColor, boxShadow: `0 0 8px ${card.pinColor}` }}
            />

            <div className={`rounded-lg p-3 border shadow-xl ${getCardColor(card.type)} relative`}>
              {card.contested && (
                <div className="flex items-center gap-1 mb-1.5 text-xs text-amber-400">
                  <AlertTriangle size={10} />
                  <span>Contested</span>
                </div>
              )}

              <div className="flex items-start gap-2 mb-2">
                {getTypeIcon(card.type)}
                <div className="text-xs font-bold text-white line-clamp-2">{card.title}</div>
              </div>

              <p className={`text-xs text-slate-300 leading-relaxed ${selectedCard === card.id ? '' : 'line-clamp-3'}`}>
                {card.content}
              </p>

              {selectedCard === card.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 pt-2 border-t border-white/10"
                >
                  <div className="text-xs text-purple-400">{selectedNode.title}</div>
                  <div className="text-xs text-slate-500 capitalize mt-0.5">
                    {selectedNode.evidence_level.replace('_', ' ')}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}

        <div className="absolute top-4 right-4 z-20 glass rounded-xl p-4 max-w-[200px]">
          <div className="text-2xl mb-1">{selectedNode.icon ?? '◈'}</div>
          <div className="text-xs font-black text-white">{selectedNode.title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{selectedNode.category}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs px-1.5 rounded bg-purple-900/30 text-purple-400">
              {allCards.length} cards
            </span>
            <span className="text-xs px-1.5 rounded bg-slate-900/50 text-slate-500 capitalize">
              {selectedNode.evidence_level.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 text-xs text-slate-600 space-y-0.5">
          <div>👆 Click to expand card</div>
          <div>🔀 Drag to rearrange</div>
        </div>
      </div>
    </div>
  );
}
