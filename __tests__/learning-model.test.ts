import { describe, it, expect } from 'vitest';

// Pure math module — no DB. Validates the single-layer logistic learner that
// powers the adaptive promotion model actually learns, evaluates, and evolves.
import { train, evaluate, predict, sigmoid, type TrainExample } from '@/lib/learning/model';
import { extractFeatures, FEATURE_COUNT, candidateFromDiscovered } from '@/lib/learning/features';
import {
  extractEdgeFeatures, edgeCandidateFromParts, evidenceLadder, EDGE_FEATURE_COUNT,
} from '@/lib/learning/edge-features';

describe('sigmoid', () => {
  it('maps 0 → 0.5 and is monotonic / bounded', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 6);
    expect(sigmoid(50)).toBeGreaterThan(0.99);
    expect(sigmoid(-50)).toBeLessThan(0.01);
    expect(sigmoid(2)).toBeGreaterThan(sigmoid(1));
  });
});

// A linearly separable toy dataset: label depends on feature 0 crossing 0.5.
function separable(n: number): TrainExample[] {
  const ex: TrainExample[] = [];
  for (let i = 0; i < n; i++) {
    const v = i / n; // 0..1
    const x = new Array(FEATURE_COUNT).fill(0.2);
    x[0] = v;
    ex.push({ x, label: v > 0.5 ? 1 : 0 });
  }
  return ex;
}

describe('train / evaluate', () => {
  it('learns a separable pattern to high accuracy', () => {
    const data = separable(80);
    const model = train(data, FEATURE_COUNT, { epochs: 300, learningRate: 0.1 });
    const m = evaluate(model, data);
    expect(m.accuracy).toBeGreaterThan(0.9);
    expect(m.auc).toBeGreaterThan(0.9);
    // The discriminative feature (index 0) should carry the dominant weight.
    const absWeights = model.weights.map(Math.abs);
    expect(absWeights[0]).toBe(Math.max(...absWeights));
  });

  it('warm-start continues from prior weights (online evolution)', () => {
    const data = separable(60);
    const first  = train(data, FEATURE_COUNT, { epochs: 50, learningRate: 0.1 });
    const warmed = train(data, FEATURE_COUNT, {
      epochs: 200, learningRate: 0.1,
      initWeights: first.weights, initBias: first.bias,
    });
    expect(evaluate(warmed, data).accuracy).toBeGreaterThanOrEqual(evaluate(first, data).accuracy);
  });

  it('predict returns a probability in [0,1]', () => {
    const model = train(separable(40), FEATURE_COUNT, { epochs: 100 });
    const p = predict(model, new Array(FEATURE_COUNT).fill(0.5));
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('empty dataset yields a safe zero model', () => {
    const model = train([], FEATURE_COUNT, {});
    expect(model.weights).toHaveLength(FEATURE_COUNT);
    expect(predict(model, new Array(FEATURE_COUNT).fill(1))).toBeCloseTo(0.5, 6);
  });
});

describe('feature extraction', () => {
  it('produces a fixed-length, bounded vector', () => {
    const f = extractFeatures(candidateFromDiscovered({
      confidenceScore: 0.6, evidenceLevel: 'strong_evidence',
      claims: ['a', 'b', 'c'], criticisms: ['x'], tags: ['t1', 't2'], openQuestions: ['q1'],
      description: 'x'.repeat(600), sourceUrl: 'https://en.wikipedia.org/wiki/Test',
      relatedNodeIds: ['n1', 'n2', 'n3'], mainstreamView: 'the consensus view',
    }));
    expect(f).toHaveLength(FEATURE_COUNT);
    expect(f.every(v => v >= 0 && v <= 1)).toBe(true);
    // index 5 = sources (has a source url → 1/5)
    expect(f[5]).toBeGreaterThan(0);
    // index 6 = sourceCred (Wikipedia → 0.65)
    expect(f[6]).toBeCloseTo(0.65, 6);
    // index 7 = connections (3 related ids → 3/8)
    expect(f[7]).toBeCloseTo(3 / 8, 6);
    // index 8 = hasMainstream (present → 1)
    expect(f[8]).toBe(1);
    // strong_evidence one-hot at index 11, verified (index 10) not set
    expect(f[11]).toBe(1);
    expect(f[10]).toBe(0);
  });
});

describe('edge feature extraction', () => {
  const endpoint = (evidenceLevel: string, degree: number, categoryId: string | null) => ({
    evidenceLevel, categoryId,
    _count: { edgesFrom: degree, edgesTo: 0 },
  });

  it('evidence ladder is ordered', () => {
    expect(evidenceLadder('verified')).toBeGreaterThan(evidenceLadder('strong_evidence'));
    expect(evidenceLadder('strong_evidence')).toBeGreaterThan(evidenceLadder('debated'));
    expect(evidenceLadder('debated')).toBeGreaterThan(evidenceLadder('speculative'));
    expect(evidenceLadder('speculative')).toBeGreaterThan(evidenceLadder('mythological'));
  });

  it('produces a fixed-length, bounded vector with correct signals', () => {
    const f = extractEdgeFeatures(edgeCandidateFromParts({
      confidence: 0.8,
      explanation: 'x'.repeat(200),
      relationshipType: 'thematic',
      from: endpoint('strong_evidence', 4, 'cat-1'),
      to:   endpoint('debated', 2, 'cat-1'),
    }));
    expect(f).toHaveLength(EDGE_FEATURE_COUNT);
    expect(f.every(v => v >= 0 && v <= 1)).toBe(true);
    expect(f[0]).toBeCloseTo(0.8, 6);        // confidence
    expect(f[2]).toBeCloseTo(4 / 8, 6);      // fromDegree
    expect(f[4]).toBeCloseTo(0.75, 6);       // fromEvidence (strong)
    expect(f[6]).toBe(1);                    // sameCategory
    expect(f[7]).toBe(1);                    // rt_thematic
    expect(f[11]).toBe(0);                   // not rt_other
  });

  it('buckets unknown relationship types as other', () => {
    const f = extractEdgeFeatures(edgeCandidateFromParts({
      confidence: 0.5, explanation: 'why', relationshipType: 'related_to',
      from: endpoint('verified', 1, 'a'), to: endpoint('verified', 1, 'b'),
    }));
    expect(f[7]).toBe(0);
    expect(f[11]).toBe(1); // rt_other
    expect(f[6]).toBe(0);  // different categories
  });
});
