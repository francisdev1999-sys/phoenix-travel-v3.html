/**
 * The news-relevance neuron — the archive learning which intel-feed headlines
 * are worth investigating.
 *
 * Ground truth writes itself: news-discovery turns headlines into seeds
 * (lib/discovery/news-seeds.ts), and each seed's fate is recorded on
 * DiscoveredNode (discoveryQuery = the cleaned headline):
 *
 *   positive (1): the headline's seed produced a PROMOTED node — real archive
 *                 content came from this news.
 *   negative (0): the seed was attempted but rejected/dismissed, or went
 *                 nowhere after a fair window.
 *   skipped:      headlines never attempted as seeds (no verdict yet).
 *
 * A mature model re-ranks tomorrow's headlines so the daily discovery budget
 * goes to the news most likely to produce published topics.
 */

import { prisma } from '@/lib/db';
import { headlineToSeed } from '@/lib/discovery/news-seeds';
import {
  extractNewsFeatures, NEWS_FEATURE_NAMES, NEWS_FEATURE_COUNT, type NewsCandidateInput,
} from '@/lib/learning/news-features';
import { NEWS_LEARNING_KIND, getActiveModel, isModelMature } from '@/lib/learning/scorer';
import { predict, type TrainExample } from '@/lib/learning/model';
import { fitAndSave, MIN_EXAMPLES_TO_TRAIN, type LearningPassResult } from '@/lib/learning/trainer';

// A seed attempt gets this long to produce a promotion before counting negative.
const VERDICT_WINDOW_DAYS = 3;

/** Lowercased tag vocabulary of the archive (for the tagOverlap feature). */
async function loadArchiveTags(): Promise<Set<string>> {
  const rows = await prisma.nodeTag.findMany({ distinct: ['tag'], select: { tag: true }, take: 5000 });
  return new Set(rows.map(r => r.tag.toLowerCase()));
}

export interface NewsOutcome {
  item:    { title: string; description: string | null; category: string; source: string };
  label:   0 | 1;
}

/**
 * Pure labeling rule (unit-tested): given a headline's matching discovery
 * attempt (if any), decide the label.
 */
export function labelForAttempt(
  attempt: { promotedNodeId: string | null; status: string; discoveredAt: Date } | undefined,
  now: Date,
): 0 | 1 | null {
  if (!attempt) return null; // never tried — no verdict
  if (attempt.promotedNodeId) return 1;
  if (attempt.status === 'rejected' || attempt.status === 'dismissed') return 0;
  const ageMs = now.getTime() - attempt.discoveredAt.getTime();
  if (ageMs >= VERDICT_WINDOW_DAYS * 24 * 60 * 60 * 1000) return 0; // had its chance
  return null; // still pending inside the window
}

async function buildOutcomes(): Promise<NewsOutcome[]> {
  const [items, attempts] = await Promise.all([
    prisma.newsItem.findMany({
      select: { title: true, description: true, category: true, source: true },
      take:   3000,
    }),
    prisma.discoveredNode.findMany({
      where:  { discoveryQuery: { not: null } },
      select: { discoveryQuery: true, promotedNodeId: true, status: true, discoveredAt: true },
      take:   4000,
    }),
  ]);

  const bySeed = new Map(attempts.map(a => [a.discoveryQuery as string, a]));
  const now = new Date();
  const out: NewsOutcome[] = [];
  for (const item of items) {
    const seed = headlineToSeed(item.title);
    if (!seed) continue;
    const label = labelForAttempt(bySeed.get(seed), now);
    if (label === null) continue;
    out.push({ item, label });
  }
  return out;
}

/** Historical promotion rate per RSS source, Laplace-smoothed toward 0.5. */
export function sourceHitRates(outcomes: NewsOutcome[]): Map<string, number> {
  const agg = new Map<string, { pos: number; total: number }>();
  for (const o of outcomes) {
    const a = agg.get(o.item.source) ?? { pos: 0, total: 0 };
    a.pos += o.label;
    a.total += 1;
    agg.set(o.item.source, a);
  }
  return new Map([...agg.entries()].map(([s, a]) => [s, (a.pos + 1) / (a.total + 2)]));
}

/** Nightly pass for the news-relevance model. */
export async function runNewsLearningPass(): Promise<LearningPassResult> {
  const [outcomes, archiveTags] = await Promise.all([buildOutcomes(), loadArchiveTags()]);
  const hitRates = sourceHitRates(outcomes);

  const examples: TrainExample[] = outcomes.map(o => ({
    x: extractNewsFeatures({
      title:         o.item.title,
      description:   o.item.description,
      category:      o.item.category,
      sourceHitRate: hitRates.get(o.item.source) ?? 0.5,
      archiveTags,
    }),
    label: o.label,
  }));
  const positiveCount = outcomes.filter(o => o.label === 1).length;
  const negativeCount = outcomes.length - positiveCount;

  if (examples.length < MIN_EXAMPLES_TO_TRAIN || positiveCount === 0 || negativeCount === 0) {
    return {
      trained: false,
      reason: `insufficient news outcomes (examples=${examples.length}, +${positiveCount}/-${negativeCount})`,
      exampleCount: examples.length,
      positiveCount, negativeCount,
    };
  }

  const fit = await fitAndSave(NEWS_LEARNING_KIND, [...NEWS_FEATURE_NAMES], NEWS_FEATURE_COUNT, examples, positiveCount, negativeCount);
  return { trained: true, ...fit };
}

/**
 * Rank fresh headlines by predicted archive-productivity. Returns null when no
 * mature model exists (caller falls back to newest-first).
 */
export async function rankHeadlines(
  items: { title: string; description: string | null; category: string; source: string }[],
): Promise<{ title: string; score: number }[] | null> {
  const model = await getActiveModel(false, NEWS_LEARNING_KIND);
  if (!model || model.weights.length === 0 || !isModelMature(model)) return null;

  const [outcomes, archiveTags] = await Promise.all([buildOutcomes(), loadArchiveTags()]);
  const hitRates = sourceHitRates(outcomes);

  return items
    .map(item => ({
      title: item.title,
      score: predict(
        { weights: model.weights, bias: model.bias },
        extractNewsFeatures({
          title:         item.title,
          description:   item.description,
          category:      item.category,
          sourceHitRate: hitRates.get(item.source) ?? 0.5,
          archiveTags,
        }),
      ),
    }))
    .sort((a, b) => b.score - a.score);
}
