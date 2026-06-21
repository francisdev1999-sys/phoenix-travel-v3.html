/**
 * Auto-approve lane for relationship suggestions — mirrors the strict,
 * multi-criteria gate in lib/discovery/node-promoter.ts. Only AI-semantic
 * suggestions (grounded in actual node text, not bare category-matching)
 * that clear a high confidence bar and connect two non-speculative,
 * non-mythological nodes are promoted straight to a published Edge.
 * Everything else still requires the human review gate.
 */

import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { SUGGESTION_TO_EDGE_TYPE } from '@/lib/suggestion-engine';

const AUTO_APPROVE_REL_MIN_CONFIDENCE = 0.85;
// Speculative/contradictory connections always need a human — never auto-published
const AUTO_APPROVE_REL_BLOCKED_TYPES = new Set(['speculative', 'contradictory', 'contradiction']);
// Only auto-approve relationships between verifiable nodes (not pure speculation)
const AUTO_APPROVE_REL_EVIDENCE_LEVELS = new Set(['verified', 'strong_evidence', 'debated']);

export function qualifiesForRelationshipAutoApprove(opts: {
  confidence:        number;
  relationshipType:  string;
  generationMethod:  string;
  fromEvidenceLevel: string;
  toEvidenceLevel:   string;
}): boolean {
  return (
    opts.generationMethod === 'ai_semantic' &&
    opts.confidence       >= AUTO_APPROVE_REL_MIN_CONFIDENCE &&
    !AUTO_APPROVE_REL_BLOCKED_TYPES.has(opts.relationshipType) &&
    AUTO_APPROVE_REL_EVIDENCE_LEVELS.has(opts.fromEvidenceLevel) &&
    AUTO_APPROVE_REL_EVIDENCE_LEVELS.has(opts.toEvidenceLevel)
  );
}

export interface PromotableSuggestion {
  id:               string;
  fromNodeId:       string;
  toNodeId:         string;
  relationshipType: string;
  reason:           string;
  evidenceBasis:    string;
  confidenceScore:  number;
}

/** Promotes a qualifying suggestion straight to a published Edge. Idempotent on existing edges. */
export async function promoteRelationshipSuggestion(suggestion: PromotableSuggestion): Promise<string> {
  const edgeType = SUGGESTION_TO_EDGE_TYPE[suggestion.relationshipType] ?? 'thematic';

  const existingEdge = await prisma.edge.findFirst({
    where: { OR: [
      { fromId: suggestion.fromNodeId, toId: suggestion.toNodeId },
      { fromId: suggestion.toNodeId,   toId: suggestion.fromNodeId },
    ]},
  });
  if (existingEdge) {
    await prisma.relationshipSuggestion.update({
      where: { id: suggestion.id },
      data:  { status: 'rejected', reviewNote: 'Edge already exists', reviewedAt: new Date() },
    });
    return existingEdge.id;
  }

  const edge = await prisma.edge.create({
    data: {
      fromId:           suggestion.fromNodeId,
      toId:             suggestion.toNodeId,
      relationshipType: edgeType,
      strengthScore:    suggestion.confidenceScore,
      confidenceScore:  suggestion.confidenceScore,
      explanation:      suggestion.reason,
      evidenceBasis:    suggestion.evidenceBasis,
      sourceType:       'academic',
      status:           'published',
    },
  });

  await prisma.relationshipSuggestion.update({
    where: { id: suggestion.id },
    data:  { status: 'auto_approved', reviewedAt: new Date(), promotedEdgeId: edge.id },
  });

  await writeAuditLog({
    action:     'auto_approve',
    entityType: 'suggestion',
    entityId:   suggestion.id,
    detail: {
      fromNodeId:       suggestion.fromNodeId,
      toNodeId:         suggestion.toNodeId,
      edgeId:           edge.id,
      relationshipType: edgeType,
      confidence:       suggestion.confidenceScore,
    },
  });

  return edge.id;
}
