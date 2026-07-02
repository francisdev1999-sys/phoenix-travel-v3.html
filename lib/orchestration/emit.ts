/**
 * Orchestration event emitter.
 *
 * Call emit() after any significant archive mutation to:
 *   1. Write an immutable ArchiveEvent log entry.
 *   2. Enqueue background jobs derived from the event type.
 *
 * All job enqueuing is fire-and-forget — errors are caught and logged so that
 * the primary mutation (the caller) is never blocked or rolled back.
 */

import { prisma } from '@/lib/db';
import { enqueue, type JobType } from '@/lib/jobs/queue';
import { maybeAutoTrain } from '@/lib/learning/trainer';

// Events that change the learning model's labeled dataset (fresh positive /
// negative signal) and should trigger a background auto-retrain check.
const AUTO_TRAIN_EVENTS = new Set(['node.published', 'node.archived']);

// ── Event catalogue ───────────────────────────────────────────────────────────

export type ArchiveEventType =
  | 'node.created'
  | 'node.updated'
  | 'node.published'
  | 'node.archived'
  | 'node.deleted'
  | 'source.created'
  | 'source.approved'
  | 'source.linked'
  | 'source.archived'
  | 'edge.created'
  | 'edge.published';

export interface EmitOptions {
  entityType: 'node' | 'source' | 'edge';
  entityId:   string;
  actorEmail?: string;
  metadata?:   Record<string, unknown>;
  // For edge events: the two endpoint node ids. Node-keyed jobs (rebuild-adjacency,
  // similarity-node, etc.) target these instead of the edge's own id, which isn't
  // a valid nodeId.
  nodeIds?: [string, string];
}

// ── Event → job mapping ───────────────────────────────────────────────────────
// Each entry lists the job types to enqueue when that event fires.
// Jobs receive the same entityId as the event (adjusted per job's payload shape).

type JobSpec = { type: JobType; priority?: number };

const EVENT_JOB_MAP: Record<ArchiveEventType, JobSpec[]> = {
  'node.created':   [
    { type: 'embed-node',         priority: 60 },
    { type: 'rebuild-adjacency',  priority: 50 },
    { type: 'update-maturity',    priority: 40 },
  ],
  'node.updated':   [
    { type: 'embed-node',         priority: 55 },
    { type: 'update-maturity',    priority: 40 },
  ],
  'node.published': [
    { type: 'embed-node',            priority: 70 },
    { type: 'rebuild-adjacency',     priority: 65 },
    { type: 'similarity-node',       priority: 60 },
    { type: 'suggest-relationships', priority: 55 },
    { type: 'update-maturity',       priority: 50 },
  ],
  'node.archived':  [
    { type: 'propagate-archive', priority: 80 },
    { type: 'update-maturity',   priority: 40 },
  ],
  'node.deleted':   [],
  'source.created': [
    { type: 'embed-source',   priority: 60 },
  ],
  'source.approved': [
    { type: 'embed-source',   priority: 65 },
    { type: 'enrich-source',  priority: 55 },
  ],
  'source.linked':  [
    { type: 'update-maturity', priority: 45 },
  ],
  'source.archived': [],
  'edge.created':   [
    { type: 'rebuild-adjacency', priority: 70 },
    { type: 'similarity-node',   priority: 55 },
    { type: 'update-maturity',   priority: 45 },
  ],
  'edge.published': [
    { type: 'rebuild-adjacency',     priority: 75 },
    { type: 'similarity-node',       priority: 65 },
    { type: 'suggest-relationships', priority: 60 },
    { type: 'update-maturity',       priority: 50 },
  ],
};

// ── Public API ────────────────────────────────────────────────────────────────

export async function emit(
  eventType: ArchiveEventType,
  opts: EmitOptions,
): Promise<void> {
  const { entityType, entityId, actorEmail, metadata = {}, nodeIds } = opts;

  // 1. Write immutable event log (best-effort — never throw to caller)
  try {
    await prisma.archiveEvent.create({
      data: { eventType, entityType, entityId, actorEmail: actorEmail ?? null, metadata: metadata as object },
    });
  } catch (err) {
    console.error(`[orchestration] Failed to write ArchiveEvent (${eventType}/${entityId}):`, err);
  }

  // As the archive grows, let the model retrain itself on the new labeled data.
  // Fire-and-forget: gated + de-duped inside, and it must never block the caller.
  if (AUTO_TRAIN_EVENTS.has(eventType)) {
    void maybeAutoTrain().catch(() => {});
  }

  // Node-keyed jobs need a real nodeId. For edge events that's the edge's two
  // endpoints (caller must supply nodeIds); for node events it's entityId itself.
  const targetNodeIds = entityType === 'edge' ? (nodeIds ?? []) : [entityId];

  // 2. Enqueue derived jobs (fire-and-forget, errors logged per job)
  const specs = EVENT_JOB_MAP[eventType] ?? [];
  await Promise.allSettled(
    specs.flatMap(({ type, priority = 50 }) => {
      const enqueueOne = async (nodeId: string) => {
        try {
          await enqueue(type, { nodeId }, priority);
        } catch (err) {
          console.error(`[orchestration] Failed to enqueue ${type} for ${nodeId}:`, err);
        }
      };

      if (type === 'embed-node' || type === 'rebuild-adjacency' ||
          type === 'similarity-node' || type === 'suggest-relationships' ||
          type === 'propagate-archive') {
        return targetNodeIds.map(enqueueOne);
      }
      if (type === 'embed-source' || type === 'enrich-source') {
        return [enqueue(type, { sourceId: entityId }, priority).catch(err =>
          console.error(`[orchestration] Failed to enqueue ${type} for ${entityId}:`, err))];
      }
      if (type === 'update-maturity') {
        return [enqueue(type, { entityType: entityType as 'node' | 'source', entityId }, priority).catch(err =>
          console.error(`[orchestration] Failed to enqueue ${type} for ${entityId}:`, err))];
      }
      return [];
    }),
  );
}
