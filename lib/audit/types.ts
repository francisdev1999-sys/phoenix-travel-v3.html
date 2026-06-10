export type FindingType =
  | 'orphan' | 'stale_edge' | 'weak_edge' | 'missing_fields'
  | 'duplicate' | 'source_quality' | 'ai_quality' | 'category_mismatch';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingStatus   = 'pending' | 'approved' | 'denied' | 'applied';
export type RunStatus       = 'running' | 'complete' | 'failed';

export interface AuditFinding {
  id:          string;
  runId:       string;
  type:        FindingType;
  severity:    FindingSeverity;
  status:      FindingStatus;
  nodeId?:     string | null;
  edgeId?:     string | null;
  title:       string;
  description: string;
  beforeState: Record<string, unknown>;
  afterState:  Record<string, unknown>;
  reasoning:   string;
  autoFixable: boolean;
  reviewedBy?: string | null;
  reviewedAt?: Date   | null;
  appliedAt?:  Date   | null;
  applyError?: string | null;
}

export interface AuditRunSummary {
  total:       number;
  byType:      Record<string, number>;
  bySeverity:  Record<string, number>;
  autoFixable: number;
}

export interface AuditRun {
  id:           string;
  status:       RunStatus;
  triggeredBy:  string;
  startedAt:    Date;
  completedAt?: Date | null;
  summary:      AuditRunSummary | Record<string, unknown>;
  settings:     AuditSettings;
  findings?:    AuditFinding[];
  _count?:      { findings: number };
}

export interface AuditSettings {
  checks: {
    orphans: boolean; staleEdges: boolean; weakEdges: boolean;
    missingFields: boolean; duplicates: boolean; sourceQuality: boolean;
    aiQuality: boolean; categoryMismatch: boolean;
  };
  aiModel: string;
  maxNodesPerAiRun: number; maxFindingsPerRun: number;
  weakEdgeThreshold: number; duplicateTitleThreshold: number;
  autoApproveOrphans: boolean; autoApproveStaleEdges: boolean; autoApproveWeakEdges: boolean;
}

export const DEFAULT_AUDIT_SETTINGS: AuditSettings = {
  checks: {
    orphans: true, staleEdges: true, weakEdges: true,
    missingFields: true, duplicates: true, sourceQuality: true,
    aiQuality: true, categoryMismatch: true,
  },
  aiModel: 'claude-haiku-4-5-20251001',
  maxNodesPerAiRun: 80, maxFindingsPerRun: 200,
  weakEdgeThreshold: 0.25, duplicateTitleThreshold: 0.70,
  autoApproveOrphans: false, autoApproveStaleEdges: true, autoApproveWeakEdges: false,
};

export const FINDING_LABELS: Record<FindingType, string> = {
  orphan: 'Orphan Node', stale_edge: 'Stale Connection', weak_edge: 'Weak Connection',
  missing_fields: 'Incomplete Node', duplicate: 'Possible Duplicate',
  source_quality: 'Source Quality', ai_quality: 'AI Quality Flag', category_mismatch: 'Category Mismatch',
};

export const SEVERITY_COLOR: Record<FindingSeverity, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e',
};
