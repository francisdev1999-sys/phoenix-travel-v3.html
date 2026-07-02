'use client';
/**
 * Anonymous engagement tracking — the raw signal the user-interest neuron
 * learns from. Fire-and-forget; never blocks or breaks the UI. No PII: an
 * ephemeral per-tab session id plus the topic id.
 *
 *   node_view      — a topic page was opened (any route into it)
 *   node_dive      — a topic was chosen from the Explore feed / search results
 *   connection_hop — a user followed a connection to another topic
 */

export type EngagementKind = 'node_view' | 'node_dive' | 'connection_hop';

function sessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('nexus_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2);
    sessionStorage.setItem('nexus_sid', sid);
  }
  return sid;
}

export function trackEngagement(kind: EngagementKind, nodeId: string): void {
  if (typeof window === 'undefined' || !nodeId) return;
  const payload = JSON.stringify({
    eventType: kind,
    sessionId: sessionId(),
    page:      window.location.hash.slice(1) || 'landing',
    meta:      { nodeId },
  });
  try {
    // sendBeacon survives navigation — ideal for click-then-leave events.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/beta/track', new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch { /* fall through */ }
  void fetch('/api/beta/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
