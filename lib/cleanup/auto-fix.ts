/**
 * Guarded auto-fix for AI cleanup-audit findings — closes the daily quality
 * loop without an admin click, under hard guards:
 *
 *   - ARCHIVE only. Never delete, never blacklist — those stay human-only.
 *     (Archiving is a reversible status change; a NodeVersion snapshot is
 *     written first and every action lands in the audit log.)
 *   - High confidence only (>= 0.85).
 *   - Nodes: only weakly-connected (< 3 published edges — never rip out a hub)
 *     and only if published for >= 7 days (young nodes haven't had a chance to
 *     earn their connections yet).
 *   - Sources: only if linked to <= 2 nodes.
 *   - Hard cap per run, so a bad audit batch can't mass-archive the graph.
 */

import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { emit } from '@/lib/orchestration/emit';

const MIN_CONFIDENCE     = 0.85;
const MAX_APPLIES_PER_RUN = 5;
const MAX_NODE_DEGREE     = 2;   // strictly less than 3 edges
const MIN_NODE_AGE_DAYS   = 7;
const MAX_SOURCE_LINKS    = 2;

export interface AutoFixResult {
  considered: number;
  archived:   { itemType: string; itemId: string; title: string }[];
  skipped:    { itemId: string; reason: string }[];
}

export async function autoApplySafeFindings(auditRunId: string): Promise<AutoFixResult> {
  const findings = await prisma.cleanupFinding.findMany({
    where: {
      auditRunId,
      status:         'open',
      classification: 'ARCHIVE_CANDIDATE',
      confidence:     { gte: MIN_CONFIDENCE },
    },
    orderBy: { confidence: 'desc' },
    select:  { id: true, itemType: true, itemId: true, title: true, confidence: true, reasons: true },
  });

  const result: AutoFixResult = { considered: findings.length, archived: [], skipped: [] };
  const cutoff = new Date(Date.now() - MIN_NODE_AGE_DAYS * 24 * 60 * 60 * 1000);

  for (const f of findings) {
    if (result.archived.length >= MAX_APPLIES_PER_RUN) {
      result.skipped.push({ itemId: f.itemId, reason: 'per-run cap reached' });
      continue;
    }

    try {
      if (f.itemType === 'node') {
        const node = await prisma.node.findUnique({
          where:  { id: f.itemId },
          select: {
            id: true, status: true, version: true, createdAt: true,
            _count: { select: { edgesFrom: { where: { status: 'published' } }, edgesTo: { where: { status: 'published' } } } },
          },
        });
        if (!node || node.status !== 'published') {
          result.skipped.push({ itemId: f.itemId, reason: 'not a published node' });
          continue;
        }
        const degree = node._count.edgesFrom + node._count.edgesTo;
        if (degree > MAX_NODE_DEGREE) {
          result.skipped.push({ itemId: f.itemId, reason: `degree ${degree} > ${MAX_NODE_DEGREE}` });
          continue;
        }
        if (node.createdAt > cutoff) {
          result.skipped.push({ itemId: f.itemId, reason: 'younger than 7 days' });
          continue;
        }

        await prisma.$transaction([
          prisma.nodeVersion.create({
            data: {
              nodeId:     node.id,
              version:    node.version,
              snapshot:   { status: 'published' },
              changeNote: `Auto-archived by cleanup auto-fix (confidence ${f.confidence.toFixed(2)})`,
            },
          }),
          prisma.node.update({
            where: { id: node.id },
            data:  { status: 'archived', version: { increment: 1 } },
          }),
          prisma.cleanupFinding.update({
            where: { id: f.id },
            data:  { status: 'resolved', resolvedBy: 'auto-fix', resolvedAt: new Date() },
          }),
        ]);
        await emit('node.archived', {
          entityType: 'node',
          entityId:   node.id,
          metadata:   { origin: 'cleanup-auto-fix', findingId: f.id, confidence: f.confidence },
        }).catch(() => {});
      } else if (f.itemType === 'source') {
        const source = await prisma.source.findUnique({
          where:  { id: f.itemId },
          select: { id: true, status: true, _count: { select: { links: true } } },
        });
        if (!source || source.status === 'archived') {
          result.skipped.push({ itemId: f.itemId, reason: 'missing or already archived' });
          continue;
        }
        if (source._count.links > MAX_SOURCE_LINKS) {
          result.skipped.push({ itemId: f.itemId, reason: `linked to ${source._count.links} nodes` });
          continue;
        }

        await prisma.$transaction([
          prisma.source.update({ where: { id: source.id }, data: { status: 'archived' } }),
          prisma.cleanupFinding.update({
            where: { id: f.id },
            data:  { status: 'resolved', resolvedBy: 'auto-fix', resolvedAt: new Date() },
          }),
        ]);
        await emit('source.archived', {
          entityType: 'source',
          entityId:   source.id,
          metadata:   { origin: 'cleanup-auto-fix', findingId: f.id, confidence: f.confidence },
        }).catch(() => {});
      } else {
        result.skipped.push({ itemId: f.itemId, reason: `unknown itemType ${f.itemType}` });
        continue;
      }

      await writeAuditLog({
        action:     'cleanup_auto_fix_archive',
        entityType: f.itemType,
        entityId:   f.itemId,
        detail:     { findingId: f.id, title: f.title, confidence: f.confidence, reasons: f.reasons },
      });
      result.archived.push({ itemType: f.itemType, itemId: f.itemId, title: f.title });
    } catch (err) {
      result.skipped.push({ itemId: f.itemId, reason: `error: ${String(err)}` });
    }
  }

  return result;
}
