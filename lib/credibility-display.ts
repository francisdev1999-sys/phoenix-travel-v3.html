import { GraphNode, EvidenceLevel } from './graph/types';

export interface CredibilityOptions {
  showSpeculative:  boolean;
  showMythological: boolean;
  showUnverified:   boolean;  // speculative nodes with 0 sources
  minConfidence:    number;   // 0–1
  minSourceCount:   number;   // integer
}

export const DEFAULT_PUBLIC_OPTIONS: CredibilityOptions = {
  showSpeculative:  true,
  showMythological: true,
  showUnverified:   false,
  minConfidence:    0,
  minSourceCount:   0,
};

export interface CredibilityDisplay {
  badge:               string;
  badgeColor:          string;
  badgeBg:             string;
  opacity:             number;
  warningLabel:        string | null;
  isUnverified:        boolean;
  sourceCount:         number;
  avgSourceCredibility: number; // 0–1
}

export const EVIDENCE_CFG: Record<EvidenceLevel, {
  badge: string; color: string; bg: string; opacity: number; warning: string | null;
}> = {
  verified: {
    badge:   'Verified',
    color:   '#22c55e',
    bg:      '#22c55e1a',
    opacity: 1.0,
    warning: null,
  },
  strong_evidence: {
    badge:   'Strong Evidence',
    color:   '#06b6d4',
    bg:      '#06b6d41a',
    opacity: 1.0,
    warning: null,
  },
  debated: {
    badge:   'Debated',
    color:   '#eab308',
    bg:      '#eab3081a',
    opacity: 1.0,
    warning: 'Interpretation contested among researchers',
  },
  speculative: {
    badge:   'Speculative',
    color:   '#f59e0b',
    bg:      '#f59e0b1a',
    opacity: 0.45,
    warning: 'Limited or indirect evidence — not verified',
  },
  mythological: {
    badge:   'Mythological',
    color:   '#ef4444',
    bg:      '#ef44441a',
    opacity: 0.65,
    warning: 'Cultural or traditional source only',
  },
};

export function isValidCoordinate(
  coords: [number, number] | undefined,
): coords is [number, number] {
  if (!coords) return false;
  const [lat, lon] = coords;
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  );
}

export function getCredibilityDisplay(node: GraphNode): CredibilityDisplay {
  const cfg         = EVIDENCE_CFG[node.evidence_level];
  const sourceCount = node.sources?.length ?? 0;
  const isUnverified =
    sourceCount === 0 &&
    node.evidence_level === 'speculative';

  const avgSourceCredibility =
    sourceCount > 0
      ? node.sources!.reduce((s, src) => s + src.credibility_score, 0) / sourceCount
      : 0;

  return {
    badge:               cfg.badge,
    badgeColor:          cfg.color,
    badgeBg:             cfg.bg,
    opacity:             isUnverified ? 0.3 : cfg.opacity,
    warningLabel:        cfg.warning,
    isUnverified,
    sourceCount,
    avgSourceCredibility,
  };
}

export function nodePassesFilter(node: GraphNode, opts: CredibilityOptions): boolean {
  const { sourceCount, isUnverified } = getCredibilityDisplay(node);
  const level = node.evidence_level;

  if (!opts.showSpeculative  && level === 'speculative')  return false;
  if (!opts.showMythological && level === 'mythological') return false;
  if (!opts.showUnverified   && isUnverified)             return false;
  if (node.confidence_score  < opts.minConfidence)        return false;
  if (sourceCount            < opts.minSourceCount)       return false;
  return true;
}

export function getAppearanceReason(node: GraphNode): string {
  const sourceCount = node.sources?.length ?? 0;
  const hasCoords   = isValidCoordinate(node.coordinates);
  const coordStr    = hasCoords
    ? `confirmed coordinates (${node.coordinates![0].toFixed(2)}°, ${node.coordinates![1].toFixed(2)}°)`
    : 'no verified coordinates on file';

  switch (node.evidence_level) {
    case 'verified':
      return (
        `${node.title} appears here because it is a verified archaeological or historical subject with ` +
        `${sourceCount > 0 ? `${sourceCount} published source${sourceCount !== 1 ? 's' : ''}` : 'documented evidence'} ` +
        `and ${coordStr}. Its inclusion is based on published records, not interpretive claims.`
      );

    case 'strong_evidence':
      return (
        `${node.title} is supported by strong evidence from ` +
        `${sourceCount > 0 ? `${sourceCount} credible source${sourceCount !== 1 ? 's' : ''}` : 'credible records'}. ` +
        `Its inclusion reflects broad scholarly acceptance. ` +
        (hasCoords ? 'Coordinates are academically established.' : '')
      );

    case 'debated':
      return (
        `${node.title} is an actively debated subject — researchers disagree on its interpretation, ` +
        `origin, or significance. It appears here to represent that scholarly debate, not as a resolved conclusion. ` +
        (hasCoords
          ? 'Coordinates reflect the most cited proposed location, which may itself be contested.'
          : 'No universally accepted coordinates exist.')
      );

    case 'speculative':
      return (
        `${node.title} is a speculative hypothesis with limited or indirect evidence. ` +
        (hasCoords
          ? 'This marker does not confirm the claim occurred at this location. The coordinates are proposed, not archaeologically verified. '
          : 'No verified coordinates are associated with this hypothesis. ') +
        'Included for research context only — clearly labelled as unverified.'
      );

    case 'mythological':
      return (
        `${node.title} is drawn from cultural tradition, mythology, or religious narrative. ` +
        (hasCoords
          ? 'Any associated coordinates are symbolic or traditional — not archaeologically confirmed sites. '
          : 'No verified coordinates are associated with this tradition. ') +
        'Included for comparative research purposes, not as a factual location claim.'
      );

    default:
      return `${node.title} is included for research context.`;
  }
}
