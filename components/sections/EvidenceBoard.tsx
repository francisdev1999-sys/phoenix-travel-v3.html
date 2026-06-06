'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pin, FileText, Image, MapPin, Link2, AlertTriangle } from 'lucide-react';
import { theories } from '@/lib/data/theories';
import { Theory, EvidenceItem } from '@/lib/types';

const PIN_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];
const NOTE_ROTATIONS = [-3, -1, 1, 2, -2, 0, 3, -1.5];

interface EvidenceCard {
  id: string;
  type: 'note' | 'photo' | 'document' | 'map';
  title: string;
  content: string;
  theory: Theory;
  evidence?: EvidenceItem;
  pinColor: string;
  rotation: number;
  x: number;
  y: number;
  connected?: string[];
}

export default function EvidenceBoard() {
  const [selectedTheory, setSelectedTheory] = useState<Theory>(theories[0]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const cards: EvidenceCard[] = selectedTheory.evidence.map((ev, i) => ({
    id: `${selectedTheory.id}-${i}`,
    type: ev.type === 'artifact' ? 'photo' : ev.type === 'text' ? 'document' : ev.type === 'site' ? 'map' : 'note',
    title: ev.title,
    content: ev.description,
    theory: selectedTheory,
    evidence: ev,
    pinColor: PIN_COLORS[i % PIN_COLORS.length],
    rotation: NOTE_ROTATIONS[i % NOTE_ROTATIONS.length],
    x: 10 + (i % 3) * 30 + Math.random() * 5,
    y: 10 + Math.floor(i / 3) * 40 + Math.random() * 5,
    connected: i > 0 ? [`${selectedTheory.id}-${i - 1}`] : [],
  }));

  const claimCards: EvidenceCard[] = selectedTheory.mainClaims.slice(0, 3).map((claim, i) => ({
    id: `claim-${i}`,
    type: 'note',
    title: `Claim ${i + 1}`,
    content: claim,
    theory: selectedTheory,
    pinColor: '#8b5cf6',
    rotation: NOTE_ROTATIONS[(i + 4) % NOTE_ROTATIONS.length],
    x: 70 + (i % 2) * 15,
    y: 10 + i * 30,
    connected: [],
  }));

  const allCards = [...cards, ...claimCards];

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'photo': return <Image size={14} className="text-cyan-400" />;
      case 'document': return <FileText size={14} className="text-yellow-400" />;
      case 'map': return <MapPin size={14} className="text-green-400" />;
      default: return <FileText size={14} className="text-purple-400" />;
    }
  };

  const getCardColor = (type: string) => {
    switch(type) {
      case 'photo': return 'bg-slate-800 border-slate-600';
      case 'document': return 'bg-amber-950/80 border-amber-800/50';
      case 'map': return 'bg-green-950/80 border-green-800/50';
      default: return 'bg-yellow-950/80 border-yellow-700/50';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-purple-900/20 flex items-center gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Pin size={18} className="text-red-400" />
            Evidence Board
          </h2>
          <p className="text-xs text-slate-500">Detective-style research board</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {theories.slice(0, 8).map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTheory(t); setSelectedCard(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
              style={{
                borderColor: selectedTheory.id === t.id ? t.color + '80' : 'rgba(255,255,255,0.1)',
                background: selectedTheory.id === t.id ? t.color + '25' : 'transparent',
                color: selectedTheory.id === t.id ? t.color : '#64748b',
              }}
            >
              {t.icon} {t.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" style={{ background: '#0d0d1a' }}>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {allCards.map(card =>
            card.connected?.map(connId => {
              const connCard = allCards.find(c => c.id === connId);
              if (!connCard) return null;
              const srcX = `${card.x + 8}%`;
              const srcY = `${card.y + 6}%`;
              const dstX = `${connCard.x + 8}%`;
              const dstY = `${connCard.y + 6}%`;
              return (
                <line
                  key={`${card.id}-${connId}`}
                  x1={srcX} y1={srcY}
                  x2={dstX} y2={dstY}
                  stroke="rgba(239, 68, 68, 0.3)"
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
              {card.evidence?.contested && (
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
                  <div className="text-xs text-purple-400">{selectedTheory.title}</div>
                  {card.evidence && (
                    <div className="text-xs text-slate-500 capitalize mt-0.5">
                      Type: {card.evidence.type}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}

        <div className="absolute top-4 right-4 z-20 glass rounded-xl p-4 max-w-[200px]">
          <div className="text-2xl mb-1">{selectedTheory.icon}</div>
          <div className="text-xs font-black text-white">{selectedTheory.title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{selectedTheory.category}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs px-1.5 rounded bg-purple-900/30 text-purple-400">
              {cards.length} evidence items
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
