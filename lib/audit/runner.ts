import { prisma } from '@/lib/db';
import {
  checkOrphans, checkStaleEdges, checkWeakEdges,
  checkMissingFields, checkDuplicates, checkSourceQuality,
} from './rule-checks';
import { runAiAnalysis } from './ai-analysis';
import type { AuditSettings, AuditRunSummary } from './types';
import { DEFAULT_AUDIT_SETTINGS } from './types';

export async function runAudit(
  runId: string,
  settings: AuditSettings,
  scope: { mode?: string; nodeId?: string; nodeTitle?: string } = {},
): Promise<void> {
  try {
    const c = settings.checks;

    // ── 1. Rule-based checks — parallel DB queries, always fast ──────────────
    const [orphans, staleEdges, weakEdges, missingFields, duplicates, sourceQuality] =
      await Promise.all([
        c.orphans       ? checkOrphans()                                    : [],
        c.staleEdges    ? checkStaleEdges()                                 : [],
        c.weakEdges     ? checkWeakEdges(settings.weakEdgeThreshold)        : [],
        c.missingFields ? checkMissingFields()                              : [],
        c.duplicates    ? checkDuplicates(settings.duplicateTitleThreshold) : [],
        c.sourceQuality ? checkSourceQuality()                              : [],
      ]);

    const allRule = [...orphans, ...staleEdges, ...weakEdges,
                     ...missingFields, ...duplicates, ...sourceQuality];

    // Node audit: keep only findings that reference the targeted node
    const ruleFindings = scope.nodeId
      ? allRule.filter(f => f.nodeId === scope.nodeId)
      : allRule;

    // ── 2. AI analysis — optional, each batch has its own 20 s abort ─────────
    let aiFindings: Awaited<ReturnType<typeof runAiAnalysis>> = [];
    if (c.aiQuality || c.categoryMismatch) {
      const nodes = await prisma.node.findMany({
        where: scope.nodeId
          ? { id: scope.nodeId, status: 'published' }
          : { status: 'published' },
        select: {
          id: true, title: true, description: true, evidenceLevel: true,
          confidenceScore: true, mainstreamView: true,
          category: { select: { name: true } },
          _count:   { select: { claims: true, criticisms: true, tags: true } },
          tags:     { select: { tag: true } },
        },
        take: scope.nodeId ? 1 : settings.maxNodesPerAiRun,
      });
      aiFindings = await runAiAnalysis(nodes, settings);
    }

    // ── 3. Cap and shape findings ─────────────────────────────────────────────
    const cappedRule = ruleFindings.slice(0, Math.max(0, settings.maxFindingsPerRun - aiFindings.length));

    const toCreate = [
      ...cappedRule.map(f => ({
        runId,
        type: f.type, severity: f.severity,
        status: shouldAutoApprove(f.type, settings) ? 'approved' : 'pending',
        nodeId: f.nodeId ?? null, edgeId: f.edgeId ?? null,
        title: f.title, description: f.description,
        beforeState: f.beforeState, afterState: f.afterState,
        reasoning: f.reasoning, autoFixable: f.autoFixable,
      })),
      ...aiFindings.map(f => ({
        runId,
        type: f.type, severity: f.severity, status: 'pending' as const,
        nodeId: f.nodeId ?? null, edgeId: null,
        title: f.title, description: f.description,
        beforeState: f.beforeState, afterState: f.afterState,
        reasoning: f.reasoning, autoFixable: false,
      })),
    ];

    if (toCreate.length > 0) {
      await prisma.archiveAuditFinding.createMany({ data: toCreate });
    }

    // ── 4. Build summary and mark complete ────────────────────────────────────
    const byType:     Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let autoFixable = 0;
    for (const f of toCreate) {
      byType[f.type]         = (byType[f.type]         ?? 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
      if (f.autoFixable) autoFixable++;
    }

    // Diagnostic: raw per-check counts (before capping)
    const checksRan: Record<string, number> = {};
    if (c.orphans)       checksRan.orphans       = orphans.length;
    if (c.staleEdges)    checksRan.stale_edges    = staleEdges.length;
    if (c.weakEdges)     checksRan.weak_edges     = weakEdges.length;
    if (c.missingFields) checksRan.missing_fields = missingFields.length;
    if (c.duplicates)    checksRan.duplicates     = duplicates.length;
    if (c.sourceQuality) checksRan.source_quality = sourceQuality.length;

    const aiEnabled = c.aiQuality || c.categoryMismatch;
    const aiSkipped = aiEnabled && !process.env.ANTHROPIC_API_KEY;
    if (aiEnabled && !aiSkipped) checksRan.ai = aiFindings.length;

    const summary: AuditRunSummary = { total: toCreate.length, byType, bySeverity, autoFixable, checksRan, aiSkipped };

    await prisma.archiveAuditRun.update({
      where: { id: runId },
      data:  { status: 'complete', completedAt: new Date(), summary: summary as object },
    });

  } catch (err) {
    console.error('[audit-runner] runAudit failed:', err);
    await prisma.archiveAuditRun.update({
      where: { id: runId },
      data:  { status: 'failed', completedAt: new Date() },
    }).catch(() => {});
  }
}

function shouldAutoApprove(type: string, s: AuditSettings): boolean {
  return (type === 'orphan'     && s.autoApproveOrphans)
      || (type === 'stale_edge' && s.autoApproveStaleEdges)
      || (type === 'weak_edge'  && s.autoApproveWeakEdges);
}

export async function getOrCreateSettings(): Promise<AuditSettings> {
  const row = await prisma.systemConfig.findUnique({ where: { key: 'audit_settings' } });
  if (!row) return DEFAULT_AUDIT_SETTINGS;
  return { ...DEFAULT_AUDIT_SETTINGS, ...(row.value as Partial<AuditSettings>) };
}
