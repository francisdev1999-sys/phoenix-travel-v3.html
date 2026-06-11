/**
 * GET /api/import/batch/:batchId/integrity
 *
 * Runs a structural integrity check on every node in the batch.
 * Returns per-node flags — does NOT modify any data.
 *
 * Checks:
 *   no_claims              — zero claim records
 *   no_criticisms          — zero criticism records
 *   no_sources             — zero source links
 *   no_mainstream_view     — mainstreamView is null/empty
 *   evidence_mismatch      — verified evidence + confidence < 0.6
 *                         OR speculative/mythological + confidence > 0.85
 *   incomplete_content     — description < 100 chars
 *
 * Admin-only.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type IntegrityFlag =
  | 'no_claims'
  | 'no_criticisms'
  | 'no_sources'
  | 'no_mainstream_view'
  | 'evidence_mismatch'
  | 'incomplete_content';

export interface NodeIntegrityResult {
  nodeId:    string;
  title:     string;
  status:    string;
  flags:     IntegrityFlag[];
  riskLevel: 'ok' | 'warning' | 'critical';
}

export interface BatchIntegrityReport {
  batchId:       string;
  checkedAt:     string;
  nodeCount:     number;
  okCount:       number;
  warningCount:  number;
  criticalCount: number;
  nodes:         NodeIntegrityResult[];
  disclaimer:    string;
}

type Params = { params: Promise<{ batchId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { batchId } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const batch = await prisma.importBatch.findUnique({
    where:   { id: batchId },
    include: {
      nodes: {
        include: {
          claims:        { select: { id: true } },
          criticisms:    { select: { id: true } },
          openQuestions: { select: { id: true } },
          sourceLinks:   { select: { id: true } },
        },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  const results: NodeIntegrityResult[] = batch.nodes.map(node => {
    const flags: IntegrityFlag[] = [];

    if (node.claims.length === 0)         flags.push('no_claims');
    if (node.criticisms.length === 0)     flags.push('no_criticisms');
    if (node.sourceLinks.length === 0)    flags.push('no_sources');
    if (!node.mainstreamView?.trim())     flags.push('no_mainstream_view');
    if ((node.description ?? '').length < 100) flags.push('incomplete_content');

    const ev   = node.evidenceLevel;
    const conf = node.confidenceScore;
    if ((ev === 'verified' || ev === 'strong_evidence') && conf < 0.6) flags.push('evidence_mismatch');
    if ((ev === 'speculative' || ev === 'mythological') && conf > 0.85) flags.push('evidence_mismatch');

    const critical = flags.filter(f =>
      f === 'no_claims' || f === 'no_criticisms' || f === 'evidence_mismatch'
    ).length;
    const riskLevel = critical > 0 ? 'critical' : flags.length > 0 ? 'warning' : 'ok';

    return { nodeId: node.id, title: node.title, status: node.status, flags, riskLevel };
  });

  const report: BatchIntegrityReport = {
    batchId,
    checkedAt:    new Date().toISOString(),
    nodeCount:    results.length,
    okCount:      results.filter(r => r.riskLevel === 'ok').length,
    warningCount: results.filter(r => r.riskLevel === 'warning').length,
    criticalCount:results.filter(r => r.riskLevel === 'critical').length,
    nodes:        results,
    disclaimer:   'Integrity flags indicate structural completeness issues only — not factual accuracy. All decisions require human review.',
  };

  return NextResponse.json(report);
}
