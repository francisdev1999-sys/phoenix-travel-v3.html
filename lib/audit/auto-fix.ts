import { prisma } from '@/lib/db';
import type { AuditFinding } from './types';

export interface ApplyResult {
  success: boolean;
  error?:  string;
}

export async function applyFix(finding: AuditFinding): Promise<ApplyResult> {
  try {
    switch (finding.type) {
      case 'orphan':        return applyOrphan(finding);
      case 'stale_edge':    return applyStaleEdge(finding);
      case 'weak_edge':     return applyWeakEdge(finding);
      case 'missing_fields':return applyMissingFields(finding);
      case 'source_quality':return applySourceQuality(finding);
      // duplicate, ai_quality, category_mismatch → manual review only
      default:
        return { success: false, error: `No auto-fix for type "${finding.type}"` };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function applyOrphan(finding: AuditFinding): Promise<ApplyResult> {
  if (!finding.nodeId) return { success: false, error: 'No nodeId' };
  await prisma.node.update({
    where: { id: finding.nodeId },
    data: { adminReviewStatus: 'review_required' },
  });
  return { success: true };
}

async function applyStaleEdge(finding: AuditFinding): Promise<ApplyResult> {
  if (!finding.edgeId) return { success: false, error: 'No edgeId' };
  await prisma.edge.update({
    where: { id: finding.edgeId },
    data: { status: 'draft' },
  });
  return { success: true };
}

async function applyWeakEdge(finding: AuditFinding): Promise<ApplyResult> {
  if (!finding.edgeId) return { success: false, error: 'No edgeId' };
  const edge = await prisma.edge.findUnique({ where: { id: finding.edgeId }, select: { confidenceScore: true } });
  if (!edge) return { success: false, error: 'Edge not found' };
  // Only auto-move to draft if score is very low (< 0.15); higher scores just flag
  if (edge.confidenceScore < 0.15) {
    await prisma.edge.update({ where: { id: finding.edgeId }, data: { status: 'draft' } });
  }
  return { success: true };
}

async function applyMissingFields(finding: AuditFinding): Promise<ApplyResult> {
  if (!finding.nodeId) return { success: false, error: 'No nodeId' };
  await prisma.node.update({
    where: { id: finding.nodeId },
    data: { adminReviewStatus: 'needs_enrichment' },
  });
  return { success: true };
}

async function applySourceQuality(finding: AuditFinding): Promise<ApplyResult> {
  if (!finding.nodeId) return { success: false, error: 'No nodeId' };
  await prisma.node.update({
    where: { id: finding.nodeId },
    data: { adminReviewStatus: 'needs_enrichment' },
  });
  return { success: true };
}
