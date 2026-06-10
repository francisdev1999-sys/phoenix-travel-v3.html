/**
 * Similarity scoring for user-submitted (ProposedNode) entries.
 *
 * Computes similarity between the submission and all 73 static archive nodes.
 * Stores the top-5 results in ProposedNode.proposalSimilarity as advisory metadata
 * so admins can see structural overlap during review.
 *
 * GUARANTEES:
 *   - NEVER creates or modifies graph edges
 *   - NEVER changes evidence_level, confidence_score, or node content
 *   - NEVER auto-approves, rejects, or scores submissions based on similarity
 *   - Errors are logged and silently swallowed — never block the submission flow
 */

import { nodes as staticNodes, edges } from '@/lib/graph';
import { prisma } from '@/lib/db';
import { computeSimilarity } from './engine';
import type { SimilarityDimensions, CriticAnalysis } from './engine';
import type { GraphNode, EvidenceLevel } from '@/lib/graph/types';

// ── ProposedNode → GraphNode adapter ──────────────────────────────────────────

interface ProposedNodeRow {
  id:            string;
  label:         string;
  category:      string;
  description:   string;
  evidenceLevel: string;
  confidence:    number;
  claims:        unknown;
  criticisms:    unknown;
  tags:          unknown;
  mainstreamView:string | null;
  region:        string | null;
  country:       string | null;
  dateStart:     number | null;
  dateEnd:       number | null;
}

const VALID_EVIDENCE: EvidenceLevel[] = [
  'verified', 'strong_evidence', 'debated', 'speculative', 'mythological',
];

function toGraphNode(p: ProposedNodeRow): GraphNode {
  return {
    id:               p.id,
    title:            p.label,
    category:         p.category as GraphNode['category'],
    description:      p.description,
    evidence_level:   VALID_EVIDENCE.includes(p.evidenceLevel as EvidenceLevel)
                        ? (p.evidenceLevel as EvidenceLevel)
                        : 'speculative',
    confidence_score: Math.min(1, Math.max(0, p.confidence)),
    claims:           Array.isArray(p.claims)     ? (p.claims as string[])     : [],
    criticisms:       Array.isArray(p.criticisms) ? (p.criticisms as string[]) : [],
    mainstream_view:  p.mainstreamView ?? '',
    tags:             Array.isArray(p.tags)        ? (p.tags as string[])       : [],
    region:           p.region  ?? undefined,
    country:          p.country ?? undefined,
    date_start:       p.dateStart ?? undefined,
    date_end:         p.dateEnd  ?? undefined,
    // ProposedNode has no coordinates — geographic score will use country/region fallback
  };
}

// ── Stored result types ────────────────────────────────────────────────────────

export interface ProposalSimilarityEntry {
  nodeId:             string;
  title:              string;
  icon?:              string;
  category:           string;
  overall:            number;
  research_potential: number;
  dimensions:         SimilarityDimensions;
  critic:             CriticAnalysis;
}

export interface ProposalSimilarityResult {
  computed_at: string;
  top_similar: ProposalSimilarityEntry[];
  disclaimer:  string;
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function auditProposalSimilarity(proposalId: string): Promise<void> {
  try {
    const proposal = await prisma.proposedNode.findUnique({
      where:  { id: proposalId },
      select: {
        id: true, label: true, category: true, description: true,
        evidenceLevel: true, confidence: true, claims: true, criticisms: true,
        tags: true, mainstreamView: true, region: true, country: true,
        dateStart: true, dateEnd: true,
      },
    });
    if (!proposal) return;

    const asNode = toGraphNode(proposal);

    const ranked = staticNodes
      .map(n => {
        const r = computeSimilarity(asNode, n, edges);
        return {
          nodeId:             n.id,
          title:              n.title,
          icon:               n.icon,
          category:           n.category as string,
          overall:            r.overall,
          research_potential: r.research_potential,
          dimensions:         r.dimensions,
          critic:             r.critic,
        };
      })
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5);

    const result: ProposalSimilarityResult = {
      computed_at: new Date().toISOString(),
      top_similar: ranked,
      disclaimer:
        'ADVISORY ONLY. Similarity does not imply any connection between this submission and existing nodes. ' +
        'Similarity must NOT influence approval, rejection, or evidence-level decisions. ' +
        'All relationships require independent evidence and human review.',
    };

    await prisma.proposedNode.update({
      where: { id: proposalId },
      data:  { proposalSimilarity: result as object },
    });
  } catch (err) {
    console.error('[proposal-similarity] Error:', err);
  }
}
