import { EvidenceLevel, EVIDENCE_LABELS, EVIDENCE_COLORS } from '@/lib/graph';

const ICONS: Record<EvidenceLevel, string> = {
  verified: '✓',
  strong_evidence: '◈',
  debated: '⚖',
  speculative: '?',
  mythological: '◯',
};

interface Props {
  level: EvidenceLevel;
  size?: 'sm' | 'md';
}

export default function EvidenceBadge({ level, size = 'md' }: Props) {
  const color = EVIDENCE_COLORS[level];
  const label = EVIDENCE_LABELS[level];
  const icon = ICONS[level];
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold tracking-wide border ${px}`}
      style={{ color, borderColor: color + '50', background: color + '15' }}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
}
