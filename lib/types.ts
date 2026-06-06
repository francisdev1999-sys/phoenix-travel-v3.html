export interface Theory {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  overview: string;
  historicalBackground: string;
  mainClaims: string[];
  evidence: EvidenceItem[];
  criticisms: string[];
  mainstreamPerspective: string;
  sources: Source[];
  relatedTopics: string[];
  timelinePlacement: string;
  geographicConnections: string[];
  coordinates?: [number, number];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  connections: string[];
  color: string;
  icon: string;
  position?: { x: number; y: number; z: number };
  featured?: boolean;
}

export interface EvidenceItem {
  title: string;
  description: string;
  type: 'artifact' | 'text' | 'site' | 'observation' | 'testimony' | 'document';
  contested: boolean;
}

export interface Source {
  title: string;
  author?: string;
  year?: number;
  type: 'book' | 'journal' | 'documentary' | 'website' | 'academic' | 'ancient_text';
  url?: string;
}

export interface TimelineEvent {
  id: string;
  year: number;
  era: 'ancient' | 'classical' | 'medieval' | 'modern' | 'contemporary';
  title: string;
  description: string;
  relatedTheories: string[];
  location?: string;
}

export interface AncientSite {
  id: string;
  name: string;
  coordinates: [number, number];
  type: 'pyramid' | 'megalith' | 'ufo_hotspot' | 'mystery' | 'ancient_city';
  description: string;
  relatedTheories: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockCondition: string;
  xpReward: number;
}

export interface UserProgress {
  theoriesExplored: string[];
  connectionsDiscovered: string[];
  rabbitHoleDepth: number;
  achievements: string[];
  xp: number;
  level: string;
  recentDiscoveries: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  category: string;
  connections: string[];
  x?: number;
  y?: number;
  z?: number;
  color: string;
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: number;
}
