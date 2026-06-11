// Phase C — Source Intelligence Engine types
// AI rules: extract/classify/summarize/suggest only.
// NEVER publish, approve, create live nodes, or create live relationships.

export type EntityType =
  | 'person' | 'organization' | 'location' | 'event'
  | 'artifact' | 'concept' | 'text';

export type ClaimType =
  | 'factual' | 'temporal' | 'geographic' | 'causal'
  | 'speculative' | 'contradictory';

export type LocationType =
  | 'country' | 'region' | 'city' | 'site' | 'ancient_name';

export type DatePrecision =
  | 'exact' | 'decade' | 'century' | 'millennium' | 'era';

export type ContradictionType =
  | 'evidence_conflict' | 'factual_dispute' | 'dating_conflict'
  | 'geographic_conflict' | 'authorship_conflict';

export type SuggestionSeverity = 'minor' | 'moderate' | 'significant';

export type SuggestionStatus = 'pending' | 'approved' | 'dismissed' | 'applied';

// ── AI extraction output shapes ────────────────────────────────────────────────

export interface AiEntity {
  entityType:   EntityType;
  name:         string;
  aliases:      string[];
  context:      string;     // sentence from source where entity appears
  confidence:   number;     // 0–1
  matchedNodeId?: string;   // if matches existing node (from context provided to AI)
}

export interface AiClaim {
  claimText:    string;
  claimType:    ClaimType;
  confidence:   number;
  supportedBy?: string;     // evidence fragment from source
  relatedNodeId?: string;
}

export interface AiTimelineRef {
  year?:         number;
  yearStart?:    number;
  yearEnd?:      number;
  datePrecision?: DatePrecision;
  description:   string;
  period?:       string;
  confidence:    number;
  rawText:       string;    // verbatim from source
  relatedNodeId?: string;
}

export interface AiLocationRef {
  name:          string;
  locationType:  LocationType;
  modernName?:   string;
  lat?:          number;
  lon?:          number;
  confidence:    number;
  context:       string;
  relatedNodeId?: string;
}

export interface AiPotentialNode {
  suggestedTitle:         string;
  suggestedCategory:      string;
  suggestedDescription:   string;
  suggestedEvidenceLevel: string;
  suggestedConfidence:    number;
  suggestedTags:          string[];
  suggestedYear?:         number;
  suggestedLocation?:     string;
  reasoning:              string;
  aiConfidence:           number;
}

export interface AiContradiction {
  existingNodeId:    string;
  contradictionType: ContradictionType;
  description:       string;
  sourceClaimText:   string;
  nodeClaimText:     string;
  severity:          SuggestionSeverity;
  aiConfidence:      number;
}

export interface AiRelationshipHint {
  fromNodeId:   string;
  toNodeId:     string;
  relType:      string;
  reason:       string;
  confidence:   number;
}

export interface AiExtractionResult {
  entities:          AiEntity[];
  claims:            AiClaim[];
  timeline:          AiTimelineRef[];
  locations:         AiLocationRef[];
  potentialNodes:    AiPotentialNode[];
  contradictions:    AiContradiction[];
  relationshipHints: AiRelationshipHint[];
  summary:           string;
}

// ── Review queue item shapes ────────────────────────────────────────────────

export interface QueueItem {
  type:           'potential_node' | 'contradiction';
  id:             string;
  status:         SuggestionStatus;
  severity?:      SuggestionSeverity;
  title:          string;
  description:    string;
  sourceId:       string;
  sourceTitle:    string;
  aiConfidence:   number;
  createdAt:      string;
  meta:           Record<string, unknown>;
}
