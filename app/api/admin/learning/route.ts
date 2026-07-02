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
  LEARNING_KIND, isModelMature,
  MIN_EXAMPLES_FOR_AUTHORITY, MIN_ACCURACY_FOR_AUTHORITY, LEARNED_AUTO_APPROVE_THRESHOLD,
} from '@/lib/learning/scorer';

export async function GET() {
  const [active, history, recentPredictions, resolved] = await Promise.all([
    prisma.learningModel.findFirst({
      where: { kind: LEARNING_KIND, active: true },
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
  ]);

  const weights = active
    ? active.features.map((name, i) => ({ name, weight: active.weights[i] ?? 0 }))
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    : [];

  const autoApprovedTotal = await prisma.learningPrediction.count({
    where: { kind: LEARNING_KIND, decision: 'learned_auto_approved' },
  });
  const survived = resolved.filter(r => r.outcome === 'approved_survived').length;
  const livePrecision = resolved.length ? survived / resolved.length : null;

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
    recentPredictions,
  });
}
