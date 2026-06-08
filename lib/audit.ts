import { prisma } from '@/lib/db';

export type AuditAction =
  | 'publish' | 'unpublish' | 'archive' | 'restore'
  | 'edit' | 'approve' | 'reject' | 'needs_revision'
  | 'import' | 'rollback'
  | 'bulk_approve' | 'bulk_reject' | 'bulk_publish';

export type AuditEntityType = 'node' | 'edge' | 'batch' | 'suggestion';

interface AuditEntry {
  userId?:    string | null;
  userEmail?: string | null;
  action:     AuditAction;
  entityType: AuditEntityType;
  entityId:   string;
  detail?:    Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).auditLog.create({
      data: {
        userId:     entry.userId    ?? null,
        userEmail:  entry.userEmail ?? null,
        action:     entry.action,
        entityType: entry.entityType,
        entityId:   entry.entityId,
        detail:     entry.detail ?? null,
      },
    });
  } catch (err) {
    // Audit failures must never break business operations
    console.error('[audit] write failed:', err);
  }
}
