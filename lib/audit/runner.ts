import { prisma } from '@/lib/db';
import { runAiAnalysis } from './ai-analysis';
import {
  checkOrphans, checkStaleEdges, checkWeakEdges,
  checkMissingFields, checkDuplicates, checkSourceQuality,
} from './rule-checks';
import type { AuditSettings } from './types';

export async function runAudit(runId: string, settings: AuditSettings): Promise<void> {
  try {
    type FindingInput = {
      runId: string; type: string; severity: string; status: string;
      nodeId: string | null; edgeId: string | null; title: string;
      description: string; beforeState: object; afterState: object;
      reasoning: string; autoFixable: boolean;
    };
    const allFindings: FindingInput[] = [];

    const [orphans, stale, weak, missing, dupes, sourceQ, aiFindings] = await Promise.all([
      settings.checks.orphans        ? checkOrphans()                                : Promise.resolve([]),
      settings.checks.staleEdges     ? checkStaleEdges()                             : Promise.resolve([]),
      settings.checks.weakEdges      ? checkWeakEdges(settings.weakEdgeThreshold)    : Promise.resolve([]),
      settings.checks.missingFields  ? checkMissingFields()                          : Promise.resolve([]),
      settings.checks.duplicates     ? checkDuplicates(settings.duplicateTitleThreshold) : Promise.resolve([]),
      settings.checks.sourceQuality  ? checkSourceQuality()                          : Promise.resolve([]),
      (settings.checks.aiQuality || settings.checks.categoryMismatch)
        ? runAiAnalysis(settings) : Promise.resolve([]),
    ]);

    const ruleFindings = [...orphans, ...stale, ...weak, ...missing, ...dupes, ...sourceQ];

    for (const f of ruleFindings) {
      allFindings.push({
        runId,
        type:        f.type,
        severity:    f.severity,
        status:      'pending',
        nodeId:      f.nodeId ?? null,
        edgeId:      f.edgeId ?? null,
        title:       f.title,
        description: f.description,
        beforeState: f.beforeState as object,
        afterState:  f.afterState  as object,
        reasoning:   f.reasoning,
        autoFixable: f.autoFixable,
      });
    }

    for (const f of aiFindings) {
      allFindings.push({
        runId,
        type:        f.type,
        severity:    f.severity,
        status:      'pending',
        nodeId:      f.nodeId ?? null,
        edgeId:      null,
        title:       f.title,
        description: f.description,
        beforeState: f.beforeState as object,
        afterState:  f.afterState  as object,
        reasoning:   f.reasoning,
        autoFixable: false,
      });
    }

    const capped = allFindings.slice(0, settings.maxFindingsPerRun);

    if (capped.length > 0) {
      await prisma.archiveAuditFinding.createMany({ data: capped });
    }

    // Auto-approve findings flagged for it
    const autoApproveTypes: string[] = [];
    if (settings.autoApproveOrphans)     autoApproveTypes.push('orphan');
    if (settings.autoApproveStaleEdges)  autoApproveTypes.push('stale_edge');
    if (settings.autoApproveWeakEdges)   autoApproveTypes.push('weak_edge');

    if (autoApproveTypes.length > 0) {
      await prisma.archiveAuditFinding.updateMany({
        where: { runId, type: { in: autoApproveTypes }, autoFixable: true },
        data:  { status: 'approved', reviewedBy: 'system', reviewedAt: new Date() },
      });
    }

    // Build summary
    const byType:     Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const f of capped) {
      byType[f.type]         = (byType[f.type]         ?? 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    }

    await prisma.archiveAuditRun.update({
      where: { id: runId },
      data: {
        status:      'complete',
        completedAt: new Date(),
        summary: {
          total:       capped.length,
          byType,
          bySeverity,
          autoFixable: capped.filter((f: FindingInput) => f.autoFixable).length,
        },
      },
    });
  } catch (e) {
    await prisma.archiveAuditRun.update({
      where: { id: runId },
      data: { status: 'failed', completedAt: new Date() },
    });
    throw e;
  }
}
