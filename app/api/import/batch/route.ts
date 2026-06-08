/**
 * POST /api/import/batch
 *
 * Batch-imports nodes (and optionally edges) from a JSON payload.
 * Admin-only. All accepted records enter as status='draft' — nothing auto-publishes.
 *
 * Request body:
 *   {
 *     nodes:   GraphNode[],          // required
 *     edges?:  GraphEdge[],          // optional
 *     dryRun?: boolean,              // if true: validate only, write nothing
 *     force?:  boolean,              // if true: admit soft-rejected (IQS < 40) nodes as draft
 *   }
 *
 * Response:
 *   {
 *     batchId:  string | null,       // null when dryRun=true
 *     dryRun:   boolean,
 *     summary:  { parsed, accepted, soft_rejected, rejected, warnings },
 *     records:  PerRecordResult[],
 *   }
 *
 * GET /api/import/batch — lists all import batches (admin-only)
 */

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateNode, validateEdge } from '@/lib/validation/schema';
import { computeIQS, type IQSTier } from '@/lib/validation/iqs';
import { findSimilarTitles, detectInBatchDuplicates } from '@/lib/validation/duplicates';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PerNodeRecord {
  index:         number;
  id:            string;
  title:         string;
  status:        'accepted' | 'rejected' | 'soft_rejected' | 'existing_draft_updated';
  iqsScore:      number;
  iqsTier:       IQSTier | 'rejected';
  errors:        { code: string; field: string; message: string }[];
  warnings:      { code: string; field: string; message: string }[];
  duplicates: {
    exactConflict:  boolean;
    existingStatus: string | null;
    similarTitles:  { id: string; title: string; similarity: number }[];
  };
}

interface PerEdgeRecord {
  index:   number;
  id:      string;
  from:    string;
  to:      string;
  status:  'accepted' | 'rejected';
  errors:  { code: string; field: string; message: string }[];
  warnings: { code: string; field: string; message: string }[];
}

// ── GET /api/import/batch — list all batches ─────────────────────────────────

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:            true,
      importedBy:    true,
      inputFormat:   true,
      parsedCount:   true,
      acceptedCount: true,
      rejectedCount: true,
      warningCount:  true,
      status:        true,
      rolledBackAt:  true,
      createdAt:     true,
    },
  });

  return NextResponse.json({ batches });
}

