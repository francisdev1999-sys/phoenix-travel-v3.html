/**
 * Pure display utilities for trust scores — no DB imports, safe for client components.
 */

export function trustLevel(score: number): string {
  if (score <= 20) return 'Restricted';
  if (score <= 50) return 'Standard';
  if (score <= 75) return 'Trusted';
  if (score <= 90) return 'Verified Contributor';
  return 'Expert Contributor Candidate';
}

export function trustColor(score: number): string {
  if (score <= 20) return 'text-red-400';
  if (score <= 50) return 'text-amber-400';
  if (score <= 75) return 'text-cyan-400';
  if (score <= 90) return 'text-emerald-400';
  return 'text-purple-400';
}
