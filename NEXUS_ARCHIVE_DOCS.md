# NEXUS ARCHIVE — Complete Technical Documentation

> **Last updated:** 2026-06-11  
> **Stack:** Next.js 16 · React 19 · Prisma 7 · PostgreSQL · Anthropic Claude · Three.js

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [API Routes Reference](#5-api-routes-reference)
6. [Business Logic Libraries](#6-business-logic-libraries)
7. [Component Architecture](#7-component-architecture)
8. [Pages & Client-Side Routing](#8-pages--client-side-routing)
9. [State Management](#9-state-management)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [AI Integration](#11-ai-integration)
12. [Archive Audit System](#12-archive-audit-system)
13. [Trust & Governance System](#13-trust--governance-system)
14. [Knowledge Graph Features](#14-knowledge-graph-features)
15. [Source Credibility Engine](#15-source-credibility-engine)
16. [Import & Batch System](#16-import--batch-system)
17. [Search System](#17-search-system)
18. [Migrations History](#18-migrations-history)
19. [Environment Variables](#19-environment-variables)
20. [Security](#20-security)
21. [Performance & Caching](#21-performance--caching)
22. [Development & Deployment](#22-development--deployment)
23. [Testing](#23-testing)
24. [Design Principles & Guarantees](#24-design-principles--guarantees)
25. [Known Limitations](#25-known-limitations)

---

## 1. Project Overview

**Nexus Archive** is a full-stack interactive knowledge graph that explores conspiracy theories, alternative history, ancient mysteries, and unexplained phenomena. It combines a curated, evidence-backed archive with a community-driven contribution system, AI-powered review, and a sophisticated trust/governance layer.

### Core Purpose

| Pillar | Description |
|--------|-------------|
| **Knowledge Graph** | Nodes (entities/events) and Edges (relationships) form a navigable graph |
| **Community Contributions** | Any authenticated user can propose new nodes, edges, and sources |
| **Evidence Integrity** | Every node requires sources, claims, criticisms, and a mainstream view |
| **AI Assistance** | Claude audits submissions, generates narratives, and scans the archive |
| **Transparent Moderation** | Every action is logged; no auto-publishing; admin approval required |

### What Makes It Different

- **No echo chambers**: Every node must carry criticisms and mainstream views alongside claims
- **Source credibility scoring**: Automatic + admin-override credibility signals
- **Time-decayed trust**: Good history persists; mistakes fade — both measured in days, not forever
- **Suggestion engine**: AI proposes relationships but never publishes them
- **Full audit trail**: Every publish, edit, approval, ban is immutably logged

---

## 2. Technology Stack

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.7 | App Router, RSC, Server Actions |
| `react` | 19.2.4 | UI library |
| `typescript` | 5.x | Type safety |

### Database & ORM
| Package | Version | Purpose |
|---------|---------|---------|
| `prisma` | 7.8.0 | ORM + migration runner |
| `@prisma/client` | 7.8.0 | Generated DB client |
| PostgreSQL | — | Primary database (Railway) |
| `pgvector` | extension | Vector embeddings for semantic search |
| `pg_trgm` | extension | Fuzzy string matching |

### Authentication
| Package | Version | Purpose |
|---------|---------|---------|
| `next-auth` | 5.0.0-beta.31 | OAuth (Google + GitHub) |
| `@auth/prisma-adapter` | — | DB session persistence |

### AI
| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/sdk` | — | Claude API (node audits, narratives, archive audit) |

### 3D Visualization
| Package | Version | Purpose |
|---------|---------|---------|
| `three` | — | 3D rendering engine |
| `@react-three/fiber` | — | React bindings for Three.js |
| `@react-three/drei` | — | Helper components for R3F |

### UI & Animation
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 4 | Utility-first CSS |
| `framer-motion` | — | Animations and transitions |
| `lucide-react` | — | Icon system |

### Infrastructure
| Package | Purpose |
|---------|---------|
| `@upstash/ratelimit` | Redis-backed rate limiting |
| `@sentry/nextjs` | Error tracking + source maps |
| `zustand` | Client-side state management |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React 19)                │
│  KnowledgeGraph  TimelineExplorer  RabbitHoleView   │
│  AncientGlobe    AdminPanel        EvidenceBoard     │
│              Zustand UserStore                       │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / NextAuth session
┌──────────────────────▼──────────────────────────────┐
│              Next.js 16 App Router                   │
│  /api/graph  /api/search  /api/rabbit-hole/[nodeId] │
│  /api/nodes  /api/edges   /api/sources              │
│  /api/admin/*            /api/cron/*                │
│  middleware.ts → auth check + security headers      │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma client
┌──────────────────────▼──────────────────────────────┐
│              PostgreSQL (Railway)                    │
│  pg_trgm · pgvector · tsvector full-text            │
└─────────────────────────────────────────────────────┘
                  ↕ API calls
┌─────────────────────────────────────────────────────┐
│   External Services                                  │
│   Anthropic Claude API  ·  Upstash Redis            │
│   Sentry  ·  Wikipedia API  ·  Wikidata API         │
└─────────────────────────────────────────────────────┘
```

### Request Lifecycle (Example: Propose Node)

```
User submits form
  → POST /api/nodes/propose
  → middleware.ts checks auth + rate limit
  → quality-gates.ts (trust check, rate limit, risk keywords)
  → Prisma: insert ProposedNode (status='pending')
  → after() fires async:
      → runAiAudit(nodeId)         [Claude review, no blocking]
      → runSimilarityCheck(nodeId) [detect duplicates, no blocking]
  → Response returns immediately with { proposedNodeId }
Admin sees it in Draft Queue → approves → node published
```

---

## 4. Database Schema

### 4.1 Authentication Models

#### `User`
The core identity record.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `email` | String (unique) | Login identifier |
| `name` | String? | Display name |
| `image` | String? | Avatar URL |
| `role` | String | `owner\|admin\|moderation_admin\|reviewer\|source_verifier\|verified_contributor\|contributor\|user\|banned` |
| `rank` | String | Display rank (computed, see §13) |
| `trustScore` | Float | 0–100, time-decayed |
| `activityScore` | Float | Cumulative activity |
| `submissionCount` | Int | Total proposals submitted |
| `approvedCount` | Int | Total approved |
| `rejectedCount` | Int | Total rejected |
| `isBanned` | Boolean | Hard ban flag |
| `banExpiresAt` | DateTime? | Expiry for temporary bans |
| `warningCount` | Int | Accumulated warnings |
| `createdAt` | DateTime | Account age |

#### Supporting Auth Models
- **`Account`** — OAuth provider linkage (Google / GitHub)
- **`Session`** — JWT session storage
- **`VerificationToken`** — Email verification tokens

---

### 4.2 Knowledge Graph — Core Models

#### `Node`
The primary knowledge entity (a person, place, event, artifact, text, etc.).

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Slug-style identifier |
| `title` | String | Display name |
| `description` | String (Text) | Main description |
| `evidenceLevel` | String | `verified\|strong_evidence\|debated\|speculative\|mythological` |
| `confidenceScore` | Float | 0–1 overall confidence |
| `mainstreamView` | String? | Mainstream academic position |
| `status` | String | `draft\|published\|archived` |
| `adminReviewStatus` | String? | `pending\|approved\|needs_revision\|review_required\|needs_enrichment` |
| `year` | Int? | Point-in-time year |
| `dateStart` | Int? | Period start year |
| `dateEnd` | Int? | Period end year |
| `datePrecision` | String? | `year\|decade\|century\|millennium` |
| `lat` | Float? | Geographic latitude |
| `lon` | Float? | Geographic longitude |
| `region` | String? | Geographic region |
| `country` | String? | Country name |
| `categoryId` | String | FK → Category |
| `importBatchId` | String? | FK → ImportBatch (for rollback) |
| `search_vector` | tsvector | PostgreSQL FTS vector (auto-updated) |

Relations: `tags`, `claims`, `criticisms`, `openQuestions`, `sourceLinks`, `edgesFrom`, `edgesTo`, `versions`, `explorations`, `narrative`

#### `Edge`
Relationships between nodes.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `fromId` | String | FK → Node |
| `toId` | String | FK → Node |
| `relationshipType` | String | `historical\|geographical\|textual\|thematic\|influence\|contradictory\|alternative_explanation\|criticism` |
| `strengthScore` | Float | 0–1 relationship strength |
| `confidenceScore` | Float | 0–1 confidence |
| `evidenceBasis` | String? | What the connection is based on |
| `explanation` | String (Text) | Human-readable description |
| `sourceType` | String? | Research classification |
| `status` | String | `draft\|published` |

#### `Category`
Hierarchical taxonomy for nodes.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | — |
| `name` | String | E.g. "Ancient Civilizations" |
| `slug` | String (unique) | URL-safe |
| `color` | String? | Hex color for UI |
| `parentId` | String? | FK → Category (tree structure) |

**27 built-in categories** including: Ancient Civilization, UFO/UAP, Artifact, Lost Knowledge, Forbidden Archaeology, Secret Projects, Hidden History, Sacred Geometry, Unexplained Phenomena, and more.

#### `NodeTag`
Many-to-many tags on nodes (searchable, indexed).

#### `NodeVersion`
Immutable snapshots of node state (enables rollback and diff views).

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | — |
| `nodeId` | String | FK → Node |
| `versionNumber` | Int | Auto-incrementing |
| `snapshot` | Json | Full node state at time of save |
| `changedBy` | String | User ID |
| `changeNote` | String? | Reason for edit |
| `createdAt` | DateTime | — |

---

### 4.3 Content Sub-Models

#### `Claim`
First-class claims attached to a node.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | — |
| `nodeId` | String | FK → Node |
| `text` | String (Text) | Claim statement |
| `evidenceLevel` | String | Claim-specific evidence |
| `sourceLinks` | SourceLink[] | Supporting sources |

#### `Criticism`
Counter-arguments attached to a node.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | — |
| `nodeId` | String | FK → Node |
| `text` | String (Text) | Criticism statement |
| `sourceLinks` | SourceLink[] | Supporting sources |

#### `OpenQuestion`
Research gaps on a node.

---

### 4.4 Source & Credibility Models

#### `Source`
A bibliographic source record.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | — |
| `title` | String | Publication title |
| `sourceType` | String | One of 19 types (Academic Paper, Book, etc.) |
| `author` | String? | Author name(s) |
| `publicationYear` | Int? | Year of publication |
| `publisher` | String? | Publisher name |
| `journal` | String? | Journal name |
| `volume` / `issue` / `pages` | String? | Citation details |
| `url` | String? | Online location |
| `doi` | String? | Digital Object Identifier |
| `isbn` | String? | Book identifier |
| `abstract` | String (Text)? | Summary |
| `credibilityScore` | Float | Auto-computed (see §15) |
| `credibilityFactors` | Json | Breakdown of scoring signals |
| `credibilityOverride` | Float? | Admin manual override |
| `overriddenBy` | String? | Admin user ID |
| `overrideReason` | String? | Justification |
| `status` | String | `pending\|approved` |
| `submittedBy` | String? | User ID |
| `sourceTrustExplanation` | String? | Submitter's credibility rationale |

#### `SourceLink`
Junction table connecting a source to a node, claim, criticism, or edge.

| Field | Type | Notes |
|-------|------|-------|
| `linkType` | String | `primary\|supports\|contradicts\|context\|references` |
| `relevanceScore` | Float | 0–1 relevance |
| `pageReference` | String? | Specific page/section cited |

#### `SourceEmbedding`
Vector embedding for semantic source search (text-embedding-3-small, 1536 dims).

---

### 4.5 Community Proposal Models

#### `ProposedNode`
A draft node submission awaiting admin review.

| Field | Type | Notes |
|-------|------|-------|
| All Node fields | — | Same as Node |
| `status` | String | `pending\|approved\|rejected\|needs_revision` |
| `submittedBy` | String | User ID |
| `reviewedBy` | String? | Admin user ID |
| `reviewedAt` | DateTime? | — |
| `reviewNotes` | String? | Admin feedback |
| `aiAuditResult` | Json? | Async Claude audit result |
| `aiAuditedAt` | DateTime? | When audit ran |
| `proposalSimilarity` | Json? | Async similarity vs. archive |

#### `ProposedEdge`
A draft edge submission awaiting admin review.

| Field | Type | Notes |
|-------|------|-------|
| `fromNodeId` | String | Source node |
| `toNodeId` | String | Target node |
| `relationship` | String | Relationship type |
| `description` | String | Explanation |
| `evidenceLevel` | String | — |
| `confidenceScore` | Float | 0–1 |
| `strengthScore` | Float | 0–1 |
| `explanation` | String (Text) | Detailed rationale |
| `historicalBasis` | String? | Historical grounding |
| `status` | String | `pending\|approved\|rejected\|needs_revision` |

---

### 4.6 AI & Analysis Models

#### `RelationshipSuggestion`
AI-generated relationship proposal (never auto-published).

| Field | Type | Notes |
|-------|------|-------|
| `fromNodeId` | String | — |
| `toNodeId` | String | — |
| `relationshipType` | String | — |
| `confidenceScore` | Float | Composite signal score |
| `signalBreakdown` | Json | Per-dimension scores (tags, dates, sources, category, geo, evidence) |
| `riskLevel` | String | `low\|medium\|high` |
| `evidenceBasis` | String | Why suggested |
| `status` | String | `pending\|approved\|rejected\|revised` |
| `triggeredByNodeId` | String? | Which node triggered the suggestion |
| `reviewNote` | String? | Admin decision note |

#### `ResearchSimilarity`
Longitudinal similarity tracking between node pairs.

| Field | Type | Notes |
|-------|------|-------|
| `nodeAId`, `nodeBId` | String | Pair (unique constraint) |
| `overallSimilarity` | Float | Weighted composite |
| `thematicSimilarity` | Float | Token/tag overlap |
| `timelineSimilarity` | Float | Date proximity |
| `geographicSimilarity` | Float | Haversine distance score |
| `sourceSimilarity` | Float | Shared sources |
| `evidenceSimilarity` | Float | Evidence level compatibility |
| `entitySimilarity` | Float | Named entity overlap |
| `relationshipSimilarity` | Float | Edge pattern similarity |
| `researchPotentialScore` | Float | Advisory research priority |
| `explanation` | String (Text) | Human-readable rationale |
| `breakdown` | Json | Full signal breakdown |

#### `AiResearchReview`
Cached Claude audit per node (avoids redundant API calls).

| Field | Type | Notes |
|-------|------|-------|
| `nodeId` | String | FK → Node |
| `model` | String | Claude model used |
| `promptVersion` | String | Prompt version for cache invalidation |
| `reviewJson` | Json | Full audit response |
| `inputTokens` / `outputTokens` | Int | Token usage |
| `estimatedCost` | Float | USD cost |

#### `NodeNarrative`
Cached AI narrative for rabbit-hole exploration.

| Field | Type | Notes |
|-------|------|-------|
| `nodeId` | String | FK → Node |
| `narrative` | String (Text) | Generated prose |
| `model` | String | Claude model |
| `promptVersion` | String | — |
| `cachedAt` | DateTime | Cache timestamp |

#### `NodeEmbedding`
Vector embedding for semantic node search (pgvector, 1536 dims).

#### `AdjacencyCache`
Pre-materialized 1-hop and 2-hop neighborhoods.

| Field | Type | Notes |
|-------|------|-------|
| `nodeId` | String | FK → Node |
| `hop1` | Json | Direct neighbors with score/direction |
| `hop2` | Json | 2-hop reachable nodes |

---

### 4.7 Bulk Import Models

#### `ImportBatch`
An atomic group of imported nodes/edges.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | — |
| `status` | String | `committed\|rolledback` |
| `importedBy` | String | Admin user ID |
| `parsedCount` | Int | Records attempted |
| `acceptedCount` | Int | Records saved |
| `rejectedCount` | Int | Hard rejects |
| `warningCount` | Int | Soft issues |
| `validationReport` | Json | Per-record details |

#### `IngestionJob`
Async job queue for background work.

| Field | Type | Notes |
|-------|------|-------|
| `type` | String | `embed-node\|embed-source\|rebuild-adjacency` |
| `entityId` | String | Target record ID |
| `status` | String | `pending\|processing\|done\|failed` |
| `priority` | Int | 0–100 (higher = sooner) |
| `attempts` | Int | Retry count |
| `error` | String? | Last failure message |

---

### 4.8 Governance Models

#### `UserPermission`
Fine-grained capability grants (per user, overrides role defaults).

| Field | Default | Notes |
|-------|---------|-------|
| `canApproveSources` | false | — |
| `canApproveRelationships` | false | — |
| `canApproveNodes` | false | — |
| `canPublishNodes` | false | — |
| `canAssignRoles` | false | — |
| `canBanUsers` | false | — |
| `canRunAiReview` | false | — |
| `canViewPlatformHealth` | false | — |
| `canViewTraffic` | false | — |
| `canViewCosts` | false | — |
| `canViewSecurityLogs` | false | — |

#### `UserTrustEvent`
Time-series trust delta events (used to compute trustScore).

| Field | Type | Notes |
|-------|------|-------|
| `delta` | Float | Positive or negative |
| `reason` | String | Event type key |
| `detail` | String? | Human-readable context |
| `createdAt` | DateTime | Used for time-decay |

#### `ModerationAction`
Admin actions against users.

| Field | Type | Notes |
|-------|------|-------|
| `actionType` | String | `warn\|restrict\|suspend\|ban\|unban\|role_change` |
| `reason` | String (Text) | Required justification |
| `expiresAt` | DateTime? | For temporary actions |

#### `Report`
User-submitted abuse/misinformation reports.

| Field | Type | Notes |
|-------|------|-------|
| `entityType` | String | `node\|edge\|source\|user` |
| `entityId` | String | Target record ID |
| `reason` | String | Report category |
| `status` | String | `open\|resolved\|dismissed` |

#### `UserRiskProfile`
Aggregate risk scores (bot/spam detection).

| Field | Type | Notes |
|-------|------|-------|
| `riskScore` | Float | 0–100 overall risk |
| `riskLevel` | String | `low\|watch\|suspicious\|high_risk` |
| `spamScore` | Float | 0–100 spam likelihood |
| `botScore` | Float | 0–100 bot likelihood |
| `reasons` | Json | Array of active signal labels |

#### `UserActivityEvent`
HTTP-level event log for anomaly detection.

| Field | Type | Notes |
|-------|------|-------|
| `eventType` | String | Action category |
| `path` | String? | URL path |
| `ipHash` | String? | Hashed IP (privacy-safe) |
| `userAgentHash` | String? | Hashed UA string |

#### `PlatformMetric`
Daily aggregated metrics for dashboards.

| Field | Type | Notes |
|-------|------|-------|
| `date` | DateTime | Day bucket |
| `metricName` | String | Metric identifier |
| `metricValue` | Float | Value |
| Unique constraint | `[date, metricName]` | One value per metric per day |

---

### 4.9 Audit Models

#### `AuditLog`
Immutable action trail — never deleted.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String | Actor |
| `userEmail` | String? | Denormalized for display |
| `action` | String | See §6.5 for all action types |
| `entityType` | String | `node\|edge\|source\|user\|batch\|...` |
| `entityId` | String | Target record |
| `detail` | Json | Action-specific payload |

#### `ArchiveAuditRun`
An AI-powered archive quality scan session.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | — |
| `status` | String | `running\|completed\|failed` |
| `triggeredBy` | String | Admin email |
| `startedAt` | DateTime | — |
| `completedAt` | DateTime? | — |
| `summary` | Json | `{total, byType, bySeverity, autoFixable}` |
| `settings` | Json | Audit configuration used |

#### `ArchiveAuditFinding`
Individual finding from an audit run.

| Field | Type | Notes |
|-------|------|-------|
| `runId` | String | FK → ArchiveAuditRun |
| `type` | String | `orphan\|stale_edge\|weak_edge\|missing_fields\|duplicate\|source_quality\|ai_quality\|category_mismatch` |
| `severity` | String | `critical\|high\|medium\|low` |
| `status` | String | `pending\|approved\|denied\|applied` |
| `nodeId` | String? | Affected node (if applicable) |
| `edgeId` | String? | Affected edge (if applicable) |
| `title` | String | Short summary |
| `description` | String (Text) | Full description |
| `beforeState` | Json | State snapshot before fix |
| `afterState` | Json | Proposed state after fix |
| `reasoning` | String (Text) | Why this is a problem |
| `autoFixable` | Boolean | Whether apply button is enabled |
| `webSources` | Json | Web research citations |
| `reviewedBy` | String? | Admin who decided |
| `appliedAt` | DateTime? | When fix was applied |
| `applyError` | String? | Error if fix failed |

---

### 4.10 User Progress Models

#### `UserProgress`
Explorer-style gamification (level, XP, achievements).

#### `NodeExploration`
Junction: which user explored which node.

#### `ConnectionDiscovery`
Junction: which user discovered which connection.

#### `UserAchievement`
Junction: earned achievements with XP values.

#### `Badge` / `UserBadge`
Badge definitions and awards (idempotent — no duplicate badges).

---

### 4.11 System Models

#### `SystemConfig`
Key-value store for runtime settings (e.g., audit_settings).

| Field | Type | Notes |
|-------|------|-------|
| `key` | String | Primary key (e.g., `audit_settings`) |
| `value` | Json | Arbitrary settings payload |
| `updatedBy` | String? | Last editor |

---

## 5. API Routes Reference

### 5.1 Graph & Exploration

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/graph` | Public | Full or focused graph data |
| GET | `/api/graph?focus=nodeId&radius=2` | Public | BFS subgraph around node |
| GET | `/api/search?q=&category=&evidence=&limit=` | Public | Three-tier search (FTS → fuzzy → vector) |
| GET | `/api/rabbit-hole/[nodeId]` | Public | Exploration data + AI narrative |
| GET | `/api/timeline` | Public | Chronological node list |
| GET | `/api/synthesis` | Public | Exploration synthesis prose |

### 5.2 Node Operations

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/nodes/[id]` | Public* | Node details |
| GET | `/api/nodes/drafts` | Admin | All draft nodes |
| GET | `/api/nodes/propose?status=` | Admin | Proposal list |
| POST | `/api/nodes/propose` | User | Submit draft node |
| POST | `/api/nodes/[id]/review` | Admin | Approve/reject/revise |
| POST | `/api/nodes/[id]/publish` | Admin | Publish node |
| GET | `/api/nodes/[id]/versions` | Admin | Version history |
| GET | `/api/nodes/[id]/sources` | Public | Linked sources |
| GET | `/api/nodes/[id]/source-quality` | Public | Source credibility aggregate |

### 5.3 Edge Operations

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/edges/propose?status=` | Admin | Edge proposal list |
| POST | `/api/edges/propose` | User | Submit draft edge |
| GET | `/api/edges/[id]/review` | Admin | Edge review |
| POST | `/api/edges/[id]/review` | Admin | Approve/reject edge |

### 5.4 Source Operations

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/sources?page=&status=&type=&q=&mine=` | User | Browse sources |
| POST | `/api/sources` | User | Submit new source |
| GET | `/api/sources/[id]` | User | Source detail |
| POST | `/api/sources/[id]/review` | Admin | Approve source |
| GET | `/api/sources/[id]/links` | User | Source ↔ node links |
| POST | `/api/sources/[id]/override` | Admin | Manual credibility override |
| GET | `/api/sources/duplicate-check?doi=&url=&isbn=` | User | Detect duplicates |

### 5.5 Import System

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/import/batch` | Admin | Bulk import (dryRun?, force?) |
| GET | `/api/import/batch` | Admin | List batches |
| GET | `/api/import/batch/[batchId]` | Admin | Batch details |
| POST | `/api/import/batch/[batchId]/bulk-action` | Admin | Approve/reject all |
| GET | `/api/import/batch/[batchId]/integrity` | Admin | Integrity check |
| POST | `/api/import/batch/[batchId]/rollback` | Admin | Atomic rollback |

### 5.6 Admin: Archive Audit

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/admin/archive-audit/run` | Admin | Trigger audit (background) |
| GET | `/api/admin/archive-audit/runs` | Admin | Audit run history |
| GET | `/api/admin/archive-audit/[runId]` | Admin | Run details + findings |
| PATCH | `/api/admin/archive-audit/findings/[id]` | Admin | approve / deny / apply |
| GET | `/api/admin/archive-audit/settings` | Admin | Fetch audit settings |
| PUT | `/api/admin/archive-audit/settings` | Admin | Update audit settings |

### 5.7 Admin: Users & Governance

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/users` | Admin | User list with filters |
| POST | `/api/admin/users/[id]/role` | Owner | Promote/demote role |
| POST | `/api/admin/users/[id]/ban` | Admin | Ban user |
| POST | `/api/admin/users/[id]/permissions` | Owner | Grant/revoke capabilities |
| GET | `/api/admin/users/[id]/trust` | Admin | Trust history |
| POST | `/api/admin/users/[id]/trust` | Admin | Apply trust adjustment |

### 5.8 Super-Admin: Intelligence

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/super-admin/user-intelligence` | Owner | Aggregate risk view |
| GET | `/api/super-admin/user-intelligence/active` | Owner | Last-30-day active users |
| GET | `/api/super-admin/user-intelligence/banned` | Owner | Banned accounts |
| GET | `/api/super-admin/user-intelligence/bots` | Owner | Bot-flagged accounts |
| GET | `/api/super-admin/user-intelligence/spam` | Owner | Spam-flagged accounts |
| GET | `/api/super-admin/user-intelligence/suspicious` | Owner | Anomaly-flagged accounts |
| GET | `/api/super-admin/user-intelligence/contributors` | Owner | Top contributors |
| POST | `/api/super-admin/users/[id]/ban` | Owner | Super-admin ban |
| POST | `/api/super-admin/users/[id]/suspend` | Owner | Temporary suspension |
| POST | `/api/super-admin/users/[id]/warn` | Owner | Issue warning |
| POST | `/api/super-admin/users/[id]/unban` | Owner | Lift ban |
| POST | `/api/super-admin/users/[id]/restrict` | Owner | Restrict capabilities |

### 5.9 Admin: AI & Suggestions

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/admin/ai-review` | Admin | Run/rerun Claude node audit |
| GET | `/api/admin/ai-review?nodeId=` | Admin | Fetch cached review |
| GET | `/api/admin/ai-review/usage` | Admin | Monthly Claude spend |
| GET | `/api/admin/ai-activity` | Admin | AI activity metrics |
| GET | `/api/admin/suggestions` | Admin | Suggestion queue |
| POST | `/api/admin/suggestions/[id]/review` | Admin | Approve/reject suggestion |
| GET | `/api/admin/similarity/audit` | Admin | All-pairs similarity |
| POST | `/api/admin/similarity/rebuild` | Admin | Rebuild similarity matrix |
| GET | `/api/admin/source-enrichment` | Admin | Enrichment job status |
| POST | `/api/admin/source-enrichment` | Admin | Trigger web research |

### 5.10 Admin: Moderation

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/moderation/reports` | Admin | Report queue |
| POST | `/api/admin/moderation/reports` | User | Submit abuse report |
| PATCH | `/api/admin/moderation/reports/[id]` | Admin | Resolve report |
| GET | `/api/admin/moderation/actions` | Admin | Action log |
| POST | `/api/admin/moderation/actions` | Admin | Log custom action |

### 5.11 Admin: Platform

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard KPIs |
| GET | `/api/admin/reports` | Admin | Admin report view |
| GET | `/api/admin/platform-health` | Admin | DB/cache/API health |

### 5.12 Cron Jobs (CRON_SECRET header required)

| Method | Route | Schedule | Description |
|--------|-------|----------|-------------|
| POST | `/api/cron/trust-pass` | 1st of month 00:00 UTC | Recompute trust scores + award bonuses |
| POST | `/api/cron/lift-bans` | Every 15 minutes | Lift expired suspensions/bans |

### 5.13 User Profile

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/user/profile` | User | Profile + progress data |

### 5.14 Audit

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/audit-log?entityType=&userId=&action=&from=&to=` | Admin | Immutable audit trail |

---

## 6. Business Logic Libraries

### 6.1 Authentication (`lib/auth.ts`)

```typescript
// Role hierarchy (highest → lowest)
owner > admin > moderation_admin > reviewer >
source_verifier > verified_contributor > contributor > user | banned

// Helper functions
isAdminSession(session)         // owner or admin
isModOrAboveSession(session)    // moderation_admin and above
isReviewerOrAboveSession(session) // reviewer and above
isOwnerSession(session)         // owner only
```

- **ADMIN_EMAIL env var**: Any sign-in from this email gets role automatically upgraded to `owner`
- **JWT callbacks**: Inject `id` + `role` into session token
- **DB adapter**: Sessions persisted in PostgreSQL via `@auth/prisma-adapter`

---

### 6.2 Trust Score System (`lib/trust-score.ts`)

Time-decayed trust score: **base 50, range 0–100**.

**Half-life model:**
- Positive events: **180-day half-life** (good history persists long)
- Negative events: **60-day half-life** (mistakes can be recovered from)

**Trust event reasons & deltas:**

| Reason | Delta |
|--------|-------|
| `approved_node` | +5.0 |
| `approved_source` | +3.0 |
| `approved_relationship` | +2.0 |
| `rejected_content` | −3.0 |
| `fake_source` | −10.0 |
| `spam_submission` | −8.0 |
| `moderator_warning` | −15.0 |
| `misinformation_flag` | −20.0 |
| `reviewer_endorsement` | +10.0 |
| `account_age_bonus` | +1.0 |
| `low_rejection_rate_bonus` | +0.5 |

**Functions:**
- `computeTimeWeightedScore(events)` — Pure function (testable)
- `recomputeTrustScore(userId)` — Recalculates and persists to DB

---

### 6.3 Rank System (`lib/rank-system.ts`)

9 auto-computed ranks + 1 manual:

| Rank | Activity | Trust | Approvals |
|------|----------|-------|-----------|
| New Seeker | 0 | any | any |
| Active Seeker | ≥20 | any | any |
| Archive Explorer | ≥50 | ≥21 | any |
| Source Contributor | ≥30 | ≥30 | ≥1 |
| Evidence Builder | ≥40 | ≥40 | ≥3 |
| Trusted Seeker | ≥50 | ≥60 | ≥5 |
| Verified Contributor | ≥60 | ≥75 | ≥10 |
| Research Ally | ≥70 | ≥85 | ≥20 |
| Archive Fellow | ≥80 | ≥90 | ≥30 |
| Council Reviewer | Manual-only | — | — |

**Functions:**
- `computeRank(activityScore, trustScore, approvedCount)` — Pure computation
- `refreshUserRank(userId)` — Persist if changed
- `awardBadge(userId, badgeId)` — Idempotent award
- `evaluateBadges(userId)` — Auto-evaluate all earned badges

---

### 6.4 Quality Gates (`lib/quality-gates.ts`)

**Risk Classification** for proposed content:

| Level | Trigger |
|-------|---------|
| RED | 3+ high-risk keywords, or 1+ high-risk with no sources |
| YELLOW | 1+ high-risk, or 2+ medium-risk, or speculative without evidence |
| GREEN | No flags |

**High-risk keywords (30 terms):** alien, extraterrestrial, reptilian, stargate, portal, mind control, time travel, free energy, flat earth, chemtrails, microchip, surveillance implant, …

**Medium-risk keywords (12 terms):** conspiracy, cover-up, hidden truth, secret society, shadow government, …

**Submission rate limits (per day):**

| Role | Nodes/day |
|------|-----------|
| contributor | 5 |
| verified_contributor | 10 |
| source_verifier | 15 |
| reviewer and above | Unlimited |

**Validation rules:**
- Title: ≥10 chars
- Description: ≥100 chars
- URL format validated
- Spam detection (7+ repeated characters)
- Trust score ≥50 required to submit

---

### 6.5 Audit Logging (`lib/audit.ts`)

Fire-and-forget writes — audit failures never break the main operation.

**Action types:**

```
publish    unpublish   archive      restore
edit       approve     reject       needs_revision
import     rollback    bulk_approve bulk_reject      bulk_publish
warn       restrict    suspend      ban              unban
role_change            trust_adjustment
```

---

### 6.6 Risk Profiling (`lib/risk-profile.ts`)

Computes `{ riskScore, riskLevel, spamScore, botScore, reasons }`.

**Signals:**

| Signal | Risk Delta | Spam Delta |
|--------|-----------|------------|
| Banned user | +30 | — |
| Rejection rate >60% | +25 | +10 |
| Confirmed spam submissions | +10/count | +10/count |
| Reports filed against user | +8 to +25 | — |
| Account age <1 day | +20 | — |
| Account age <7 days | +15 | — |
| 24h submissions >20 | +25 | +15 |
| 1h event frequency >100 | +35 (bot) | — |
| Low path diversity + high events | +18 (bot) | — |

**Risk levels:** low (≤20) · watch (≤50) · suspicious (≤75) · high_risk (>75)

---

### 6.7 Suggestion Engine (`lib/suggestion-engine.ts`)

Rule-based relationship proposals — **never auto-publishes**.

**Signal weights (Reciprocal Rank Fusion):**

| Signal | Weight |
|--------|--------|
| Tag overlap (Jaccard) | 30% |
| Date proximity | 20% |
| Source overlap | 15% |
| Category match | 15% |
| Geographic proximity (Haversine) | 10% |
| Evidence compatibility | 10% |

**Feedback loop:** After ≥5 reviewer decisions of a given relationship type, an approval-rate multiplier (0.7× to 1.2×, capped at 1.0) adjusts future scoring.

**Filters:** MIN_SCORE=0.25 · MAX_PER_NODE=15 · MAX_POOL=500

---

### 6.8 Source Credibility (`lib/source-credibility.ts`)

**Base credibility by source type (0–1):**

| Type | Base Score |
|------|-----------|
| Academic Paper | 0.80 |
| Archaeological Report | 0.80 |
| Government Document | 0.70 |
| Primary Text | 0.70 |
| Book | 0.60 |
| News Article | 0.50 |
| Website | 0.35 |
| Personal Account | 0.20 |
| Unknown | 0.10 |

**Modifiers:**

| Modifier | Delta |
|----------|-------|
| DOI present | +0.06 |
| ISBN present | +0.04 |
| URL present | +0.02 |
| Author named | +0.03 |
| Peer-reviewed journal | +0.05 |
| Known publisher | +0.02 |
| Recent (last 10 years) | +0.01 |
| Future date | −0.15 |

Admin override (`credibilityOverride`) takes precedence over all auto-computation.

---

### 6.9 IQS — Import Quality Score (`lib/validation/iqs.ts`)

4-tier classification for bulk-imported records:

| Tier | IQS Range | Label | Behaviour |
|------|-----------|-------|-----------|
| 0 | 80–100 | Publication-ready | Fast-tracked |
| 1 | 60–79 | Draft-ready | Minor review |
| 2 | 40–59 | Soft-reject | Needs revision (force flag bypasses) |
| 3 | <40 | Hard-reject | Blocked (force cannot bypass) |

**Scoring factors:** title completeness, description length, evidence level, source diversity, geographic specificity, temporal specificity, tag count.

---

## 7. Component Architecture

### 7.1 Layout (`components/layout/`)

| Component | Purpose |
|-----------|---------|
| `AppShell` | Root container, routes between views |
| `AppErrorBoundary` | React error boundary with fallback UI |
| `NavBar` | Top navigation + auth status + view switcher |

### 7.2 Main Views (`components/sections/`)

| Component | View | Description |
|-----------|------|-------------|
| `LandingPage` | `landing` | Hero, feature overview, entry points |
| `KnowledgeGraph` | `graph` | 3D force-directed graph (React Three Fiber) |
| `RabbitHoleView` | `rabbit-hole` | Deep exploration narrative + chain navigation |
| `RabbitHoleMode` | — | Alternative RH visualization |
| `TheoryPanel` | `theory` | Single node detail (claims, criticisms, sources) |
| `TimelineExplorer` | `timeline` | Chronological browse with era filters |
| `UniverseView` | `universe` | Alternative 3D graph layout |
| `AncientGlobe` | `globe` | 3D globe with geographic node pins |
| `AdminPanel` | `admin` | Full admin dashboard (tabbed) |
| `SourceIngestion` | `sources` | Source submission + browse |
| `GraphDiagnostics` | `diagnostics` | Archive health metrics |
| `EvidenceBoard` | `evidence-board` | Source-centric evidence view |
| `AIAssistant` | — | Chat-style exploration assistant |

### 7.3 Admin Components (`components/admin/`)

| Component | Purpose |
|-----------|---------|
| `AdminStats` | KPI dashboard (nodes, edges, sources, users) |
| `AiActivityDashboard` | Claude API usage metrics + spend |
| `AiResearchReview` | Per-node audit UI with Claude results |
| `ArchiveAuditDashboard` | Audit run history, findings, before/after diffs, approve/deny/apply |
| `ArchiveBiasAudit` | Echo chamber & bias analysis |
| `AuditLogDisplay` | Immutable audit trail viewer |
| `DraftNodeQueue` | Pending proposal review queue |
| `ImportBatchList` / `ImportBatchDetail` | Bulk import management |
| `InlineNodeEditor` | Quick-edit node fields in place |
| `ModerationQueue` | Reports + moderation action log |
| `NodeSourceManager` | Source ↔ node link management |
| `NodeVersionHistory` | Version diff viewer |
| `PlatformHealthDashboard` | System health metrics |
| `ProposeEdgeForm` / `ProposeNodeForm` | Admin creation tools |
| `ProposedEdgeCard` / `ProposedNodeCard` | Proposal review cards |
| `RelationshipSuggestions` | Suggestion queue + approvals |
| `SourceLinkEnrichment` | Web research / fact-checking integration |
| `UserIntelligenceDashboard` | Risk & activity profiling |
| `UserManagement` | Role / permission / ban UI |
| `AdminReports` | Issue reporting and resolution |

### 7.4 Research Components (`components/research/`)

| Component | Purpose |
|-----------|---------|
| `ClaimBlock` | Claim text + supporting sources |
| `ConfidenceMeter` | Visual 0–1 confidence bar |
| `EvidenceBadge` | Evidence level indicator chip |
| `RelationshipCard` | Edge summary card |
| `ResearchScore` | Composite quality meter |
| `SourceCard` | Bibliographic source summary |

### 7.5 Source Components (`components/sources/`)

| Component | Purpose |
|-----------|---------|
| `SourceBrowse` | Paginated source listing |
| `SourceDetailPanel` | Full source metadata |
| `SourceQualityGuide` | Credibility scoring guidelines |
| `SourceReviewQueue` | Admin review list |
| `SourceSubmitForm` | Submission form |
| `SourceStrengthBadge` | Visual credibility indicator |
| `NodeSourceStrength` | Per-node source quality aggregate |

### 7.6 Synthesis & Effects

| Component | Purpose |
|-----------|---------|
| `ExplorationSynthesis` | Auto-generated prose summary of session (bottom sheet on mobile, card on desktop) |
| `ParticleField` | Animated background particles |
| `TunnelEffect` | 3D tunnel entry animation |

### 7.7 Similarity Components (`components/similarity/`)

| Component | Purpose |
|-----------|---------|
| `SimilarityPanel` | Show similar nodes |
| `SimilarityAudit` | All-pairs similarity audit |
| `NodeComparison` | Side-by-side node comparison |

---

## 8. Pages & Client-Side Routing

### Next.js Pages

| URL | File | Description |
|-----|------|-------------|
| `/` | `app/page.tsx` | Main app shell |
| `/admin` | `app/admin/page.tsx` | Admin dashboard (server-guarded) |

### Client Views (Zustand `currentView`)

The main app is a SPA — `AppShell` renders one view at a time based on `userStore.currentView`:

| View Key | Component | Description |
|----------|-----------|-------------|
| `landing` | `LandingPage` | Homepage/entry |
| `graph` | `KnowledgeGraph` | 3D knowledge graph |
| `theory` | `TheoryPanel` | Node detail page |
| `universe` | `UniverseView` | Universe visualization |
| `timeline` | `TimelineExplorer` | Timeline browse |
| `evidence-board` | `EvidenceBoard` | Evidence-centric view |
| `globe` | `AncientGlobe` | 3D geographic globe |
| `dashboard` | `Dashboard` | User stats |
| `diagnostics` | `GraphDiagnostics` | Archive health |
| `sources` | `SourceIngestion` | Source management |
| `rabbit-hole` | `RabbitHoleView` | Deep exploration |
| `admin` | `AdminPanel` | Admin panel |

---

## 9. State Management

### Zustand UserStore (`lib/store/userStore.ts`)

**State:**

| Key | Type | Purpose |
|-----|------|---------|
| `progress` | `UserProgress` | XP, level, explored nodes, achievements |
| `currentView` | `ViewKey` | Active view (drives AppShell routing) |
| `selectedTheory` | `string\|null` | Currently focused node ID |
| `searchQuery` | `string` | Search input state |
| `focusedTheoryId` | `string\|null` | Cross-view sync signal (Globe ↔ Timeline) |
| `rabbitHoleChain` | `string[]` | Exploration chain |
| `rabbitHoleNodeId` | `string\|null` | Current node in chain |
| `pendingRabbitHoleNodeId` | `string\|null` | Signal to load on mount |
| `audioEnabled` | `boolean` | Sound effects toggle |
| `guestMode` | `boolean` | Browse-only mode |

**Key Actions:**

| Action | Effect |
|--------|--------|
| `exploreTheory(id)` | Mark explored, award XP, add to history |
| `discoverConnection(fromId, toId)` | Track discovery |
| `startRabbitHole(id)` | Begin exploration chain |
| `extendRabbitHole(id)` | Add to existing chain |
| `unlockAchievement(id)` | Award achievement + XP |
| `getLevel()` | Current level from XP |
| `setCurrentView(view)` | Navigate to view |

**Persistence:** `localStorage` via Zustand persist middleware (UI state excluded).

---

## 10. Authentication & Authorization

### Providers
- **Google OAuth** (requires `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`)
- **GitHub OAuth** (requires `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET`)
- Both are optional — app degrades gracefully if unconfigured

### Role Hierarchy

```
owner
  └─ admin
       └─ moderation_admin
            └─ reviewer
                 └─ source_verifier
                      └─ verified_contributor
                           └─ contributor
                                └─ user
                                     └─ banned
```

### Middleware Protection (`middleware.ts`)

| Route Pattern | Required |
|--------------|----------|
| `/api/super-admin/*` | `owner` role |
| `/api/admin/*` | `admin` or `owner` |
| `/api/cron/*` | `CRON_SECRET` header |
| All routes | Security headers applied |

### Session Shape

```typescript
session.user = {
  id:    string,  // User.id
  email: string,
  name:  string,
  image: string,
  role:  UserRole  // injected by JWT callback
}
```

---

## 11. AI Integration

### Claude API Usage

All Claude calls go through `@anthropic-ai/sdk`.

| Use Case | Trigger | Model | Blocking? |
|----------|---------|-------|-----------|
| Node audit on submission | Async after propose | claude-haiku-4-5 | No (fire-and-forget) |
| Similarity check on submission | Async after propose | — | No |
| Rabbit-hole narrative | First access (cached) | claude-haiku-4-5 | Yes (with cache) |
| Archive audit — AI analysis | Admin-triggered | Configurable | Background |
| Source enrichment | Admin-triggered | claude-haiku-4-5 | Background |

### Budget Control

- **Monthly spending threshold: $15**
- Budget gate in `lib/ai-review.ts` checks cumulative spend
- Warnings surfaced in `GET /api/admin/ai-review/usage`
- AI routes return `503` if `ANTHROPIC_API_KEY` is not set

### Node Audit (Fire-and-Forget)

On every `POST /api/nodes/propose`, after the response returns:
1. Claude audits the proposal for quality, bias, evidence gaps
2. Result stored in `ProposedNode.aiAuditResult`
3. Admin sees result in Draft Queue review card

### Archive Audit AI Analysis

Part of the full archive audit run. Claude evaluates each node for:
- `ai_quality`: Evidence level mismatch, overconfident language
- `category_mismatch`: Category inconsistent with title/tags
- Missing criticisms for controversial topics

**Anti-hallucination rules (enforced in system prompt):**
- Only evaluate data explicitly provided in input
- Never suggest external sources/URLs not in input
- Every reasoning must quote specific field values
- Return empty array if uncertain

### Web Research (`lib/audit/web-research.ts`)

Used during archive audit to find factual grounding:
- **Wikipedia API**: Article extract + coordinates
- **Wikidata API**: Year, inception date, geographic coordinates
- Results passed to Claude as grounding context
- Claude can only propose changes backed by provided research data

---

## 12. Archive Audit System

Full AI-powered archive quality scan. Accessible via **Admin Panel → AI Audit tab**.

### How It Works

1. Admin clicks "Run Audit" → `POST /api/admin/archive-audit/run`
2. API creates an `ArchiveAuditRun` record (status: `running`)
3. Response returns immediately with `runId`
4. `after()` fires background job: `executeAuditRun(runId)`
5. Background job runs rule checks + AI analysis in parallel
6. All findings saved to `ArchiveAuditFinding`
7. Run marked `completed` (or `failed`)
8. Dashboard polls and shows results

### Rule-Based Checks (`lib/audit/rule-checks.ts`)

| Check | Finding Type | Severity |
|-------|-------------|----------|
| Node with zero connections | `orphan` | Medium |
| Published edge → unpublished node | `stale_edge` | High |
| Edge confidence below threshold | `weak_edge` | High/Medium |
| Description <80 chars, missing claims/criticisms/tags | `missing_fields` | High/Medium |
| Title similarity >threshold (Jaccard) | `duplicate` | High/Medium |
| No sources linked | `source_quality` | Medium |
| Avg source credibility <40% | `source_quality` | Low |

### AI Checks (`lib/audit/ai-analysis.ts`)

| Check | Finding Type | Severity |
|-------|-------------|----------|
| Evidence level too high for data | `ai_quality` | High/Medium |
| Absolute language, low confidence | `ai_quality` | Medium |
| Category inconsistent with content | `category_mismatch` | Medium |

### Auto-Fix (`lib/audit/auto-fix.ts`)

When `autoFixable=true`, admin can click Apply:

| Finding Type | Fix Applied |
|-------------|------------|
| `stale_edge` | Edge status → `draft` |
| `weak_edge` | Edge status → `draft` |
| `orphan` | Node.adminReviewStatus → `review_required` |
| Others | afterState fields written to Node (whitelist-filtered) |

**Allowed node fields for auto-fix:**
`description, year, dateStart, dateEnd, datePrecision, lat, lon, region, country, icon, adminReviewStatus`

### Audit Settings (configurable)

```json
{
  "checks": {
    "orphans": true,
    "staleEdges": true,
    "weakEdges": true,
    "missingFields": true,
    "duplicates": true,
    "sourceQuality": true,
    "aiQuality": true,
    "categoryMismatch": true
  },
  "aiModel": "claude-haiku-4-5-20251001",
  "maxNodesPerAiRun": 80,
  "maxFindingsPerRun": 200,
  "weakEdgeThreshold": 0.25,
  "duplicateTitleThreshold": 0.70,
  "autoApproveOrphans": false,
  "autoApproveStaleEdges": true,
  "autoApproveWeakEdges": false
}
```

---

## 13. Trust & Governance System

### Monthly Trust Pass (Cron)

Runs 1st of every month at 00:00 UTC:
1. **Low-rejection-rate bonus**: Users with <10% rejection + ≥10 submissions get +0.5
2. **Account-age bonus**: Quarterly award of +1 trust (max 8 total = 2 years of bonuses)
3. **Full recomputation**: All non-banned users get trustScore recalculated from event log

### Ban Expiry (Cron)

Runs every 15 minutes:
- Lifts bans where `banExpiresAt < now`
- Updates `User.isBanned = false`
- Updates `UserModerationStatus.status = 'active'`

### Moderation Workflow

```
User submits report
  → Admin sees in Moderation Queue
  → Admin issues: warn / restrict / suspend(N days) / ban
  → Action logged in ModerationAction
  → User.warningCount incremented (for warns)
  → User.isBanned / banExpiresAt set (for bans/suspensions)
  → Trust event written (moderator_warning: −15)
Cron lifts expired suspensions automatically
```

---

## 14. Knowledge Graph Features

### 3D Visualization (`components/sections/KnowledgeGraph.tsx`)
- React Three Fiber + custom physics
- Force-directed layout (nodes repel, edges attract)
- Node size reflects `confidenceScore`
- Color by category
- Click node → loads `TheoryPanel` detail view
- Zoom → focused BFS subgraph via `/api/graph?focus=nodeId`

### Rabbit-Hole Exploration (`/api/rabbit-hole/[nodeId]`)
Returns:
- **Connections**: Direct neighbors with relationship type + strength
- **Locations**: Geographic cluster (nodes with coordinates near this one)
- **Timelines**: Temporally proximate nodes (within same era)
- **Paths**: Multi-hop chains through the graph (narrative journeys)
- **AI Narrative**: Cached prose exploration text (via `NodeNarrative`)

### Timeline Explorer (`/api/timeline`)
- Fetches published DB nodes with dates set
- Credibility gate: only approved sources
- Era filter pills: ancient (<-500) · classical (<500) · medieval (<1500) · modern (<1950) · contemporary (≥1950)
- Live indicator (green dot) for DB-sourced entries
- Cross-view sync: clicking entry focuses Globe

### Ancient Globe (`components/sections/AncientGlobe.tsx`)
- 3D sphere (Three.js)
- Published nodes with `lat`/`lon` pinned on globe
- Click pin → focuses `TheoryPanel`
- Syncs with Timeline via `focusedTheoryId` in store

### Exploration Synthesis (`components/synthesis/ExplorationSynthesis.tsx`)
- Generates prose summary of current exploration session
- Bottom-sheet on mobile, floating card on desktop (sm+)
- Auto-updates as user navigates

---

## 15. Source Credibility Engine

Full credibility scoring on submission + admin override capability.

**Flow:**
1. User submits source via `POST /api/sources`
2. `computeCredibilityScore(source)` runs automatically
3. Factors stored in `credibilityFactors` JSON
4. Score stored in `credibilityScore` (0–1)
5. Admin can override: `credibilityOverride` + `overrideReason`
6. `effectiveCredibility(source)` returns override if present, else auto score

**Score is shown to admins and used in:**
- Node source quality aggregation (`/api/nodes/[id]/source-quality`)
- Archive audit (source quality findings)
- Research suggestion weighting (source overlap signal)

---

## 16. Import & Batch System

Designed for bulk-loading research data while maintaining integrity.

### Import Flow

```
POST /api/import/batch
  { nodes: [...], edges?: [...], dryRun?: boolean, force?: boolean }

For each node:
  1. Schema validation (required fields, types)
  2. IQS scoring (0–100 → Tier 0–3)
  3. Duplicate check (in-batch + DB title similarity)
  4. Tier 3 → hard reject (always)
  5. Tier 2 → soft reject (bypass with force=true)
  6. Tiers 0–1 → save as status='draft'

Returns:
  { batchId, summary: { parsed, accepted, soft_rejected, rejected, warnings }, records: [...] }
```

### Batch Operations

After import, admins can:
- **View batch**: Full per-record report with IQS tier, errors, warnings
- **Bulk-approve**: Move all accepted drafts to `published`
- **Rollback**: Atomically delete all records from this batch (soft undo)
- **Integrity check**: Validate all batch edges still reference valid nodes

### ImportBatch Rollback

Uses `Node.importBatchId` FK to find all records. Atomic transaction — all or nothing.

---

## 17. Search System

Three-tier search with graceful fallback:

```
User query
  │
  ├─ Tier 1: PostgreSQL tsvector (full-text)
  │   websearch_to_tsquery, ranked by ts_rank_cd
  │
  ├─ Tier 2: pg_trgm (fuzzy)
  │   similarity() threshold + trigramm GIN index
  │
  └─ Tier 3: pgvector (semantic, optional)
      ANN query against NodeEmbedding vectors
      Graceful fallback if extension unavailable

Results merged via Reciprocal Rank Fusion (k=60)
```

**Params:** `q` (required) · `category` · `evidence` · `limit` (max 100) · `cursor` (pagination) · `embedding` (base64 F32Array for semantic)

**Rate limit:** 30 searches/min per IP (Upstash Redis)

---

## 18. Migrations History

| Migration | Purpose |
|-----------|---------|
| `20260606000000_init` | Users, nodes, edges, sources, categories — base schema |
| `20260608000000_foundation_architecture` | pg_trgm, pgvector, unaccent extensions; tsvector full-text; GIN indices |
| `20260608000001_tier0_constraints` | Uniqueness + FK constraints |
| `20260608000002_tier1_import_batch` | ImportBatch, IngestionJob, Node.importBatchId |
| `20260608000003_tier2_admin_workflow` | ProposedNode, ProposedEdge, AuditLog, ModerationAction, Report |
| `20260608000004_user_roles` | Role hierarchy, UserPermission |
| `20260608000005_relationship_suggestions` | RelationshipSuggestion + feedback loop |
| `20260606000006_source_credibility_engine` | Source.credibilityScore, factors, admin override |
| `20260608000007_ai_research_review` | AiResearchReview (Claude audit cache) |
| `20260608000008_governance_system` | UserTrustEvent, UserActivityLog, Badge, UserBadge, UserModerationStatus |
| `20260608000009_user_risk_intelligence` | UserRiskProfile, UserActivityEvent (bot/spam detection) |
| `20260608000010_seed_badges` | Initial badge definitions |
| `20260609000001_node_ai_audit` | ProposedNode.aiAuditResult, aiAuditedAt |
| `20260609000001_taxonomy_refactor` | Category.parentId (tree structure) |
| `20260610000001_research_similarity` | ResearchSimilarity (multi-dimensional tracking) |
| `20260610000002_proposal_similarity` | ProposedNode.proposalSimilarity |
| `20260611000000_archive_audit_tables` | SystemConfig, ArchiveAuditRun, ArchiveAuditFinding (idempotent IF NOT EXISTS) |

---

## 19. Environment Variables

### Required in Production

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth JWT signing secret |
| `ADMIN_EMAIL` | Email that auto-receives `owner` role |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `ANTHROPIC_API_KEY` | Claude API access |
| `CRON_SECRET` | Authorization for cron endpoints |

### Optional / Enhanced Features

| Variable | Purpose | Fallback |
|----------|---------|---------|
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth | Google-only auth |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Memory-only fallback |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | — |
| `SENTRY_DSN` | Error tracking | Silent (no tracking) |
| `SENTRY_ORG` | Source map upload | — |
| `SENTRY_PROJECT` | Source map upload | — |
| `SENTRY_AUTH_TOKEN` | CI source maps | — |
| `RESEND_API_KEY` | Transactional email | — |

### Public Variables (exposed to browser)

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_ADMIN_EMAIL` | Derived from `ADMIN_EMAIL` |
| `NEXT_PUBLIC_SENTRY_DSN` | Derived from `SENTRY_DSN` |

### Graceful Degradation

| Missing Variable | App Behaviour |
|-----------------|---------------|
| `DATABASE_URL` | Falls back to static graph data (read-only) |
| `ANTHROPIC_API_KEY` | AI routes return 503 |
| `AUTH_GOOGLE_ID` | Auth skipped (unauthenticated browsing only) |
| `CRON_SECRET` | Cron routes return 401 |

---

## 20. Security

### HTTP Security Headers (all routes)

```
X-DNS-Prefetch-Control: on
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Route-Level Protection (middleware.ts)

```
/api/super-admin/* → owner role required
/api/admin/*       → admin or owner required
/api/cron/*        → CRON_SECRET header required
/api/*             → Security headers always applied
```

### Input Validation

- Zod schema validation on all API inputs
- IQS scoring rejects low-quality bulk imports
- Quality gates block trust-deficient or rate-limit-exceeded submissions
- SQL injection: mitigated by Prisma parameterized queries
- XSS: React escaping + Content-Security-Policy

### Rate Limiting

All contribution endpoints rate-limited via Upstash Redis (sliding window).

### Audit Trail

Every admin action is immutably logged. Logs are never deleted.

---

## 21. Performance & Caching

### Database Optimizations

- `search_vector` (tsvector): Auto-updated GIN index for full-text search
- `pg_trgm` GIN index on `title` for fuzzy search
- `pgvector` HNSW index on `NodeEmbedding` for ANN search
- `AdjacencyCache`: Pre-materialized 1-hop and 2-hop neighborhoods
- `NodeNarrative`: Cached AI-generated exploration text (avoids redundant Claude calls)

### API Caching

| Endpoint | Cache Strategy |
|----------|---------------|
| `GET /api/graph` | `s-maxage=3600, stale-while-revalidate=86400` |
| `GET /api/rabbit-hole/[nodeId]` | NodeNarrative DB cache per node |
| `GET /api/nodes/[id]` | Standard Next.js caching |

### Static Fallback

`KnowledgeGraph` and `TimelineExplorer` have built-in static fallback data — the app remains browsable even if the database is unreachable.

### Background Jobs

`after()` from `next/server` is used to fire background operations after the HTTP response is sent, keeping response times fast:
- AI node audit on proposal submission
- Similarity check on proposal submission  
- Archive audit run execution

---

## 22. Development & Deployment

### npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Hot-reload dev server |
| `build` | `prisma generate && next build` | Production build |
| `start` | `node scripts/resolve-failed-migration.js && prisma migrate deploy && next start` | Production start |
| `lint` | `next lint` | ESLint check |
| `test` | `vitest` | Unit tests |
| `test:watch` | `vitest --watch` | Watch mode |
| `postinstall` | `prisma generate` | Auto-gen client after npm install |

### Build Process

```
npm run build
  1. prisma generate      → Generates Prisma client from schema
  2. next build           → Compiles TypeScript, bundles assets
  3. Sentry source maps   → Uploaded to Sentry (if SENTRY_AUTH_TOKEN set)
  4. Static optimization  → Images, CSS, JS bundled
```

### Startup Process (Production)

```
npm start
  1. resolve-failed-migration.js  → Recovery script for stuck migrations
  2. prisma migrate deploy         → Applies pending migrations (if DATABASE_URL set)
  3. next start                    → Next.js server on :3000
```

### Seed Data

```bash
npx prisma db seed
```
Populates initial categories, sample nodes, edges, and sources for fresh installs.

### Railway Deployment

- Database: PostgreSQL on Railway
- App: Next.js server on Railway
- Environment: All env vars set via Railway dashboard
- Migrations: Auto-applied on startup via `prisma migrate deploy`
- Known issue: `IF NOT EXISTS` in migrations prevents `42P07` errors on re-deploy

---

## 23. Testing

### Unit Tests (Vitest)

Located in `__tests__/` — pure function coverage:
- Trust scoring (`computeTimeWeightedScore`)
- Rank computation (`computeRank`)
- Risk profiling (`scoreRisk`)
- IQS calculation
- Source credibility scoring
- Suggestion engine signal weighting

```bash
npm run test                       # Run once
npm run test -- --watch            # Watch mode
npm run test -- --coverage         # Coverage report (via @vitest/coverage-v8)
```

### What's Not Tested Automatically

- Database-dependent routes (require live DB)
- Three.js rendering (visual only)
- AI analysis (requires API key + external calls)

---

## 24. Design Principles & Guarantees

### No Echo Chambers
Every published node **must** have:
- At least one `Criticism` (counter-argument)
- `mainstreamView` field (mainstream academic position)
- Archive audit flags nodes missing these

### Transparency Everywhere
- Every `RelationshipSuggestion` exposes `signalBreakdown` JSON
- Every `Source` shows `credibilityFactors` JSON
- Every `AuditLog` entry is permanently readable
- Every `ArchiveAuditFinding` has `beforeState`/`afterState` diffs

### No Auto-Publishing
Nothing ever goes live without admin approval:
- Proposals → `status='pending'` until admin approves
- Imports → `status='draft'` until admin publishes
- Suggestions → `status='pending'` until admin approves
- Audit fixes → `status='pending'` until admin applies

### Graceful Degradation
- No `DATABASE_URL` → static graph served
- No `ANTHROPIC_API_KEY` → AI routes disabled, rest works
- No pgvector → search falls back to tsvector + trgm
- No Redis → rate limiting falls back to in-memory

### Security by Default
- All admin routes protected by middleware before handlers run
- Cron routes require header secret (not just auth)
- Audit log is append-only, never deletable via API
- Bans enforced server-side (not just UI-hidden)

---

## 25. Known Limitations

| Limitation | Impact | Notes |
|-----------|--------|-------|
| No real-time subscriptions | Admin must refresh to see new proposals | Polling used in AuditDashboard |
| Static graph fallback is hardcoded | Static data gets stale | Acceptable for read-only fallback |
| pgvector optional | Semantic search disabled if not installed | Fuzzy + FTS cover most cases |
| Legacy SourceLink columns | `targetType`/`targetId` still present | New code uses FK columns |
| No ML source weighting | All credibility factors equally weighted | Admin override available |
| AI budget is manual | $15/month threshold requires human review | Not auto-enforced |
| Tier 2 imports force-bypassable | Low-quality imports possible with `force=true` | Admin responsibility |
| No WebSocket/SSE | Long-running audit shows no live progress | Only final result shown |
| Token exposure risk | `ANTHROPIC_API_KEY` if ever in client bundle would be exposed | Currently server-only only |
| pg_trgm similarity threshold | May miss very short or acronym-heavy searches | Combined with FTS mitigates |

---

*End of Documentation — Nexus Archive v0.1.0*
