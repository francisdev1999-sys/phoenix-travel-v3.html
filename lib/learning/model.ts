/**
 * A single-layer logistic model — one neuron with a sigmoid activation,
 * trained by mini-batch gradient descent with L2 regularization.
 *
 * This is deliberately simple and robust for small, noisy tabular data (the
 * archive's approve/reject history). It is a real learnable model: warm-start
 * from the previous weights and it *evolves* each night rather than resetting.
 * The design leaves room to grow a hidden layer later without changing callers.
 */

export interface TrainExample {
  x:     number[];
  label: 0 | 1;
}

export interface TrainedModel {
  weights: number[];
  bias:    number;
}

export interface TrainOptions {
  epochs?:       number;
  learningRate?: number;
  l2?:           number;
  initWeights?:  number[];
  initBias?:     number;
  seed?:         number;
}

export interface Metrics {
  accuracy:  number;
  precision: number;
  recall:    number;
  auc:       number;
}

export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

export function predict(model: TrainedModel, x: number[]): number {
  let z = model.bias;
  for (let i = 0; i < x.length; i++) z += model.weights[i] * (x[i] ?? 0);
  return sigmoid(z);
}

// Deterministic PRNG so training is reproducible (no Math.random — also keeps
// this runnable inside workflow scripts where Math.random is unavailable).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fit / continue-fitting the logistic model. Pass initWeights/initBias to
 * warm-start from an existing model so learning is incremental (online).
 */
export function train(examples: TrainExample[], dim: number, opts: TrainOptions = {}): TrainedModel {
  const epochs = opts.epochs ?? 200;
  const lr     = opts.learningRate ?? 0.05;
  const l2     = opts.l2 ?? 0.001;
  const rnd    = mulberry32(opts.seed ?? 12345);

  const weights = (opts.initWeights && opts.initWeights.length === dim)
    ? opts.initWeights.slice()
    : new Array(dim).fill(0);
  let bias = opts.initBias ?? 0;

  if (examples.length === 0) return { weights, bias };

  for (let epoch = 0; epoch < epochs; epoch++) {
    const batch = shuffle(examples, rnd);
    for (const ex of batch) {
      const p    = predict({ weights, bias }, ex.x);
      const err  = p - ex.label; // dL/dz for logistic + cross-entropy
      for (let i = 0; i < dim; i++) {
        const grad = err * (ex.x[i] ?? 0) + l2 * weights[i];
        weights[i] -= lr * grad;
      }
      bias -= lr * err;
    }
  }

  return { weights, bias };
}

/** Threshold-0.5 classification metrics + a rank-based AUC. */
export function evaluate(model: TrainedModel, examples: TrainExample[]): Metrics {
  if (examples.length === 0) return { accuracy: 0, precision: 0, recall: 0, auc: 0.5 };

  let tp = 0, fp = 0, tn = 0, fn = 0;
  const scored: { p: number; label: 0 | 1 }[] = [];
  for (const ex of examples) {
    const p = predict(model, ex.x);
    scored.push({ p, label: ex.label });
    const yhat = p >= 0.5 ? 1 : 0;
    if (yhat === 1 && ex.label === 1) tp++;
    else if (yhat === 1 && ex.label === 0) fp++;
    else if (yhat === 0 && ex.label === 0) tn++;
    else fn++;
  }

  const accuracy  = (tp + tn) / examples.length;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall    = tp + fn === 0 ? 0 : tp / (tp + fn);

  return { accuracy, precision, recall, auc: computeAuc(scored) };
}

// Mann–Whitney U based AUC — robust for small samples.
function computeAuc(scored: { p: number; label: 0 | 1 }[]): number {
  const pos = scored.filter(s => s.label === 1);
  const neg = scored.filter(s => s.label === 0);
  if (pos.length === 0 || neg.length === 0) return 0.5;

  const sorted = scored
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => a.p - b.p);

  // Assign average ranks (1-based), handling ties.
  const ranks = new Array(sorted.length);
  let idx = 0;
  while (idx < sorted.length) {
    let j = idx;
    while (j + 1 < sorted.length && sorted[j + 1].p === sorted[idx].p) j++;
    const avgRank = (idx + j) / 2 + 1;
    for (let k = idx; k <= j; k++) ranks[sorted[k].i] = avgRank;
    idx = j + 1;
  }

  let rankSumPos = 0;
  for (let i = 0; i < scored.length; i++) if (scored[i].label === 1) rankSumPos += ranks[i];

  const auc = (rankSumPos - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length);
  return Math.min(1, Math.max(0, auc));
}
