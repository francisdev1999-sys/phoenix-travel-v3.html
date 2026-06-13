export type Classification =
  | 'KEEP'
  | 'REVIEW'
  | 'ARCHIVE_CANDIDATE'
  | 'DELETE_CANDIDATE'
  | 'BLACKLIST_CANDIDATE';

export interface AnalysisResult {
  itemType: 'node' | 'source';
  itemId: string;
  classification: Classification;
  relevanceScore: number;
  confidence: number;
  reasons: string[];
  risksIfKept: string[];
  risksIfDeleted: string[];
  recommendedAction: string;
  blacklistSuggestion: string | null;
}

export interface NodeCandidate {
  id: string;
  title: string;
  category: string;
  descriptionSummary: string;
  tags: string[];
  sourceCount: number;
  relationshipCount: number;
  evidenceLevel: string;
  confidenceScore: number;
  flagReasons: string[];
}

export interface SourceCandidate {
  id: string;
  title: string;
  url?: string;
  domain?: string;
  sourceType: string;
  linkedNodeId: string;
  linkedNodeTitle: string;
  author?: string;
  year?: number;
  flagReasons: string[];
}
