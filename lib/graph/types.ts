export type EvidenceLevel = 'verified' | 'strong_evidence' | 'debated' | 'speculative' | 'mythological';

export type DatePrecision = 'exact' | 'decade' | 'century' | 'millennium' | 'era';

export type RelationshipType =
  | 'historical'
  | 'geographical'
  | 'textual'
  | 'thematic'
  | 'influence'
  | 'contradictory';

export type SourceType =
  | 'archaeological'
  | 'academic'
  | 'primary_text'
  | 'historical_record'
  | 'cultural_tradition'
  | 'scientific'
  | 'journalistic';

export type ResearchSourceType =
  | 'Academic Paper'
  | 'Archaeological Report'
  | 'Government Document'
  | 'Declassified Document'
  | 'FOIA Release'
  | 'Court Record'
  | 'Museum Archive'
  | 'Historical Text'
  | 'Religious Text'
  | 'Book'
  | 'News Investigation'
  | 'Research Report'
  | 'Scientific Dataset'
  | 'Interview'
  | 'Witness Testimony'
  | 'Photograph'
  | 'Video Evidence'
  | 'Website'
  | 'Other';

export type NodeCategory =
  | 'Ancient Civilization'
  | 'Ancient Site'
  | 'Artifact'
  | 'Lost Knowledge'
  | 'Ancient Technology'
  | 'Forbidden Archaeology'
  | 'Alternative History'
  | 'Religion'
  | 'Mythology'
  | 'Ancient Text'
  | 'UFO / UAP'
  | 'Extraterrestrial Hypothesis'
  | 'Government Program'
  | 'Government Secrecy'
  | 'Intelligence Operation'
  | 'Secret Project'
  | 'Conspiracy Theory'
  | 'Historical Controversy'
  | 'Whistleblower'
  | 'Disease & Pandemic'
  | 'Unexplained Phenomenon'
  | 'Symbolism'
  | 'Esoterica'
  | 'Historical Figure'
  | 'Organization'
  | 'Technology'
  | 'Modern Mystery';

export interface ResearchSource {
  id: string;
  title: string;
  source_type: ResearchSourceType;
  author?: string;
  publication_year?: number;
  url?: string;
  credibility_score: number; // 0–1
  notes?: string;
  link_type?: 'supports' | 'contradicts' | 'references';
}

export interface GraphNode {
  id: string;
  title: string;
  category: NodeCategory;
  description: string;
  claims: string[];
  criticisms: string[];
  mainstream_view: string;
  open_questions?: string[];
  tags: string[];
  evidence_level: EvidenceLevel;
  confidence_score: number; // 0–1
  color?: string;
  icon?: string;
  coordinates?: [number, number]; // [lat, lon]
  year?: number;
  date_start?: number;
  date_end?: number;
  date_precision?: DatePrecision;
  region?: string;
  country?: string;
  sources?: ResearchSource[];
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relationship_type: RelationshipType;
  strength_score: number; // 0–1
  explanation: string;
  evidence_basis: string;
  source_type: SourceType;
  confidence_score: number; // 0–1
  source_count?: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  version: string;
  generated: string;
}

export interface GraphDiagnostics {
  node_count: number;
  edge_count: number;
  avg_confidence: number;
  avg_degree: number;
  orphan_nodes: GraphNode[];
  ghost_node_ids: string[];
  low_confidence_edges: GraphEdge[];
  duplicate_ids: string[];
  cluster_report: ClusterReport[];
  research_score_distribution: { low: number; medium: number; high: number };
}

export interface ClusterReport {
  category: NodeCategory;
  node_count: number;
  internal_edges: number;
  avg_confidence: number;
  density: number; // internal_edges / possible_internal_edges
}
