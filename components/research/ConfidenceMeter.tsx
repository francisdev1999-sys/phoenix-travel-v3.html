interface Props {
  score: number; // 0–1
  label?: string;
  showValue?: boolean;
}

export default function ConfidenceMeter({ score, label = 'Confidence', showValue = true }: Props) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? '#22c55e' : pct >= 45 ? '#eab308' : '#ef4444';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{label}</span>
        {showValue && <span className="text-xs font-bold" style={{ color }}>{pct}%</span>}
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
