/**
 * The nightly learning pass.
 *
 * 1. Build the labeled dataset from approval/survival history.
 * 2. Warm-start from the current active model's weights and continue training
 *    (so the model *evolves* rather than resetting each night).
 * 3. Evaluate on a held-out split; save a new active model version.
 * 4. Resolve outstanding LearningPredictions against their real outcomes so the
 *    dashboard can show how the model performs on decisions it actually made.
 */

import { prisma } from '@/lib/db';
import { buildNodePromotionDataset } from '@/lib/learning/dataset';
import { train, evaluate, type TrainExample } from '@/lib/learning/model';
import { FEATURE_NAMES, FEATURE_COUNT } from '@/lib/learning/features';
import { LEARNING_KIND, getActiveModel } from '@/lib/learning/scorer';

// ── Auto-retrain: fire as new labeled data accumulates in the archive ─────────
// New published/archived/rejected items become training signal; once enough new
// examples land (and a min interval has passed) the model retrains itself.
const AUTO_RETRAIN_MIN_NEW_EXAMPLES = 20;
const AUTO_RETRAIN_MIN_INTERVAL_MS  = 3 * 60 * 60 * 1000; // 3h — don't thrash
let   autoTrainInFlight = false;

/**
 * Cheap gate + background retrain, meant to be called fire-and-forget from the
 * orchestration layer whenever the archive grows. Retrains only when there's
 * meaningfully more labeled data than the active model saw, and not too often.
 * Safe to call constantly — it no-ops until the thresholds are crossed.
 */
export async function maybeAutoTrain(): Promise<void> {
  if (autoTrainInFlight) return;

  const active = await prisma.learningModel.findFirst({
    where:   { kind: LEARNING_KIND, active: true },
    orderBy: { version: 'desc' },
    select:  { exampleCount: true, trainedAt: true },
  }).catch(() => null);

  const [pub, arch, rejP, rejD] = await Promise.all([
    prisma.node.count({ where: { status: 'published' } }),
    prisma.node.count({ where: { status: { in: ['archived', 'deleted'] } } }),
    prisma.proposedNode.count({ where: { status: 'rejected' } }),
    prisma.discoveredNode.count({ where: { status: { in: ['rejected', 'dismissed'] } } }),
  ]).catch(() => [0, 0, 0, 0]);

  const negatives = arch + rejP + rejD;
  if (pub === 0 || negatives === 0) return; // need both classes to learn

  // Mirror the dataset's class-balancing so the count is comparable to the
  // model's stored exampleCount.
  const positives = Math.min(pub, Math.max(50, negatives * 3));
  const currentExamples = positives + negatives;

  if (active) {
    if (currentExamples - active.exampleCount < AUTO_RETRAIN_MIN_NEW_EXAMPLES) return;
    if (Date.now() - new Date(active.trainedAt).getTime() < AUTO_RETRAIN_MIN_INTERVAL_MS) return;
  } else if (currentExamples < MIN_EXAMPLES_TO_TRAIN) {
    return;
  }

  autoTrainInFlight = true;
  try {
    await runLearningPass();
  } catch {
    /* best-effort — never surfaced to the triggering request */
  } finally {
    autoTrainInFlight = false;
  }
}

export interface LearningPassResult {
  trained:        boolean;
  reason?:        string;
  version?:       number;
  exampleCount?:  number;
  positiveCount?: number;
  negativeCount?: number;
  accuracy?:      number;
  precision?:     number;
  recall?:        number;
  auc?:           number;
  predictionsResolved?: number;
  sources?:       { publishedNodes: number; archivedNodes: number; rejectedProposals: number; rejectedDiscovered: number };
}

// Below this we don't have enough signal to train a meaningful model yet.
const MIN_EXAMPLES_TO_TRAIN = 12;

function splitDataset(examples: TrainExample[]): { train: TrainExample[]; test: TrainExample[] } {
  if (examples.length < 20) return { train: examples, test: examples }; // too small to hold out
  // Deterministic interleaved split (every 5th → test) keeps class balance stable.
  const trainSet: TrainExample[] = [];
  const testSet: TrainExample[] = [];
  examples.forEach((ex, i) => (i % 5 === 0 ? testSet : trainSet).push(ex));
  return { train: trainSet, test: testSet };
}

