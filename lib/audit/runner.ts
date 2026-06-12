import { prisma } from '@/lib/db';
import {
  checkOrphans,
  checkStaleEdges,
  checkWeakEdges,
  checkMissingFields,
  checkDuplicates,
  checkSourceQuality,
} from './rule-checks';
import { runAiAnalysis } from './ai-analysis';
import type { AuditSettings, AuditRunSummary } from './types';
import { DEFAULT_AUDIT_SETTINGS } from './types';

export async function runAudit(runId: string, settings: AuditSettings): Promise<void> {
  // Hard 90-second ceiling — prevents any hung network call from blocking forever
  const timer = setTimeout(async () => {
    console.error('[audit-runner] hard timeout reached for run', runId);
    await prisma.archiveAuditRun.update({
      where: { id: runId },
      data: { status: 'failed', completedAt: new Date() },
    }).catch(() => {});
  }, 90_000);

  try {
    const checks = settings.checks;

    // Run all rule-based checks in parallel
    const [
      orphans,
      staleEdges,
      weakEdges,
      missingFields,
      duplicates,
      sourceQuality,
    ] = await Promise.all([
      checks.orphans       ? checkOrphans()                                     : Promise.resolve([]),
      checks.staleEdges    ? checkStaleEdges()                                  : Promise.resolve([]),
      checks.weakEdges     ? checkWeakEdges(settings.weakEdgeThreshold)         : Promise.resolve([]),
      checks.missingFields ? checkMissingFields()                               : Promise.resolve([]),
      checks.duplicates    ? checkDuplicates(settings.duplicateTitleThreshold)  : Promise.resolve([]),
      checks.sourceQuality ? checkSourceQuality()                               : Promise.resolve([]),
    ]);

    // AI checks — fetch nodes then analyze
    let aiFindings: Awaited<ReturnType<typeof runAiAnalysis>> = [];
    if (checks.aiQuality || checks.categoryMismatch) {
      const nodes = await prisma.node.findMany({
        where: { status: 'published' },
        select: {
          id: true,
          title: true,
          description: true,
          evidenceLevel: true,
          confidenceScore: true,
          mainstreamView: true,
          category: { select: { name: true } },
          _count: { select: { claims: true, criticisms: true, tags: true } },
          tags: { select: { tag: true } },
        },
        take: settings.maxNodesPerAiRun,
      });
      aiFindings = await runAiAnalysis(nodes, settings);
    }

    // Merge all findings
    const allRuleFindings = [
      ...orphans,
      ...staleEdges,
      ...weakEdges,
      ...missingFields,
      ...duplicates,
      ...sourceQuality,
    ];

    // Cap at maxFindingsPerRun
    const capped = allRuleFindings.slice(0, Math.max(0, settings.maxFindingsPerRun - aiFindings.length));

    // Determine auto-approve status per finding
    const toCreate = [
      ...capped.map(f => ({
        runId,
        type:        f.type,
        severity:    f.severity,
        status:      shouldAutoApprove(f.type, settings) ? 'approved' : 'pending',
        nodeId:      f.nodeId ?? null,
        edgeId:      f.edgeId ?? null,
        title:       f.title,
        description: f.description,
        beforeState: f.beforeState,
        afterState:  f.afterState,
        reasoning:   f.reasoning,
        autoFixable: f.autoFixable,
      })),
      ...aiFindings.map(f => ({
        runId,
        type:        f.type,
        severity:    f.severity,
        status:      'pending' as const,
        nodeId:      f.nodeId ?? null,
        edgeId:      null,
        title:       f.title,
        description: f.description,
        beforeState: f.beforeState,
        afterState:  f.afterState,
        reasoning:   f.reasoning,
        autoFixable: false,
      })),
    ];

    if (toCreate.length > 0) {
      await prisma.archiveAuditFinding.createMany({ data: toCreate });
    }

    // Build summary
    const byType: Record<string, number>     = {};
    const bySeverity: Record<string, number> = {};
    let autoFixable = 0;

    for (const f of toCreate) {
      byType[f.type]         = (byType[f.type] ?? 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
      if (f.autoFixable) autoFixable++;
    }

    const summary: AuditRunSummary = {
      total:    toCreate.length,
      byType,
      bySeverity,
      autoFixable,
    };

    await prisma.archiveAuditRun.update({
      where: { id: runId },
      data:  { status: 'complete', completedAt: new Date(), summary: summary as object },
    });
  } catch (err) {
    console.error('[audit-runner] failed:', err);
    await prisma.archiveAuditRun.update({
      where: { id: runId },
      data:  { status: 'failed', completedAt: new Date() },
    }).catch(() => {/* best-effort */});
  } finally {
    clearTimeout(timer);
  }
}

function shouldAutoApprove(type: string, settings: AuditSettings): boolean {
  if (type === 'orphan'      && settings.autoApproveOrphans)    return true;
  if (type === 'stale_edge'  && settings.autoApproveStaleEdges) return true;
  if (type === 'weak_edge'   && settings.autoApproveWeakEdges)  return true;
  return false;
}

export async function getOrCreateSettings(): Promise<AuditSettings> {
  const row = await prisma.systemConfig.findUnique({ where: { key: 'audit_settings' } });
  if (!row) return DEFAULT_AUDIT_SETTINGS;
  return { ...DEFAULT_AUDIT_SETTINGS, ...(row.value as Partial<AuditSettings>) };
}
