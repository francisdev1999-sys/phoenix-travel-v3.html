import { prisma } from '@/lib/db';

interface RuleFinding {
  type: string; severity: 'critical' | 'high' | 'medium' | 'low';
  nodeId?: string; edgeId?: string;
  title: string; description: string;
  beforeState: object; afterState: object;
  reasoning: string; autoFixable: boolean;
}

export async function checkOrphans(): Promise<RuleFinding[]> {
  const published = await prisma.node.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, category: { select: { name: true } } },
  });
  const edges = await prisma.edge.findMany({
    where: { status: 'published' },
    select: { fromId: true, toId: true },
  });
  const connected = new Set([...edges.map(e => e.fromId), ...edges.map(e => e.toId)]);
  return published.filter(n => !connected.has(n.id)).map(n => ({
    type: 'orphan', severity: 'medium' as const, nodeId: n.id,
    title: `Orphan node: "${n.title}"`,
    description: `Published node with zero connections — unreachable via graph navigation.`,
    beforeState: { nodeId: n.id, title: n.title, category: n.category?.name, edgeCount: 0 },
    afterState: { action: 'flag_for_review', adminReviewStatus: 'review_required' },
    reasoning: `Node "${n.title}" (${n.id}) has no published edges. All published nodes need at least one connection.`,
    autoFixable: true,
  }));
}

export async function checkStaleEdges(): Promise<RuleFinding[]> {
  const edges = await prisma.edge.findMany({
    where: { status: 'published' },
    include: { from: { select: { id: true, title: true, status: true } }, to: { select: { id: true, title: true, status: true } } },
  });
  return edges.filter(e => e.from.status !== 'published' || e.to.status !== 'published').map(e => {
    const staleSide = e.from.status !== 'published'
      ? `source "${e.from.title}" (${e.from.status})`
      : `target "${e.to.title}" (${e.to.status})`;
    return {
      type: 'stale_edge', severity: 'high' as const, edgeId: e.id,
      title: `Stale edge → ${staleSide}`,
      description: `Published edge references a non-published node, creating a dangling connection.`,
      beforeState: { edgeId: e.id, fromTitle: e.from.title, fromStatus: e.from.status, toTitle: e.to.title, toStatus: e.to.status },
      afterState: { action: 'unpublish_edge', status: 'draft' },
      reasoning: `Edge ${e.id} is published but references ${staleSide}. Published edges must connect published nodes only.`,
      autoFixable: true,
    };
  });
}

export async function checkWeakEdges(threshold: number): Promise<RuleFinding[]> {
  const weak = await prisma.edge.findMany({
    where: { confidenceScore: { lt: threshold }, status: 'published' },
    include: { from: { select: { title: true } }, to: { select: { title: true } } },
    take: 60, orderBy: { confidenceScore: 'asc' },
  });
  return weak.map(e => ({
    type: 'weak_edge',
    severity: (e.confidenceScore < 0.15 ? 'high' : 'medium') as 'high' | 'medium',
    edgeId: e.id,
    title: `Weak connection (${(e.confidenceScore * 100).toFixed(0)}%): ${e.from.title} → ${e.to.title}`,
    description: `Confidence score ${(e.confidenceScore * 100).toFixed(0)}% is below the ${(threshold * 100).toFixed(0)}% threshold.`,
    beforeState: { edgeId: e.id, fromTitle: e.from.title, toTitle: e.to.title, confidenceScore: e.confidenceScore },
    afterState: { action: 'move_to_draft', status: 'draft' },
    reasoning: `Edge confidenceScore=${e.confidenceScore.toFixed(3)} < threshold=${threshold}. Low-confidence connections reduce graph credibility.`,
    autoFixable: e.confidenceScore < 0.15,
  }));
}

