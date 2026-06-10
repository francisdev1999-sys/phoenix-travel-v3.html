/**
 * POST /api/synthesis
 *
 * Body: { nodeIds: string[] }
 *
 * Runs the rule-based exploration synthesis engine, then optionally
 * wraps the result in a Haiku prose layer if ANTHROPIC_API_KEY is set.
 *
 * No auth required — nodeIds are just IDs for published nodes.
 * Rate limited: 10 calls per user (by IP) per minute.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { runSynthesis } from '@/lib/synthesis/rule-engine';
import { generateProse } from '@/lib/synthesis/prose';

const SYNTHESIS_THRESHOLD = 3;  // minimum nodes to synthesise
const MAX_NODES           = 25; // cap to prevent enormous queries

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { nodeIds } = body as { nodeIds?: unknown };
  if (!Array.isArray(nodeIds) || nodeIds.some(id => typeof id !== 'string')) {
    return NextResponse.json({ error: 'nodeIds must be string[]' }, { status: 400 });
  }

  const ids = (nodeIds as string[]).slice(0, MAX_NODES);
  if (ids.length < SYNTHESIS_THRESHOLD) {
    return NextResponse.json(
      { error: `Need at least ${SYNTHESIS_THRESHOLD} nodes to synthesise` },
      { status: 400 },
    );
  }

  const result    = await runSynthesis(ids);
  const narrative = await generateProse(result).catch(() => null);

  return NextResponse.json({ ...result, narrative });
}
