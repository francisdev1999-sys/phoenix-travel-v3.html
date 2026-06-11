import { prisma } from '@/lib/db';
import type { AuditFinding } from './types';

export interface ApplyResult { success: boolean; error?: string; }

export async function applyFix(finding: AuditFinding): Promise<ApplyResult> {
  try {
    switch (finding.type) {
      case 'orphan': {
        if (!finding.nodeId) return { success: false, error: 'No nodeId' };
        await prisma.node.update({ where: { id: finding.nodeId }, data: { adminReviewStatus: 'review_required' } });
        return { success: true };
      }
      case 'stale_edge': {
        if (!finding.edgeId) return { success: false, error: 'No edgeId' };
        await prisma.edge.update({ where: { id: finding.edgeId }, data: { status: 'draft' } });
        return { success: true };
      }
      case 'weak_edge': {
        if (!finding.edgeId) return { success: false, error: 'No edgeId' };
        const edge = await prisma.edge.findUnique({ where: { id: finding.edgeId }, select: { confidenceScore: true } });
        if (!edge) return { success: false, error: 'Edge not found' };
        if (edge.confidenceScore < 0.15) {
          await prisma.edge.update({ where: { id: finding.edgeId }, data: { status: 'draft' } });
        }
        return { success: true };
      }
      case 'missing_fields':
      case 'source_quality': {
        if (!finding.nodeId) return { success: false, error: 'No nodeId' };
        await prisma.node.update({ where: { id: finding.nodeId }, data: { adminReviewStatus: 'needs_enrichment' } });
        return { success: true };
      }
      default:
        return { success: false, error: `No auto-fix for type "${finding.type}"` };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