export async function checkMissingFields(): Promise<RuleFinding[]> {
  const nodes = await prisma.node.findMany({
    where: { status: 'published' },
    select: {
      id: true, title: true, description: true, mainstreamView: true,
      _count: { select: { claims: true, criticisms: true, tags: true, sourceLinks: true } },
    },
    take: 300,
  });
  return nodes.map(n => {
    const missing: string[] = [];
    if (!n.description || n.description.length < 80) missing.push('description (< 80 chars)');
    if (!n.mainstreamView || n.mainstreamView.length < 20) missing.push('mainstream_view');
    if (n._count.criticisms === 0) missing.push('criticisms');
    if (n._count.claims === 0) missing.push('claims');
    if (n._count.tags < 2) missing.push('tags (< 2)');
    return { n, missing };
  }).filter(({ missing }) => missing.length >= 2).map(({ n, missing }) => ({
    type: 'missing_fields',
    severity: (missing.length >= 4 ? 'high' : 'medium') as 'high' | 'medium',
    nodeId: n.id,
    title: `Incomplete node: "${n.title}"`,
    description: `Missing ${missing.length} critical fields: ${missing.join(', ')}.`,
    beforeState: { nodeId: n.id, title: n.title, descriptionLength: n.description?.length ?? 0, claimsCount: n._count.claims, criticismsCount: n._count.criticisms, tagsCount: n._count.tags, missingFields: missing },
    afterState: { action: 'flag_for_content_review', adminReviewStatus: 'needs_enrichment' },
    reasoning: `Node "${n.title}" is published but missing: ${missing.join(', ')}.`,
    autoFixable: true,
  }));
}

export async function checkDuplicates(threshold: number): Promise<RuleFinding[]> {
  const nodes = await prisma.node.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, category: { select: { name: true } } },
  });
  const tokenize = (s: string): Set<string> =>
    new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3));
  const jaccard = (a: Set<string>, b: Set<string>): number => {
    const inter = [...a].filter(x => b.has(x)).length;
    const union = new Set([...a, ...b]).size;
    return union === 0 ? 0 : inter / union;
  };
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < nodes.length && findings.length < 30; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const key = [a.id, b.id].sort().join('|');
      if (seen.has(key)) continue;
      const sim = jaccard(tokenize(a.title), tokenize(b.title));
      if (sim >= threshold) {
        seen.add(key);
        findings.push({
          type: 'duplicate', severity: (sim >= 0.85 ? 'high' : 'medium') as 'high' | 'medium',
          nodeId: a.id,
          title: `Possible duplicate: "${a.title}" ≈ "${b.title}"`,
          description: `${(sim * 100).toFixed(0)}% title word overlap — may describe the same subject.`,
          beforeState: { nodeA: { id: a.id, title: a.title }, nodeB: { id: b.id, title: b.title }, similarity: sim },
          afterState: { action: 'manual_review_required', note: 'Consider merging or adding disambiguation.' },
          reasoning: `Jaccard(tokenized titles)=${sim.toFixed(3)} ≥ threshold=${threshold}. "${a.title}" vs "${b.title}".`,
          autoFixable: false,
        });
      }
    }
  }
  return findings;
}

export async function checkSourceQuality(): Promise<RuleFinding[]> {
  const nodes = await prisma.node.findMany({
    where: { status: 'published' },
    select: {
      id: true, title: true,
      _count: { select: { sourceLinks: true } },
      sourceLinks: {
        take: 10,
        select: {
          source: { select: { credibilityScore: true } },
        },
      },
    },
    take: 300,
  });
  const findings: RuleFinding[] = [];
  for (const n of nodes) {
    const count = n._count.sourceLinks;
    if (count === 0) {
      findings.push({
        type: 'source_quality', severity: 'medium' as const, nodeId: n.id,
        title: `No sources: "${n.title}"`,
        description: `Published node with no attached sources — claims cannot be verified.`,
        beforeState: { nodeId: n.id, sourcesCount: 0 },
        afterState: { action: 'flag_for_source_enrichment', adminReviewStatus: 'needs_enrichment' },
        reasoning: `Node.sourceLinks count = 0. Published nodes must cite at least one source.`,
        autoFixable: true,
      });
    } else {
      const scores = n.sourceLinks.map(sl => sl.source?.credibilityScore ?? 0.5);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 0.40 && count < 2) {
        findings.push({
          type: 'source_quality', severity: 'low' as const, nodeId: n.id,
          title: `Weak sources: "${n.title}"`,
          description: `Average credibility ${(avg * 100).toFixed(0)}% with only ${count} source.`,
          beforeState: { nodeId: n.id, sourcesCount: count, avgCredibility: avg },
          afterState: { action: 'flag_for_source_review', adminReviewStatus: 'needs_enrichment' },
          reasoning: `avg(credibilityScore)=${avg.toFixed(2)} < 0.40 with only ${count} source.`,
          autoFixable: true,
        });
      }
    }
  }
  return findings;
}
