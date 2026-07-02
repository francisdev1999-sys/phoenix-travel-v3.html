export const dynamic = 'force-dynamic';
/**
 * GET /api/admin/learning
 *
 * Surfaces the adaptive node-promotion model for the admin panel: the active
 * model + its learned feature weights, the version/accuracy history (so you can
 * watch it improve), recent learned decisions and how they turned out, and the
 * real-world precision of the learned auto-approve lane.
 *
 * Auth: admin or owner (enforced by /api/admin/* middleware).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  LEARNING_KIND, EDGE_LEARNING_KIND, INTEREST_LEARNING_KIND, isModelMature,
  MIN_EXAMPLES_FOR_AUTHORITY, MIN_ACCURACY_FOR_AUTHORITY, LEARNED_AUTO_APPROVE_THRESHOLD,
} from '@/lib/learning/scorer';
import { getEngagementScores } from '@/lib/learning/interest';

export async function GET() {
  const [active, edgeActive, interestActive, history, recentPredictions, resolved, edgeResolved] = await Promise.all([
    prisma.learningModel.findFirst({
      where: { kind: LEARNING_KIND, active: true },
      orderBy: { version: 'desc' },
    }),
    prisma.learningModel.findFirst({
      where: { kind: EDGE_LEARNING_KIND, active: true },
      orderBy: { version: 'desc' },
    }),
    prisma.learningModel.findFirst({
      where: { kind: INTEREST_LEARNING_KIND, active: true },
      orderBy: { version: 'desc' },
    }),
    prisma.learningModel.findMany({
      where:   { kind: LEARNING_KIND },
      orderBy: { version: 'desc' },
      take:    20,
      select:  { version: true, accuracy: true, precision: true, recall: true, auc: true, exampleCount: true, trainedAt: true },
    }),
    prisma.learningPrediction.findMany({
      where:   { kind: LEARNING_KIND },
      orderBy: { createdAt: 'desc' },
      take:    25,
      select:  { id: true, entityId: true, score: true, decision: true, outcome: true, createdAt: true, resolvedAt: true },
    }),
    prisma.learningPrediction.findMany({
      where:   { kind: LEARNING_KIND, decision: 'learned_auto_approved', outcome: { not: 'pending' } },
      select:  { outcome: true },
    }),
    prisma.learningPrediction.findMany({
      where:   { kind: EDGE_LEARNING_KIND, decision: 'learned_auto_approved', outcome: { not: 'pending' } },
      select:  { outcome: true },
    }),
  ]);

  const weights = active
    ? active.features.map((name, i) => ({ name, weight: active.weights[i] ?? 0 }))
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    : [];

  const [autoApprovedTotal, edgeAutoApprovedTotal] = await Promise.all([
    prisma.learningPrediction.count({
      where: { kind: LEARNING_KIND, decision: 'learned_auto_approved' },
    }),
    prisma.learningPrediction.count({
      where: { kind: EDGE_LEARNING_KIND, decision: 'learned_auto_approved' },
    }),
  ]);
  const survived = resolved.filter(r => r.outcome === 'approved_survived').length;
  const livePrecision = resolved.length ? survived / resolved.length : null;
  const edgeSurvived = edgeResolved.filter(r => r.outcome === 'approved_survived').length;

  const edgeWeights = edgeActive
    ? edgeActive.features.map((name, i) => ({ name, weight: edgeActive.weights[i] ?? 0 }))
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    : [];

  // ── Audience intelligence: live engagement + interest-neuron summary ────────
  const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [counts24h, weekScores] = await Promise.all([
    prisma.usageEvent.groupBy({
      by:     ['eventType'],
      where:  { eventType: { in: ['node_view', 'node_dive', 'connection_hop'] }, createdAt: { gte: h24 } },
      _count: { _all: true },
    }).catch(() => [] as { eventType: string; _count: { _all: number } }[]),
    getEngagementScores(7).catch(() => new Map<string, number>()),
  ]);
  const topIds = [...weekScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topNodes = topIds.length
    ? await prisma.node.findMany({
        where:  { id: { in: topIds.map(([id]) => id) } },
        select: { id: true, title: true },
      }).catch(() => [])
    : [];
  const titleById = new Map(topNodes.map(n => [n.id, n.title]));
  const engagement = {
    last24h: Object.fromEntries(counts24h.map(c => [c.eventType, c._count._all])),
    topTopics: topIds.map(([id, score]) => ({ id, title: titleById.get(id) ?? id, score })),
    engagedNodes7d: weekScores.size,
  };

  const interestWeights = interestActive
    ? interestActive.features.map((name, i) => ({ name, weight: interestActive.weights[i] ?? 0 }))
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    : [];

  return NextResponse.json({
    thresholds: {
      minExamples:        MIN_EXAMPLES_FOR_AUTHORITY,
      minAccuracy:        MIN_ACCURACY_FOR_AUTHORITY,
      autoApproveConfidence: LEARNED_AUTO_APPROVE_THRESHOLD,
    },
    active: active && {
      version:       active.version,
      trainedAt:     active.trainedAt,
      bias:          active.bias,
      exampleCount:  active.exampleCount,
      positiveCount: active.positiveCount,
      negativeCount: active.negativeCount,
      accuracy:      active.accuracy,
      precision:     active.precision,
      recall:        active.recall,
      auc:           active.auc,
      mature:        isModelMature({
        exampleCount:  active.exampleCount,
        positiveCount: active.positiveCount,
        negativeCount: active.negativeCount,
        accuracy:      active.accuracy,
        id: active.id, weights: active.weights, bias: active.bias,
      }),
      weights,
    },
    history: history.reverse(),
    autoApprove: {
      total:         autoApprovedTotal,
      resolved:      resolved.length,
      survived,
      livePrecision,
    },
    edge: edgeActive && {
      version:       edgeActive.version,
      trainedAt:     edgeActive.trainedAt,
      bias:          edgeActive.bias,
      exampleCount:  edgeActive.exampleCount,
      positiveCount: edgeActive.positiveCount,
      negativeCount: edgeActive.negativeCount,
      accuracy:      edgeActive.accuracy,
      precision:     edgeActive.precision,
      recall:        edgeActive.recall,
      auc:           edgeActive.auc,
      mature:        isModelMature({
        exampleCount:  edgeActive.exampleCount,
        positiveCount: edgeActive.positiveCount,
        negativeCount: edgeActive.negativeCount,
        accuracy:      edgeActive.accuracy,
        id: edgeActive.id, weights: edgeActive.weights, bias: edgeActive.bias,
      }),
      weights: edgeWeights,
      autoApprove: {
        total:         edgeAutoApprovedTotal,
        resolved:      edgeResolved.length,
        survived:      edgeSurvived,
        livePrecision: edgeResolved.length ? edgeSurvived / edgeResolved.length : null,
      },
    },
    interest: interestActive && {
      version:       interestActive.version,
      trainedAt:     interestActive.trainedAt,
      bias:          interestActive.bias,
      exampleCount:  interestActive.exampleCount,
      positiveCount: interestActive.positiveCount,
      negativeCount: interestActive.negativeCount,
      accuracy:      interestActive.accuracy,
      precision:     interestActive.precision,
      recall:        interestActive.recall,
      auc:           interestActive.auc,
      weights:       interestWeights,
    },
    engagement,
    recentPredictions,
  });
}