export async function runLearningPass(): Promise<LearningPassResult> {
  const { examples, positiveCount, negativeCount, sources } = await buildNodePromotionDataset();

  const predictionsResolved = await resolvePredictions();

  if (examples.length < MIN_EXAMPLES_TO_TRAIN || positiveCount === 0 || negativeCount === 0) {
    return {
      trained: false,
      reason: `insufficient labeled data (examples=${examples.length}, +${positiveCount}/-${negativeCount})`,
      exampleCount: examples.length,
      positiveCount, negativeCount,
      predictionsResolved,
      sources,
    };
  }

  const prev = await getActiveModel(true);
  const warmWeights = prev && prev.weights.length === FEATURE_COUNT ? prev.weights : undefined;
  const warmBias    = prev ? prev.bias : undefined;

  const { train: trainSet, test: testSet } = splitDataset(examples);
  const model = train(trainSet, FEATURE_COUNT, {
    epochs: 300,
    learningRate: 0.05,
    l2: 0.001,
    initWeights: warmWeights,
    initBias: warmBias,
  });
  const metrics = evaluate(model, testSet);

  const nextVersion = (prev ? await currentMaxVersion() : 0) + 1;

  // Deactivate old, insert new active version (history is preserved).
  await prisma.$transaction([
    prisma.learningModel.updateMany({
      where: { kind: LEARNING_KIND, active: true },
      data:  { active: false },
    }),
    prisma.learningModel.create({
      data: {
        kind:          LEARNING_KIND,
        version:       nextVersion,
        active:        true,
        features:      [...FEATURE_NAMES],
        weights:       model.weights,
        bias:          model.bias,
        exampleCount:  examples.length,
        positiveCount,
        negativeCount,
        accuracy:      metrics.accuracy,
        precision:     metrics.precision,
        recall:        metrics.recall,
        auc:           metrics.auc,
      },
    }),
  ]);

  return {
    trained: true,
    version: nextVersion,
    exampleCount: examples.length,
    positiveCount, negativeCount,
    accuracy: metrics.accuracy,
    precision: metrics.precision,
    recall: metrics.recall,
    auc: metrics.auc,
    predictionsResolved,
    sources,
  };
}

async function currentMaxVersion(): Promise<number> {
  const top = await prisma.learningModel.findFirst({
    where:   { kind: LEARNING_KIND },
    orderBy: { version: 'desc' },
    select:  { version: true },
  });
  return top?.version ?? 0;
}

/**
 * Resolve pending predictions to their real outcome so the dashboard can report
 * the model's live accuracy on the decisions it actually made.
 */
async function resolvePredictions(): Promise<number> {
  const pending = await prisma.learningPrediction.findMany({
    where:  { kind: LEARNING_KIND, outcome: 'pending' },
    select: { id: true, entityId: true },
    take:   2000,
  });
  if (pending.length === 0) return 0;

  const discoveredIds = pending.map(p => p.entityId);
  const discovered = await prisma.discoveredNode.findMany({
    where:  { id: { in: discoveredIds } },
    select: { id: true, status: true, promotedNodeId: true },
  });
  const dById = new Map(discovered.map(d => [d.id, d]));

  const promotedIds = discovered.map(d => d.promotedNodeId).filter((x): x is string => !!x);
  const liveNodes = promotedIds.length
    ? await prisma.node.findMany({ where: { id: { in: promotedIds } }, select: { id: true, status: true } })
    : [];
  const liveStatus = new Map(liveNodes.map(n => [n.id, n.status]));

  let resolved = 0;
  for (const p of pending) {
    const d = dById.get(p.entityId);
    if (!d) continue;

    let outcome: 'approved_survived' | 'rejected_removed' | null = null;
    if (d.promotedNodeId) {
      const st = liveStatus.get(d.promotedNodeId);
      if (st === 'published') outcome = 'approved_survived';
      else if (st === undefined || st === 'archived' || st === 'deleted') outcome = 'rejected_removed';
    } else if (d.status === 'rejected' || d.status === 'dismissed') {
      outcome = 'rejected_removed';
    }

    if (!outcome) continue;
    await prisma.learningPrediction.update({
      where: { id: p.id },
      data:  { outcome, resolvedAt: new Date() },
    }).catch(() => {});
    resolved++;
  }

  return resolved;
}
