import { motion } from 'framer-motion';

interface Props {
  claims: string[];
  type?: 'claim' | 'criticism' | 'question';
}

const STYLES = {
  claim: { icon: '', color: '#7c3aed', bg: 'bg-purple-900/10', border: 'border-purple-500/10' },
  criticism: { icon: '✗', color: '#ef4444', bg: 'bg-red-900/10', border: 'border-red-500/10' },
  question: { icon: '?', color: '#06b6d4', bg: 'bg-cyan-900/10', border: 'border-cyan-500/10' },
};

export default function ClaimBlock({ claims, type = 'claim' }: Props) {
  const style = STYLES[type];

  if (claims.length === 0) {
    return <p className="text-xs text-slate-600 italic">None recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {claims.map((claim, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className={`flex gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
        >
          {type === 'claim' ? (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold"
              style={{ background: style.color + '25', color: style.color, border: `1px solid ${style.color}40` }}
            >
              {i + 1}
            </div>
          ) : (
            <div className="text-sm flex-shrink-0 mt-0.5" style={{ color: style.color }}>
              {style.icon}
            </div>
          )}
          <p className="text-slate-300 text-sm leading-relaxed">{claim}</p>
        </motion.div>
      ))}
    </div>
  );
}
