import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { runNodeDiscovery } from '@/lib/discovery/node-engine';

async function handler(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runNodeDiscovery({ maxNodes: 14 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = withCronTracking('node-discovery', handler);
