/**
 * Deterministic daily rotation: every visitor sees the SAME mystery on a given
 * day, and it changes at UTC midnight. Pure so it's unit-testable.
 */
export function dailyIndex(dayNumber: number, total: number): number {
  if (total <= 0) return 0;
  // Multiply by a large prime so consecutive days jump around the list instead
  // of walking it in insertion order.
  return Math.abs((dayNumber * 2654435761) % total);
}

export function currentDayNumber(now = Date.now()): number {
  return Math.floor(now / 86_400_000);
}
