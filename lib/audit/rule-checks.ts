import { prisma } from '@/lib/db';

interface RuleFinding {
  type:        string;
  severity:    'critical' | 'high' | 'medium' | 'low';
  nodeId?:     string;
  edgeId?:     string;
  title:       string;
  description: string;
  beforeState: object;
  afterState:  object;
  reasoning:   string;
  autoFixable: boolean;
}

// ── Orphan nodes: published with 0 published edges ───────────────────────────

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
  const orphans = published.filter(n => !connected.has(n.id));

  return orphans.map(n => ({
    type: 'orphan',
    severity: 'medium' as const,
    nodeId: n.id,
    title: `Orphan node: "${n.title}"`,
    description: `This published node has zero connections to any other node. Orphan nodes cannot be discovered through graph navigation.`,
    beforeState: { nodeId: n.id, title: n.title, category: n.category?.name, edgeCount: 0 },
    afterState: { action: 'flag_for_review', adminReviewStatus: 'review_required' },
    reasoning: `Node "${n.title}" (${n.id}) has no entries in Edge table where status='published'. All published nodes need at least one connection to be reachable.`,
    autoFixable: true,
  }));
}

// ── Stale edges: published edge referencing a non-published node ─────────────

export async function checkStaleEdges(): Promise<RuleFinding[]> {
  const edges = await prisma.edge.findMany({
    where: { status: 'published' },
    include: {
      from: { select: { id: true, title: true, status: true } },
      to:   { select: { id: true, title: true, status: true } },
    },
  });

  return edges
    .filter(e => e.from.status !== 'published' || e.to.status !== 'published')
    .map(e => {
      const staleSide = e.from.status !== 'published' ? `source "${e.from.title}" (${e.from.status})` : `target "${e.to.title}" (${e.to.status})`;
      return {
        type: 'stale_edge',
        severity: 'high' as const,
        edgeId: e.id,
        title: `Stale edge → ${staleSide}`,
        description: `This published edge references a node that is not published. It pollutes the graph with dangling connections.`,
        beforeState: { edgeId: e.id, fromId: e.fromId, fromTitle: e.from.title, fromStatus: e.from.status, toId: e.toId, toTitle: e.to.title, toStatus: e.to.status },
        afterState: { action: 'unpublish_edge', status: 'draft' },
        reasoning: `Edge ${e.id} has status='published' but references ${staleSide}. Published edges must only connect published nodes.`,
        autoFixable: true,
      };
    });
}

// ── Weak edges: confidenceScore below threshold ───────────────────────────────

export async function checkWeakEdges(threshold: number): Promise<RuleFinding[]> {
  const weak = await prisma.edge.findMany({
    where: { confidenceScore: { lt: threshold }, status: 'published' },
    include: {
      from: { select: { title: true } },
      to:   { select: { title: true } },
    },
    take: 60,
    orderBy: { confidenceScore: 'asc' },
  });

  return weak.map(e => ({
    type: 'weak_edge',
    severity: e.confidenceScore < 0.15 ? 'high' as const : 'medium' as const,
    edgeId: e.id,
    title: `Weak connection (${(e.confidenceScore * 100).toFixed(0)}%): ${e.from.title} → ${e.to.title}`,
    description: `This relationship has a confidence score of ${(e.confidenceScore * 100).toFixed(0)}%, below the quality threshold of ${(threshold * 100).toFixed(0)}%.`,
    beforeState: { edgeId: e.id, fromTitle: e.from.title, toTitle: e.to.title, confidenceScore: e.confidenceScore, relationshipType: e.relationshipType },
    afterState: { action: 'move_to_draft', status: 'draft' },
    reasoning: `Edge confidenceScore=${e.confidenceScore.toFixed(3)} < threshold=${threshold}. Low-confidence connections mislead users and reduce graph credibility.`,
    autoFixable: e.confidenceScore < 0.15,
  }));
}

// ── Missing fields: published nodes lacking critical content ─────────────────

