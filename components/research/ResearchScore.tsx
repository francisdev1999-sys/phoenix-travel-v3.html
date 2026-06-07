interface Props {
  score: number; // 0–100
}

export default function ResearchScore({ score }: Props) {
  const color = score >= 67 ? '#22c55e' : score >= 34 ? '#eab308' : '#ef4444';
  const label = score >= 67 ? 'High' : score >= 34 ? 'Medium' : 'Low';
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#1e293b" strokeWidth="4" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <div className="text-xs text-slate-500">Research Score</div>
        <div className="text-sm font-bold" style={{ color }}>{label} Quality</div>
      </div>
    </div>
  );
}
