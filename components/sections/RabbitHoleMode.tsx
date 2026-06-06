'use client';
import { motion } from 'framer-motion';
import { Rabbit, ChevronRight, RotateCcw } from 'lucide-react';
import { theories, getRelatedTheories } from '@/lib/data/theories';
import { useUserStore } from '@/lib/store/userStore';
import { Theory } from '@/lib/types';

interface Props {
  onSelectTheory: (theory: Theory) => void;
}

export default function RabbitHoleMode({ onSelectTheory }: Props) {
  const { rabbitHoleChain, extendRabbitHole, resetRabbitHole } = useUserStore();

  const chainTheories = rabbitHoleChain.map(id => theories.find(t => t.id === id)).filter(Boolean) as Theory[];
  const currentTheory = chainTheories[chainTheories.length - 1];
  const suggestions = currentTheory
    ? getRelatedTheories(currentTheory.id).filter(t => !rabbitHoleChain.includes(t.id)).slice(0, 4)
    : [];

  if (rabbitHoleChain.length === 0) {
    return (
      <div className="p-6 text-center space-y-3">
        <Rabbit size={32} className="text-purple-400 mx-auto animate-bounce" />
        <p className="text-sm text-slate-400">
          Select a theory and click <span className="text-purple-300 font-bold">Dive Deeper</span> to start a rabbit hole
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
          <Rabbit size={16} />
          Rabbit Hole — Depth {rabbitHoleChain.length}
        </div>
        <button
          onClick={resetRabbitHole}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      <div className="space-y-1">
        {chainTheories.map((theory, i) => (
          <motion.div
            key={theory.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2"
          >
            {i > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-px h-3 bg-purple-500/30" />
              </div>
            )}
            <button
              onClick={() => onSelectTheory(theory)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full text-left border ${
                i === chainTheories.length - 1
                  ? 'bg-purple-900/40 border-purple-500/40 text-purple-300'
                  : 'bg-slate-900/30 border-white/5 text-slate-400'
              }`}
            >
              <span>{theory.icon}</span>
              <span className="flex-1">{theory.title}</span>
              {i === chainTheories.length - 1 && (
                <span className="text-xs text-purple-400">← current</span>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="border-t border-white/5 pt-4">
          <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
            <ChevronRight size={12} />
            Go deeper into...
          </div>
          <div className="space-y-2">
            {suggestions.map((theory, i) => (
              <motion.button
                key={theory.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => {
                  extendRabbitHole(theory.id);
                  onSelectTheory(theory);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border border-white/5 hover:border-purple-500/30 bg-slate-900/30 hover:bg-purple-900/20"
              >
                <span className="text-lg">{theory.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">{theory.title}</div>
                  <div className="text-xs text-slate-500 truncate">{theory.category}</div>
                </div>
                <ChevronRight size={12} className="text-purple-400" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && rabbitHoleChain.length > 0 && (
        <div className="text-center text-xs text-slate-500 py-4">
          <div className="text-2xl mb-2">🌀</div>
          You&apos;ve reached the bottom of this rabbit hole.
          <br />
          <button onClick={resetRabbitHole} className="text-purple-400 hover:text-purple-300 mt-2 block mx-auto">
            Start a new one?
          </button>
        </div>
      )}
    </div>
  );
}
