'use client';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface Props {
  sourceQualityScore: number;
  approvedCount:      number;
  recommendation:     'ready' | 'needs_review' | 'not_ready';
  compact?:           boolean;
}

export default function SourceStrengthBadge({
  sourceQualityScore,
  approvedCount,
  recommendation,
  compact = false,
}: Props) {
  const pct = Math.round(sourceQualityScore * 100);

  if (recommendation === 'ready') {
    return (
      <span className={`inline-flex items-center gap-1 ${compact ? 'text-[10px]' : 'text-xs'} font-medium text-emerald-400`}>
        <ShieldCheck size={compact ? 10 : 12} />
        {compact ? `${pct}%` : `${approvedCount} source${approvedCount !== 1 ? 's' : ''} · ${pct}% strong`}
      </span>
    );
  }

  if (recommendation === 'needs_review') {
    return (
      <span className={`inline-flex items-center gap-1 ${compact ? 'text-[10px]' : 'text-xs'} font-medium text-amber-400`}>
        <ShieldAlert size={compact ? 10 : 12} />
        {compact ? `${pct}%` : `${approvedCount} source${approvedCount !== 1 ? 's' : ''} · needs review`}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${compact ? 'text-[10px]' : 'text-xs'} font-medium text-red-400`}>
      <ShieldX size={compact ? 10 : 12} />
      {compact ? 'Weak' : 'Sources insufficient'}
    </span>
  );
}
