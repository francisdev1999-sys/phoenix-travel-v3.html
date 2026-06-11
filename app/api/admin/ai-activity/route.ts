/**
 * GET /api/admin/ai-activity
 *
 * Aggregates all AI feature activity for the owner dashboard.
 * Returns recent entries and monthly stats for every Claude-powered feature.
 * Owner-only — exposes cost data.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const monthStart = () => {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
};

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const start = monthStart();
  const apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY;

  const [
    // Proposal audits
    auditTotal,
    auditMonth,
    recentAudits,

    // Deep research reviews
    reviewTotal,
    reviewMonth,
    reviewCostRows,
    recentReviews,

    // Semantic suggestions
    semanticTotal,
    semanticMonth,
    semanticPending,
    recentSemantic,

    // Rabbit-hole narratives
    narrativeTotal,
    narrativeMonth,
    recentNarratives,
  ] = await Promise.all([
    // ── Proposal audits ──────────────────────────────────────────────────────
    prisma.proposedNode.count({ where: { aiAuditedAt: { not: null } } }),
    prisma.proposedNode.count({ where: { aiAuditedAt: { gte: start } } }),
    prisma.proposedNode.findMany({
      where:   { aiAuditedAt: { not: null } },
      orderBy: { aiAuditedAt: 'desc' },
      take:    8,
      select: {
        id: true, label: true, category: true, evidenceLevel: true,
        aiAuditResult: true, aiAuditedAt: true, status: true,
        submitter: { select: { name: true } },
      },
    }),

    // ── Deep research reviews ─────────────────────────────────────────────
    prisma.aiResearchReview.count(),
    prisma.aiResearchReview.count({ where: { createdAt: { gte: start } } }),
    prisma.aiResearchReview.findMany({
      where:  { createdAt: { gte: start } },
      select: { estimatedCost: true },
    }),
    prisma.aiResearchReview.findMany({
      orderBy: { createdAt: 'desc' },
      take:    8,
      select:  {
        id: true, createdAt: true, model: true,
        inputTokens: true, outputTokens: true, estimatedCost: true,
        node: { select: { id: true, title: true } },
        creator: { select: { name: true } },
      },
    }),

    // ── Semantic suggestions ──────────────────────────────────────────────
    prisma.relationshipSuggestion.count({ where: { generationMethod: 'ai_semantic' } }),
    prisma.relationshipSuggestion.count({ where: { generationMethod: 'ai_semantic', createdAt: { gte: start } } }),
    prisma.relationshipSuggestion.count({ where: { generationMethod: 'ai_semantic', status: 'pending' } }),
    prisma.relationshipSuggestion.findMany({
      where:   { generationMethod: 'ai_semantic' },
      orderBy: { createdAt: 'desc' },
      take:    8,
      select:  {
        id: true, createdAt: true, status: true,
        relationshipType: true, confidenceScore: true, riskLevel: true, reason: true,
        fromNode: { select: { id: true, title: true } },
        toNode:   { select: { id: true, title: true } },
      },
    }),

    // ── Rabbit-hole narratives ────────────────────────────────────────────
    prisma.nodeNarrative.count(),
    prisma.nodeNarrative.count({ where: { cachedAt: { gte: start } } }),
    prisma.nodeNarrative.findMany({
      orderBy: { cachedAt: 'desc' },
      take:    8,
      select:  {
        nodeId: true, model: true, cachedAt: true,
        narrative: true,
        node: { select: { id: true, title: true } },
      },
    }),
  ]);

  // Proposal audit cost comes from aiAuditResult JSON
  const recentAuditsWithCost = recentAudits.map(a => {
    const result = a.aiAuditResult as Record<string, unknown> | null;
    return {
      id:           a.id,
      label:        a.label,
      category:     a.category,
      evidenceLevel: a.evidenceLevel,
      status:       a.status,
      aiAuditedAt:  a.aiAuditedAt,
      submitterName: a.submitter?.name ?? null,
      qualityScore: (result?.quality_score as number) ?? null,
      recommendation: (result?.recommendation as string) ?? null,
      flagCount:    Array.isArray(result?.flags) ? (result.flags as unknown[]).length : 0,
      model:        (result?.model as string) ?? null,
      estimatedCost: (result?.estimated_cost_usd as number) ?? null,
    };
  });

  const auditCostMonth = recentAuditsWithCost
    .filter(a => a.aiAuditedAt && new Date(a.aiAuditedAt) >= start)
    .reduce((sum, a) => sum + (a.estimatedCost ?? 0), 0);

  const reviewCostMonth = reviewCostRows.reduce((sum, r) => sum + r.estimatedCost, 0);

  return NextResponse.json({
    apiKeyConfigured,
    monthStart:  start.toISOString(),
    totalCostThisMonth: Math.round((auditCostMonth + reviewCostMonth) * 100000) / 100000,

    features: {
      proposalAudit: {
        totalAllTime: auditTotal,
        thisMonth:    auditMonth,
        costThisMonth: Math.round(auditCostMonth * 100000) / 100000,
        model:         'claude-haiku-4-5',
        trigger:       'Every node submission (fire-and-forget)',
        recentItems:   recentAuditsWithCost,
      },
      deepResearchReview: {
        totalAllTime:  reviewTotal,
        thisMonth:     reviewMonth,
        costThisMonth: Math.round(reviewCostMonth * 100000) / 100000,
        model:         'claude-sonnet-4-6',
        trigger:       'Manual admin trigger per node',
        recentItems:   recentReviews.map(r => ({
          id:            r.id,
          createdAt:     r.createdAt,
          model:         r.model,
          inputTokens:   r.inputTokens,
          outputTokens:  r.outputTokens,
          estimatedCost: r.estimatedCost,
          nodeId:        r.node.id,
          nodeTitle:     r.node.title,
          createdBy:     r.creator?.name ?? null,
        })),
      },
      semanticSuggestions: {
        totalAllTime: semanticTotal,
        thisMonth:    semanticMonth,
        pending:      semanticPending,
        model:        'claude-opus-4-8',
        trigger:      'Every node publish (fire-and-forget)',
        recentItems:  recentSemantic.map(s => ({
          id:               s.id,
          createdAt:        s.createdAt,
          status:           s.status,
          relationshipType: s.relationshipType,
          confidenceScore:  s.confidenceScore,
          riskLevel:        s.riskLevel,
          reason:           s.reason.slice(0, 150),
          fromTitle:        s.fromNode.title,
          toTitle:          s.toNode.title,
        })),
      },
      rabbitHoleNarratives: {
        totalAllTime: narrativeTotal,
        thisMonth:    narrativeMonth,
        model:        'claude-opus-4-8',
        trigger:      'First explore per node (cached 30 days)',
        recentItems:  recentNarratives.map(n => ({
          nodeId:    n.nodeId,
          nodeTitle: n.node.title,
          model:     n.model,
          cachedAt:  n.cachedAt,
          preview:   n.narrative.slice(0, 200),
        })),
      },
    },
  });
}
