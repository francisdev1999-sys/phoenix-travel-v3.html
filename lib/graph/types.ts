export type EvidenceLevel = 'verified' | 'debated' | 'speculative';

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

export type NodeCategory =
  | 'Ancient Civilizations'
  | 'Egypt & Ancient Engineering'
  | 'Religious Texts & Mythology'
  | 'UFO / UAP'
  | 'Human Origins'
  | 'Consciousness & Reality'
  | 'Secret Societies & Esoteric'
  | 'Global Mysteries'
  | 'Legends & Folklore';

export interface GraphNode {
  id: string;
  title: string;
  category: NodeCategory;
  description: string;
  claims: string[];
  criticisms: string[];
  mainstream_view: string;
  tags: string[];
  evidence_level: EvidenceLevel;
  confidence_score: number; // 0–1
  color?: string;
  icon?: string;
  coordinates?: [number, number]; // [lat, lon]
  year?: number; // rough date for timeline
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
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  version: string;
  generated: string;
}
