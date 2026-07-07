'use client';
/**
 * Bridges the localStorage-backed engagement store to the server for signed-in
 * users. On sign-in it hydrates once (conservative merge — never loses local
 * progress), then mirrors every change back with a debounced POST. Anonymous
 * visitors keep everything in localStorage and this component is a no-op.
 *
 * Mounted once inside the app shell.
 */
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useEngagement } from '@/lib/store/engagementStore';

export default function EngagementSync() {
  const { status } = useSession();
  const hydrate = useEngagement(s => s.hydrate);
  const didHydrate = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate once when authenticated.
  useEffect(() => {
    if (status !== 'authenticated' || didHydrate.current) return;
    didHydrate.current = true;
    fetch('/api/user/engagement')
      .then(r => (r.ok ? r.json() : null))
      .then(server => { if (server) hydrate(server); })
      .catch(() => {});
  }, [status, hydrate]);

  // Debounced mirror of every store change (only while authenticated).
  useEffect(() => {
    if (status !== 'authenticated') return;
    const unsub = useEngagement.subscribe(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const snap = useEngagement.getState().snapshot();
        void fetch('/api/user/engagement', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(snap),
        }).catch(() => {});
      }, 1500);
    });
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [status]);

  return null;
}
