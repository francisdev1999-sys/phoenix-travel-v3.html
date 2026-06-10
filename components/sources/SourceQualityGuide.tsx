'use client';
import { QUALITY_TIER_GROUPS, QUALITY_TIER_LABELS, type QualityTier } from '@/lib/taxonomy/source-types';

const STARS: Record<QualityTier, string> = {
  5: '★★★★★',
  4: '★★★★☆',
  3: '★★★☆☆',
  2: '★★☆☆☆',
  1: '★☆☆☆☆',
};

const STAR_COLORS: Record<QualityTier, string> = {
  5: '#22c55e',
  4: '#10b981',
  3: '#eab308',
  2: '#f59e0b',
  1: '#ef4444',
};

export default function SourceQualityGuide() {
  return (
    <div className="rounded-xl border border-purple-900/30 bg-white/2 overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-purple-900/20">
        <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
          How Source Quality Works
        </p>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {([5, 4, 3, 2, 1] as QualityTier[]).map(tier => (
          <div key={tier} className="flex items-start gap-2.5">
            <span className="text-[10px] font-mono leading-none mt-0.5 shrink-0"
              style={{ color: STAR_COLORS[tier] }}>
              {STARS[tier]}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-300 leading-none mb-0.5">
                {QUALITY_TIER_LABELS[tier]}
              </p>
              <p className="text-[9px] text-slate-500 leading-snug">
                {QUALITY_TIER_GROUPS[tier].join(' · ')}
              </p>
            </div>
          </div>
        ))}
        <p className="text-[9px] text-slate-600 mt-1 border-t border-purple-900/20 pt-2">
          Higher-quality sources generally receive faster approval.
        </p>
      </div>
    </div>
  );
}