// ── POST /api/import/batch — run import ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawNodes  = Array.isArray(body.nodes)  ? body.nodes  as unknown[] : [];
  const rawEdges  = Array.isArray(body.edges)  ? body.edges  as unknown[] : [];
  const dryRun    = body.dryRun  === true;
  const force     = body.force   === true;

  if (rawNodes.length === 0) {
    return NextResponse.json({ error: 'nodes array is required and must be non-empty' }, { status: 400 });
  }
  if (rawNodes.length > 200) {
    return NextResponse.json({ error: 'Maximum 200 nodes per batch' }, { status: 400 });
  }

  // ── Step 1: In-batch duplicate detection ─────────────────────────────────
  const batchIds: { id: string; title: string }[] = rawNodes.map(n => {
    const node = n as Record<string, unknown>;
    return {
      id:    typeof node.id    === 'string' ? node.id.trim()    : '',
      title: typeof node.title === 'string' ? node.title.trim() : '',
    };
  });

  const { duplicateIds: inBatchDuplicateIds, similarPairs: inBatchSimilarPairs } =
    detectInBatchDuplicates(batchIds);

  // ── Step 2: Fetch existing nodes for DB-level duplicate checks ────────────
  const nonEmptyIds = [...new Set(batchIds.map(n => n.id).filter(Boolean))];
  const [existingByIds, existingForTitles] = await Promise.all([
    prisma.node.findMany({
      where: { id: { in: nonEmptyIds } },
      select: { id: true, status: true, importBatchId: true },
    }),
    prisma.node.findMany({
      select: { id: true, title: true },
      take:   500,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const existingIdMap = new Map(existingByIds.map(n => [n.id, n]));

  // ── Step 3: Validate and classify each node ───────────────────────────────
  const nodeRecords: PerNodeRecord[] = [];
  const acceptedNodeIds = new Set<string>(); // IDs of nodes accepted in this batch

  for (let i = 0; i < rawNodes.length; i++) {
    const raw = rawNodes[i];
    const node = raw as Record<string, unknown>;
    const id    = typeof node.id    === 'string' ? node.id.trim()    : '';
    const title = typeof node.title === 'string' ? node.title.trim() : '';

    // Schema validation
    const validation = validateNode(raw);
    const iqs        = computeIQS(raw);

    // In-batch exact duplicate: reject second occurrence
    const inBatchDupIndices = inBatchDuplicateIds.get(id) ?? [];
    const isInBatchDuplicate = inBatchDupIndices.length > 1 && inBatchDupIndices[0] !== i;

    if (isInBatchDuplicate) {
      validation.errors.push({
        code:    'D001',
        field:   'id',
        message: `Duplicate id '${id}' within this import batch (first at index ${inBatchDupIndices[0]})`,
      });
    }

    // In-batch title similarity
    const inBatchSimilar = inBatchSimilarPairs
      .filter(p => p.a === i || p.b === i)
      .map(p => ({
        id:         batchIds[p.a === i ? p.b : p.a].id,
        title:      batchIds[p.a === i ? p.b : p.a].title,
        similarity: p.similarity,
      }));

    // DB exact ID conflict
    const existing = existingIdMap.get(id);
    let exactConflict  = !!existing;
    let existingStatus = existing?.status ?? null;

    if (existing?.status === 'published') {
      validation.errors.push({
        code:    'D002',
        field:   'id',
        message: `Node '${id}' already exists with status='published'. Cannot overwrite published nodes.`,
      });
    } else if (existing?.status === 'draft') {
      validation.warnings.push({
        code:    'D003',
        field:   'id',
        message: `Node '${id}' already exists as a draft — import will update it.`,
      });
    }

    // DB title similarity (only bother if no hard errors yet)
    const dbSimilarTitles = validation.errors.length === 0 && title
      ? findSimilarTitles(title, existingForTitles.filter(n => n.id !== id))
      : [];

    if (dbSimilarTitles.length > 0) {
      validation.warnings.push({
        code:    'D004',
        field:   'title',
        message: `Title '${title}' is similar to existing node(s): ${dbSimilarTitles.map(t => `'${t.title}' (${Math.round(t.similarity * 100)}%)`).join(', ')}`,
      });
    }

    // Combine similar title warnings
    const allSimilar = [
      ...inBatchSimilar.map(s => ({ ...s, source: 'batch' as const })),
      ...dbSimilarTitles.map(s => ({ ...s, source: 'db' as const })),
    ];

    // Determine final status
    let status: PerNodeRecord['status'];
    if (validation.status === 'rejected') {
      status = 'rejected';
    } else if (!force && iqs.tier === 'soft_rejected') {
      status = 'soft_rejected';
    } else if (existing?.status === 'draft') {
      status = 'existing_draft_updated';
      acceptedNodeIds.add(id);
    } else {
      status = 'accepted';
      acceptedNodeIds.add(id);
    }

    nodeRecords.push({
      index:    i,
      id,
      title,
      status,
      iqsScore: iqs.score,
      iqsTier:  validation.status === 'rejected' ? 'rejected' : iqs.tier,
      errors:   validation.errors,
      warnings: validation.warnings,
      duplicates: {
        exactConflict,
        existingStatus,
        similarTitles: allSimilar.map(s => ({
          id:         s.id,
          title:      s.title,
          similarity: s.similarity,
        })),
      },
    });
  }

  // ── Step 4: Validate edges ────────────────────────────────────────────────
  // Edges can reference nodes from this batch OR existing DB nodes.
  // Build the full set of known IDs.
  const existingDbNodeIds = new Set(existingForTitles.map(n => n.id));
  const allKnownNodeIds   = new Set([...acceptedNodeIds, ...existingDbNodeIds]);

  const edgeRecords: PerEdgeRecord[] = [];
  const acceptedEdges: unknown[] = [];

  for (let i = 0; i < rawEdges.length; i++) {
    const raw = rawEdges[i];
    const edge = raw as Record<string, unknown>;
    const id   = typeof edge.id   === 'string' ? edge.id.trim()   : `edge-${i}`;
    const from = typeof edge.from === 'string' ? edge.from.trim() : '';
    const to   = typeof edge.to   === 'string' ? edge.to.trim()   : '';

    const validation = validateEdge(raw, allKnownNodeIds);

    edgeRecords.push({
      index:    i,
      id,
      from,
      to,
      status:   validation.status,
      errors:   validation.errors,
      warnings: validation.warnings,
    });

    if (validation.status === 'accepted') acceptedEdges.push(raw);
  }

  // ── Step 5: Build summary ─────────────────────────────────────────────────
  const acceptedNodes   = nodeRecords.filter(r => r.status === 'accepted' || r.status === 'existing_draft_updated');
  const rejectedNodes   = nodeRecords.filter(r => r.status === 'rejected');
  const softRejected    = nodeRecords.filter(r => r.status === 'soft_rejected');
  const totalWarnings   = nodeRecords.reduce((s, r) => s + r.warnings.length, 0) +
                          edgeRecords.reduce((s, r) => s + r.warnings.length, 0);

  const summary = {
    nodes_parsed:       rawNodes.length,
    nodes_accepted:     acceptedNodes.length,
    nodes_soft_rejected: softRejected.length,
    nodes_rejected:     rejectedNodes.length,
    edges_parsed:       rawEdges.length,
    edges_accepted:     edgeRecords.filter(r => r.status === 'accepted').length,
    edges_rejected:     edgeRecords.filter(r => r.status === 'rejected').length,
    total_warnings:     totalWarnings,
  };

  if (dryRun) {
    return NextResponse.json({
      batchId:  null,
      dryRun:   true,
      summary,
      nodeRecords,
      edgeRecords,
    });
  }

  if (acceptedNodes.length === 0 && acceptedEdges.length === 0) {
    return NextResponse.json({
      batchId:  null,
      dryRun:   false,
      summary,
      nodeRecords,
      edgeRecords,
      message: 'Nothing to import — all records were rejected or soft-rejected.',
    });
  }

  // ── Step 6: Write to DB in a transaction ──────────────────────────────────

  // Pre-resolve categories for all accepted nodes
  const uniqueCategories = [...new Set(
    acceptedNodes
      .map(r => rawNodes[r.index] as Record<string, unknown>)
      .map(n => n.category as string)
      .filter(Boolean),
  )];

  const categoryMap = new Map<string, string>(); // categoryName → categoryId
  for (const catName of uniqueCategories) {
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cat  = await prisma.category.upsert({
      where:  { slug },
      create: { slug, name: catName },
      update: {},
    });
    categoryMap.set(catName, cat.id);
  }

  const batchId = await prisma.$transaction(async (tx) => {
    // Create the batch record
    const batch = await tx.importBatch.create({
      data: {
        importedBy:      session!.user!.id ?? null,
        inputFormat:     'json',
        parsedCount:     rawNodes.length,
        acceptedCount:   acceptedNodes.length,
        rejectedCount:   rejectedNodes.length,
        warningCount:    totalWarnings,
        validationReport: { nodeRecords, edgeRecords } as object,
        status:          'committed',
      },
    });

    // Write accepted nodes
    for (const record of acceptedNodes) {
      const raw    = rawNodes[record.index] as Record<string, unknown>;
      const nodeId = record.id;
      const catId  = categoryMap.get(raw.category as string)!;

      const coords = Array.isArray(raw.coordinates) ? raw.coordinates as number[] : null;
      const tags   = Array.isArray(raw.tags)   ? (raw.tags   as unknown[]).map(String) : [];
      const claims = Array.isArray(raw.claims) ? (raw.claims as unknown[]).map(String) : [];
      const crits  = Array.isArray(raw.criticisms) ? (raw.criticisms as unknown[]).map(String) : [];
      const openQs = Array.isArray(raw.open_questions) ? (raw.open_questions as unknown[]).map(String) : [];

      const nodeData = {
        title:           String(raw.title ?? '').trim(),
        categoryId:      catId,
        description:     String(raw.description ?? '').trim(),
        mainstreamView:  raw.mainstream_view ? String(raw.mainstream_view).trim() : null,
        evidenceLevel:   String(raw.evidence_level ?? 'speculative'),
        confidenceScore: Number(raw.confidence_score ?? 0.5),
        color:           raw.color ? String(raw.color) : null,
        icon:            raw.icon  ? String(raw.icon)  : null,
        lat:             coords ? coords[0] : null,
        lon:             coords ? coords[1] : null,
        region:          raw.region  ? String(raw.region)  : null,
        country:         raw.country ? String(raw.country) : null,
        year:            raw.year != null ? Number(raw.year) : null,
        dateStart:       raw.date_start != null ? Number(raw.date_start) : null,
        dateEnd:         raw.date_end   != null ? Number(raw.date_end)   : null,
        datePrecision:   raw.date_precision ? String(raw.date_precision) : null,
        status:          'draft' as const,
        importBatchId:   batch.id,
      };

      if (record.status === 'existing_draft_updated') {
        // Upsert: update the existing draft
        await tx.node.update({ where: { id: nodeId }, data: nodeData });
        await tx.nodeTag.deleteMany({ where: { nodeId } });
        await tx.claim.deleteMany({ where: { nodeId } });
        await tx.criticism.deleteMany({ where: { nodeId } });
        await tx.openQuestion.deleteMany({ where: { nodeId } });
      } else {
        await tx.node.create({ data: { id: nodeId, ...nodeData } });
      }

      // Tags
      if (tags.length > 0) {
        await tx.nodeTag.createMany({
          data: tags.map(tag => ({ nodeId, tag: tag.toLowerCase().trim() })),
          skipDuplicates: true,
        });
      }

      // Claims
      if (claims.length > 0) {
        await tx.claim.createMany({
          data: claims.map((text, i) => ({ nodeId, text, orderIndex: i })),
        });
      }

      // Criticisms
      if (crits.length > 0) {
        await tx.criticism.createMany({
          data: crits.map((text, i) => ({ nodeId, text, orderIndex: i })),
        });
      }

      // Open questions
      if (openQs.length > 0) {
        await tx.openQuestion.createMany({
          data: openQs.map((text, i) => ({ nodeId, text, orderIndex: i })),
        });
      }

      // Version snapshot (sources embedded in snapshot for admin reference)
      await tx.nodeVersion.create({
        data: {
          nodeId,
          version:    1,
          snapshot:   raw as object,
          changedBy:  session!.user!.id ?? null,
          changeNote: `Imported via batch ${batch.id}`,
        },
      });
    }

    // Write accepted edges
    for (const raw of acceptedEdges) {
      const e = raw as Record<string, unknown>;
      try {
        await tx.edge.upsert({
          where: { fromId_toId: { fromId: String(e.from), toId: String(e.to) } },
          create: {
            fromId:          String(e.from),
            toId:            String(e.to),
            relationshipType: String(e.relationship_type),
            strengthScore:   Number(e.strength_score ?? 0.5),
            confidenceScore: Number(e.confidence_score ?? 0.5),
            explanation:     String(e.explanation ?? '').trim(),
            evidenceBasis:   String(e.evidence_basis ?? '').trim(),
            sourceType:      String(e.source_type ?? 'academic'),
            sourceCount:     e.source_count != null ? Number(e.source_count) : null,
            status:          'draft',
            importBatchId:   batch.id,
          },
          update: {
            relationshipType: String(e.relationship_type),
            strengthScore:   Number(e.strength_score ?? 0.5),
            confidenceScore: Number(e.confidence_score ?? 0.5),
            explanation:     String(e.explanation ?? '').trim(),
            evidenceBasis:   String(e.evidence_basis ?? '').trim(),
            sourceType:      String(e.source_type ?? 'academic'),
            importBatchId:   batch.id,
          },
        });
      } catch {
        // Edge upsert failures are non-fatal — node writes succeed regardless
      }
    }

    return batch.id;
  });

  return NextResponse.json(
    {
      batchId,
      dryRun:     false,
      summary,
      nodeRecords,
      edgeRecords,
      message:    `Batch ${batchId}: ${acceptedNodes.length} node(s) created as draft. Use POST /api/nodes/:id/publish to make individual nodes live.`,
    },
    { status: 201 },
  );
}