export async function checkMissingFields(): Promise<RuleFinding[]> {
  const nodes = await prisma.node.findMany({
    where: { status: 'published' },
    select: {
      id: true, title: true, description: true, mainstreamView: true,
      _count: { select: { claims: true, criticisms: true, tags: true, sourceLinks: true } },
    },
    take: 300,
  });

  return nodes
    .map(n => {
      const missing: string[] = [];
      if (!n.description || n.description.length < 80) missing.push('description (< 80 chars)');
      if (!n.mainstreamView || n.mainstreamView.length < 20) missing.push('mainstream_view');
      if (n._count.criticisms === 0) missing.push('criticisms');
      if (n._count.claims === 0)     missing.push('claims');
      if (n._count.tags < 2)         missing.push('tags (< 2)');
      return { n, missing };
    })
    .filter(({ missing }) => missing.length >= 2)
    .map(({ n, missing }) => ({
      type: 'missing_fields',
      severity: (missing.length >= 4 ? 'high' : 'medium') as 'high' | 'medium',
      nodeId: n.id,
      title: `Incomplete node: "${n.title}"`,
      description: `Missing ${missing.length} critical fields: ${missing.join(', ')}.`,
      beforeState: {
        nodeId: n.id, title: n.title,
        descriptionLength: n.description?.length ?? 0,
        claimsCount: n._count.claims, criticismsCount: n._count.criticisms,
        hasMainstreamView: (n.mainstreamView?.length ?? 0) >= 20,
        tagsCount: n._count.tags, missingFields: missing,
      },
      afterState: { action: 'flag_for_content_review', adminReviewStatus: 'needs_enrichment' },
      reasoning: `Node "${n.title}" is published but missing: ${missing.join(', ')}. Incomplete nodes reduce research quality.`,
      autoFixable: true,
    }));
}

// ── Duplicate detection: Jaccard similarity on title tokens ──────────────────

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
          type: 'duplicate',
          severity: (sim >= 0.85 ? 'high' : 'medium') as 'high' | 'medium',
          nodeId: a.id,
          title: `Possible duplicate: "${a.title}" ≈ "${b.title}"`,
          description: `${(sim * 100).toFixed(0)}% title word overlap detected. These nodes may describe the same subject.`,
          beforeState: { nodeA: { id: a.id, title: a.title, category: a.category?.name }, nodeB: { id: b.id, title: b.title, category: b.category?.name }, similarity: sim },
          afterState: { action: 'manual_review_required', note: 'Review both nodes. Consider merging or adding disambiguation.' },
          reasoning: `Jaccard(tokenized titles)=${sim.toFixed(3)} ≥ threshold=${threshold}. "${a.title}" vs "${b.title}".`,
          autoFixable: false,
        });
      }
    }
  }
  return findings;
}

// ── Source quality: nodes with 0 sources or very low credibility ─────────────

export async function checkSourceQuality(): Promise<RuleFinding[]> {
  const nodes = await prisma.node.findMany({
    where: { status: 'published' },
    select: {
      id: true, title: true,
      _count: { select: { sourceLinks: true } },
      sourceLinks: {
        take: 10,
        include: { source: { select: { credibilityScore: true, credibilityOverride: true } } },
      },
    },
    take: 300,
  });

  const findings: RuleFinding[] = [];
  for (const n of nodes) {
    const count = n._count.sourceLinks;
    if (count === 0) {
      findings.push({
        type: 'source_quality',
        severity: 'medium' as const,
        nodeId: n.id,
        title: `No sources: "${n.title}"`,
        description: `This published node has no attached sources. Claims cannot be verified.`,
        beforeState: { nodeId: n.id, sourcesCount: 0 },
        afterState: { action: 'flag_for_source_enrichment', adminReviewStatus: 'needs_enrichment' },
        reasoning: `Node.sourceLinks count = 0. Published nodes must cite at least one source to support their claims.`,
        autoFixable: true,
      });
    } else {
      const scores = n.sourceLinks.map(sl => sl.source?.credibilityOverride ?? sl.source?.credibilityScore ?? 0.5);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 0.40 && count < 2) {
        findings.push({
          type: 'source_quality',
          severity: 'low' as const,
          nodeId: n.id,
          title: `Weak sources: "${n.title}"`,
          description: `Average source credibility is ${(avg * 100).toFixed(0)}% with only ${count} source. Consider adding higher-quality citations.`,
          beforeState: { nodeId: n.id, sourcesCount: count, avgCredibility: avg },
          afterState: { action: 'flag_for_source_review', adminReviewStatus: 'needs_enrichment' },
          reasoning: `avg(credibilityScore)=${avg.toFixed(2)} < 0.40 with only ${count} source. Higher-credibility sources improve archive trustworthiness.`,
          autoFixable: true,
        });
      }
    }
  }
  return findings;
}
