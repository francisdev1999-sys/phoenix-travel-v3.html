# PROJECT STATE REPORT — NEXUS ARCHIVE
*Generated: 2026-07-01 | Full audit of current main state*

> **Since the 2026-06-13 snapshot:** admin role now has full control-panel
> access; owners can mint a second owner; the autonomous loop gained per-job
> `CronRun` health tracking + consecutive-failure alerting; and the daily
> `auto-audit` cron (which silently 401'd via an internal HTTP hop) was fixed
> to call the audit directly.

---

## CODEBASE METRICS

| Metric | Value |
|--------|-------|
| Total source files | 306 |
| Total lines of code | ~57,000 |
| API routes | 130 |
| Database tables (Prisma models) | 68 |
| React components | 85 |
| Lib modules | 85 |
| Prisma migrations | 33 |
| Cron jobs (scheduled) | 12 |
| Unit tests | 4 |

---

## TECH STACK (ACTUAL)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 16.2.7 |
| UI | React | 19.2.4 |
| Language | TypeScript strict | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Animation | Framer Motion | ^12.40 |
| 3D | React Three Fiber + Drei | ^9.6 / ^10.7 |
| State | Zustand + persist | ^5 |
| Auth | NextAuth v5 beta | ^5.0.0-beta.31 |
| ORM | Prisma | ^7.8 |
| DB | PostgreSQL + pgvector + pg_trgm | Railway |
| AI | Anthropic Claude API | @anthropic-ai/sdk ^0.104.1 |
| Embeddings | Voyage AI | VOYAGE_API_KEY |
| Cache / Rate limit | Upstash Redis (+ in-memory fallback) | REST API |
| Email | Resend / Loops | RESEND_API_KEY |

---

## ENVIRONMENT VARIABLES

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `AUTH_SECRET` | NextAuth JWT secret |
| `ADMIN_EMAIL` | Auto-granted owner role |
| `CRON_SECRET` | Bearer token for cron routes |
| `ANTHROPIC_API_KEY` | Claude AI |
| `VOYAGE_API_KEY` | Vector embeddings |
| `UPSTASH_REDIS_REST_URL` | Rate limiting cache |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting cache |
| `RESEND_API_KEY` | Transactional email |
| `AI_DAILY_LIMIT_USD` | Cost cap per day |
| `AI_MONTHLY_LIMIT_USD` | Cost cap per month |
| `AUTH_GITHUB_ID/SECRET` | GitHub OAuth |
| `AUTH_GOOGLE_ID/SECRET` | Google OAuth |
| `AUTH_FIGMA_ID/SECRET` | Figma OAuth |
| `AUTH_TIKTOK_ID/SECRET` | TikTok OAuth |
| `AUTH_TWITTER_ID/SECRET` | Twitter OAuth |
| `AUTH_MICROSOFT_ENTRA_ID_*` | Microsoft OAuth |
| `AUTH_FUSIONAUTH_*` | FusionAuth OAuth |
| `AUTH_VIPPS_ID/SECRET` | Vipps OAuth |
| `REDDIT_CLIENT_ID/SECRET` | Reddit OAuth |
| `BITBUCKET_CLIENT_ID/SECRET` | BitBucket OAuth |
| `SUPER_ADMIN_EMAIL` | Alternate admin email |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Client-visible admin indicator |

---

## DATABASE SCHEMA — COMPLETE

### Core Content

**Node** — Primary research units
```
id, title, categoryId (FK), description, mainstreamView
evidenceLevel (speculative default), confidenceScore (0-1, 0.5 default)
color, icon, lat, lon, region, country
year, dateStart, dateEnd, datePrecision
status (draft/published), version, publishedAt, createdBy, createdAt, updatedAt
search_vector (tsvector — GIN indexed, updated by trigger)
title_trgm (pg_trgm index)
```

**Claim** — Node claims (id, nodeId, text, orderIndex)

**Criticism** — Counter-arguments (id, nodeId, text, orderIndex)

**OpenQuestion** — Unresolved questions (id, nodeId, text, orderIndex)

**NodeTag** — Tags (nodeId PK, tag PK; tag_trgm indexed)

**Edge** — Node relationships
```
id, fromId (FK), toId (FK)
relationshipType, strengthScore, confidenceScore
explanation, evidenceBasis, sourceType, sourceCount
status (draft/published), createdAt, updatedAt
UNIQUE (fromId, toId)
```

**Category** — Taxonomy (id, slug unique, name, description, color, parentId self-ref)

**Galaxy** — Themed collections (id, slug, name, description, color, nodeCount, isPublic, status)

---

### Sources & Evidence

**Source**
```
id, url, title, author, journal, publisher, publishYear, doi, isbn
sourceType, credibilityScore (0-1), credibilityOverride
status (pending/approved/rejected/needs_revision)
createdBy (FK), createdAt, updatedAt
```

**SourceLink** — Attaches source to node/edge
```
id, itemType, itemId, sourceId (FK)
linkType (primary/supports/context/references/contradicts)
relevanceScore, notes, status, createdAt
```

**SourceAnalysis** — AI analysis of a source
```
id, sourceId (FK), reliability, relevance
coverageGaps, suggestedImprovements, analyzedAt
```

**SourceEmbedding** — Voyage vector (id, sourceId, embedding vector, model, createdAt)

**ExtractedEntity** — NLP entities (id, sourceId, type, value, confidence)

**ExtractedClaim** — Claims from sources (id, sourceId, text, confidence)

---

### Proposals & Review

**ProposedNode** — User-submitted nodes awaiting review
```
id, title, categoryId, description, evidenceLevel, confidenceScore
claimsJson, criticismsJson, questionsJson, tagsJson
submittedBy (FK), status, riskLevel, riskReasons
approvedBy, rejectionReason, createdAt, updatedAt
```

**ProposedEdge** — User-submitted relationships
```
id, fromId, toId, relationshipType, explanation, evidenceBasis
sourceCount, submittedBy (FK), status, confidence
riskLevel, approvedBy, rejectionReason, createdAt
```

**RelationshipSuggestion** — AI-recommended edges
```
id, fromId (FK), toId (FK), relationshipType
confidence, explanation, status (pending/approved/rejected)
```

**ContradictionSuggestion** — Detected conflicting edges
```
id, edgeId (FK), contradictingEdgeId (FK)
confidence, explanation, status
```

---

### Users & Permissions

**User** (NextAuth base + role extensions)
```
id, name, email (unique), emailVerified, image, createdAt
role (owner|admin|moderation_admin|reviewer|source_verifier|
       verified_contributor|contributor|user|banned)
trustScore (0-100, default 50)
activityScore (0-1000 hard cap)
approvedCount, rejectedCount, submissionCount
lastActiveAt, isBanned
rank (e.g. "New Seeker", "Verified Contributor")
```

**Account, Session, VerificationToken** — NextAuth standard

**UserProgress** — Gamification
```
userId (unique FK), xp, level
theoriesExplored[], connectionsDiscovered[], achievements[]
rabbitHoleChain[], rabbitHoleDepth, recentDiscoveries[]
updatedAt
```

**UserPermission** — Fine-grained RBAC overrides
```
userId (PK)
canApproveSources, canApproveRelationships, canApproveNodes
canPublishNodes, canAssignRoles, canBanUsers, canRunAiReview
canViewPlatformHealth, canViewTraffic, canViewCosts, canViewSecurityLogs
updatedBy
```

**UserTrustEvent** — Trust change audit trail
```
id, userId (FK), delta (±), reason, detail, createdBy, createdAt
```

**UserActivityLog** — Interaction tracking
```
id, userId (FK), actionType (login|node_view|search|save|submit|comment)
detail (JSON), createdAt
```

**UserBadge** — (userId PK, badgeId PK, awardedBy, awardedAt)

**Badge** — Definitions (id, name, description, icon, rarity, createdAt)

**UserRiskProfile** — Behavioral risk
```
id, userId (unique FK), riskScore, flags[]
suspiciousActivityCount, lastFlaggedAt, autoRestrictedUntil, createdAt, updatedAt
```

**UserModerationStatus** — Moderation actions
```
id, userId (FK), status (active|suspended|restricted|banned)
reason, actionBy (FK), actionAt, liftAt
```

---

### AI & Analysis

**NodeNarrative** — Cached AI rabbit-hole prose
```
id, nodeId (FK), narrative, tokens, model, generatedAt, expiresAt
```

**NodeAudit** — AI audit results
```
id, nodeId (FK), issues[], suggestions[], severity, score, auditedAt
```

**NodeVersion** — Edit history (id, nodeId, version, data JSON, createdBy, createdAt)

**NodeExploration** — Per-user view tracking (id, userId, nodeId, exploredAt, timeSpent, interactions JSON)

**NodeEmbedding** — Voyage vector (id, nodeId, embedding vector, model, createdAt)

**ResearchSimilarity** — Node-to-node similarity (id, nodeId, similarNodeId, similarity, reason, dimension)

**ProposalSimilarity** — Duplicate detection (id, proposalId, similarProposalId, similarityScore)

---

### Audit & Integrity

**ArchiveAuditRun**
```
id, status (pending|in_progress|completed|failed)
startedAt, completedAt, triggeredBy, findingsCount, criticalCount, createdAt
```

**ArchiveAuditFinding**
```
id, auditRunId (FK), itemType, itemId, title
severity, description, suggestedFix
status (open|fixed|dismissed), createdAt
```

**CleanupAuditRun** — AI quality cleanup run (counts per classification)

**CleanupFinding** — Per-item cleanup result with reasons/risks JSON

---

### Discovery & Curation

**PotentialNodeSuggestion** — AI-discovered candidate nodes
```
id, title, description, category, evidenceLevel, confidence, source
status (pending|promoted|dismissed), discoveredAt, promotedAt
```

**DiscoveryBlacklist** / **DiscoveryWhitelist** — Domain/keyword filters

**ConnectionDiscovery** — Suggested new edges (id, fromId, toId, confidence, basis, discoveredAt)

**LocationReference** — Geographic index (id, name, lat, lon, type)

**TimelineReference** — Historical dating (id, label, year, approximateRange)

---

### Platform & System

**IngestionJob** — Async bulk import jobs (type, status, inputData, resultData, errorMessage)

**UsageEvent** — AI/API cost tracking (userId, type, tokensUsed, costUSD, createdAt)

**SystemConfig** — Key-value platform configuration

**BetaFeedback** — Feedback (userId, category, rating, text, createdAt, reviewed)

**BetaInvite** — Invite codes (email, code unique, status, redeemedBy, redeemedAt)

**BetaInviteRedemption** — Redemption records

**AuditLog** — System-wide audit trail (userId, action, resourceType, resourceId, changes JSON)

---

## ROLE & PERMISSION SYSTEM

### Role Hierarchy
```
owner              → ADMIN_EMAIL auto-assigned, full control
admin              → content + user management
moderation_admin   → user moderation only
reviewer           → approve nodes/edges/sources + run AI review
source_verifier    → approve sources only
verified_contributor → vetted contributor
contributor        → submit content for review
user               → browse only (default)
banned             → completely restricted
```

### Rate Limits (daily submissions per role)
| Role | Daily Limit |
|------|------------|
| owner | 999 |
| admin | 100 |
| reviewer | 20 |
| source_verifier | 15 |
| verified_contributor | 10 |
| contributor | 5 |
| user | 3 |

---

## TRUST & RANK SYSTEMS

### Trust Score (0–100, base: 50)
Time-decay model: positive events decay over 180 days, negative over 60 days.

Key deltas: approved_node +5, approved_source +3, approved_relationship +2, rejected_content −3, fake_source −10, moderator_warning −15, misinformation_flag −20, reviewer_endorsement +10.

Monthly bonuses: low rejection rate, high credibility sources, account age.

### Rank Progression (9 automatic + 1 manual)
New Seeker → Active Seeker → Archive Explorer → Source Contributor → Evidence Builder → Trusted Seeker → Verified Contributor → Research Ally → Archive Fellow → Council Reviewer (manual)

### Badges (11 criteria)
founding-member, one-year, evidence-builder, reliable-contributor, trusted-researcher, source-hunter, graph-connector, plus role-based badges.

---

## QUALITY GATES

### Submission Validation
- Title ≥ 10 chars, Description ≥ 100 chars (hard errors)
- URL format check, spam pattern detection
- Trust score ≥ 20 required to submit
- Duplicate detection: pg_trgm similarity > 0.6

### Risk Classification
- RED: 3+ high-risk keywords, or 1+ with no sources
- YELLOW: speculative/mythological evidence level, 0 sources, 2+ medium-risk keywords
- GREEN: passes all

### Source Credibility Scoring
Base score by type (Academic Paper: 0.8+, Government: 0.7+, etc.) adjusted by: DOI present +0.06, ISBN +0.04, URL +0.02, author +0.03, peer-reviewed +0.05, future date −0.15.

---

## API ROUTES (108 TOTAL)

### Auth
- `GET/POST /api/auth/[...nextauth]`

### Content
- `GET/POST /api/nodes/drafts`
- `POST /api/nodes/propose`
- `GET/PUT /api/nodes/[id]`
- `POST /api/nodes/[id]/review` | `/publish` | `/sources` | `/versions` | `/source-quality`
- `POST /api/edges/propose`
- `POST /api/edges/[id]/review`
- `GET/POST /api/sources`
- `GET /api/sources/[id]` | `/review` | `/override` | `/analyze` | `/intelligence` | `/links`
- `POST /api/sources/duplicate-check`

### Discovery & Exploration
- `GET /api/graph` — full graph data
- `GET /api/search` | `/api/search/quick`
- `GET /api/rabbit-hole/[nodeId]` — AI narrative exploration
- `GET /api/timeline`
- `GET /api/galaxies` | `/api/galaxies/[slug]`
- `GET /api/clusters/[slug]` | `/api/clusters/[slug]/graph`
- `GET /api/similarity/[nodeId]` | `/alternatives` | `/contradictions`
- `POST /api/similarity/compare`
- `GET/POST /api/progress`
- `POST /api/intel-feed`
- `POST /api/synthesis`

### Admin Content
- `/api/admin/suggestions` | `/[id]/review`
- `/api/admin/discovered-nodes` | `/[id]/review`
- `/api/admin/discovered-sources` | `/[id]/review`
- `/api/admin/source-intelligence/queue` | `/suggestions/[id]`
- `/api/admin/source-enrichment` | `/status`
- `/api/admin/similarity/audit` | `/rebuild`
- `/api/admin/embeddings` | `/search-index`
- `/api/admin/seed`

### Admin Batch Import
- `POST /api/import/batch`
- `GET /api/import/batch/[batchId]` | `/integrity` | `/bulk-action` | `/rollback`

### Admin Users
- `GET /api/admin/users`
- `POST /api/admin/users/[id]/role` | `/ban` | `/trust` | `/permissions`
- `GET /api/super-admin/user-intelligence` + `/active` `/banned` `/suspicious` `/spam` `/bots` `/contributors`
- `POST /api/super-admin/users/[id]/ban` | `/unban` | `/suspend` | `/restrict` | `/warn`

### Admin Moderation
- `GET/POST /api/admin/moderation/reports`
- `POST /api/admin/moderation/reports/[id]`
- `GET/POST /api/admin/moderation/actions`

### Admin AI & Audit
- `POST /api/admin/ai-review`
- `GET /api/admin/ai-review/usage` | `/api/admin/ai-activity`
- `POST /api/admin/archive-audit/run`
- `GET /api/admin/archive-audit/runs` | `/[runId]` | `/settings` | `/findings/[id]` | `/fix-all`
- `GET /api/admin/integrity` | `/api/admin/cro-audit`
- `POST /api/super-admin/cleanup-ai/analyze-nodes` | `/analyze-sources`
- `GET /api/super-admin/cleanup-ai/findings` | `/runs`
- `POST /api/super-admin/cleanup-ai/findings/[id]/resolve` | `/ignore`

### Admin Analytics
- `GET /api/admin/stats` | `/health` | `/platform-health` | `/reports`
- `GET /api/admin/research-maturity` | `/domain-reputation` | `/discovery-runs`
- `GET /api/admin/beta/analytics` | `/feedback/[id]` | `/invites`

### Discovery Lists
- `GET/POST /api/super-admin/discovery-whitelist` | `/[id]` DELETE
- `GET/POST /api/super-admin/discovery-blacklist` | `/[id]` DELETE

### Cron Jobs (CRON_SECRET required — 11 total, POST)
Driven by `.github/workflows/autonomous-growth-cron.yml`. Every run is wrapped
by `lib/cron/tracker.ts` and recorded in `CronRun`.
- `process-jobs` — drain the IngestionJob queue (every 5 min)
- `lift-bans` — auto-lift expired bans (every 15 min)
- `news-feed` — RSS ingestion (hourly)
- `node-discovery` — AI node discovery (every 5 days)
- `source-discovery` — academic source discovery + auto-approve (every 5 days)
- `auto-similarity` — enqueue similarity computation (every 6h)
- `auto-relationships` — enqueue relationship suggestions (daily)
- `research-maturity` — maturity scoring (daily)
- `auto-audit` — AI cleanup audit (daily; runs directly, no HTTP hop)
- `fix-invalid-dates` — clear invalid node dates (daily)
- `trust-pass` — monthly trust/rank recalculation

### Cron Health / Observability
- `GET /api/admin/cron-health` — per-job last status, duration, consecutive
  failures, `alerting` (≥3 consecutive fails) and `presumedStuck` flags.
  Surfaced in the Admin panel's Scheduled Jobs board.

### Public
- `GET /api/user/profile`
- `POST /api/beta/feedback` | `/api/beta/track`
- `POST /api/audit-log`
- `POST /api/jobs/process`

---

## KEY SYSTEMS

### 1. Content Pipeline
User proposes → quality gates + risk classification + duplicate check → rate limit → trust gate (≥20) → ProposedNode/Edge created → admin review queue → approve/reject → published to live graph

### 2. Trust & Rank
Activity logged → activityScore updated → monthly cron: time-decay trust recalc + bonuses → rank eligibility check → badge evaluation → updated on User row

### 3. AI Review
Admin triggers → Claude audits node/source (integrity, bias, credibility) → NodeAudit/ArchiveAuditFinding stored → admin resolves/dismisses/auto-fixes

### 4. Discovery Pipeline
Cron triggers → node-discovery engine calls Claude → PotentialNodeSuggestion created → confidence scored → auto-promoted if high confidence + low risk + not blacklisted → RelationshipSuggestion added

### 5. Source Intelligence
Source submitted → AI extraction (entities, claims, credibility factors) + web research (domain reputation) → SourceAnalysis + ExtractedEntity/Claim stored → credibility auto-calculated → linked to nodes

### 6. Similarity & Deduplication
Submission → pg_trgm title similarity + Voyage embedding comparison → ProposalSimilarity + ContradictionSuggestion → warnings if duplicate → admin can merge

### 7. Rabbit Hole (Guided Exploration)
User selects node → 3–5 strongest edges fetched → Claude generates prose narrative → NodeNarrative cached 24h → user follows path through archive

### 8. Batch Import
Admin uploads JSON → per-item validation (V001–V023 + EV001–EV009) + duplicate check → IngestionJob created → admin reviews findings → approve triggers DB transaction → 24h rollback available

### 9. User Intelligence & Moderation
Activity logs → risk profile scored (spam, bot, suspicious patterns) → UserRiskProfile updated → threshold alerts → admin actions (warn/suspend/restrict/ban) → cron auto-lifts expired bans

### 10. Archive Integrity Audit
Cron or manual → scans nodes/edges/sources for orphans, broken links, credibility drift, date violations, spam → ArchiveAuditFinding records → auto-fix mode or manual resolution

---

## WHAT WORKS (PRODUCTION-READY)

| System | Status |
|--------|--------|
| Auth (10 OAuth providers) | ✅ Complete |
| RBAC (9 roles + fine-grained permissions) | ✅ Complete |
| Trust score with time-decay | ✅ Complete |
| Rank progression + badges | ✅ Complete |
| User risk profiling | ✅ Complete |
| Rate limiting (Redis + in-memory fallback) | ✅ Complete |
| Quality gates + submission validation | ✅ Complete |
| Source credibility engine | ✅ Complete |
| Duplicate detection (pg_trgm) | ✅ Complete |
| Content proposal + review pipeline | ✅ Complete |
| Batch import with rollback | ✅ Complete |
| Node/edge/source CRUD | ✅ Complete |
| AI review (Claude) | ✅ Complete |
| AI rabbit-hole narrative | ✅ Complete |
| Discovery pipeline (cron + Claude) | ✅ Complete |
| Source intelligence extraction | ✅ Complete |
| Similarity engine | ✅ Complete |
| Archive integrity audit | ✅ Complete |
| User intelligence dashboard | ✅ Complete |
| Moderation (warn/suspend/ban) | ✅ Complete |
| Beta program (invites + feedback) | ✅ Complete |
| Cron jobs (12 scheduled) | ✅ Complete |
| Cron health tracking + failure alerting | ✅ Complete |
| Self-learning promotion model (online logistic NN) | ✅ Complete |
| Learned auto-approve lane (guardrailed, maturity-gated) | ✅ Complete |
| Admin role: full control-panel access | ✅ Complete |
| Second-owner provisioning (owner-gated) | ✅ Complete |
| Knowledge graph visualization | ✅ Complete |
| Rabbit hole exploration UI | ✅ Complete |
| Globe, timeline, galaxy views | ✅ Complete |
| Admin dashboards (10+) | ✅ Complete |
| Cost tracking | ✅ Complete |
| Security headers (Sentry removed) | ✅ Fixed |

---

## KNOWN GAPS

| Gap | Notes |
|-----|-------|
| pgvector semantic search | Optional — degrades gracefully to keyword |
| Real-time updates (WebSocket) | REST-only |
| GraphQL API | REST-only |
| Discord/Slack notifications | Not wired |
| Test coverage | 3 test files only (trust, rank, risk) |
| E2E tests | None |

---

## ENVIRONMENT VARS TO CONFIRM IN RAILWAY

| Var | Status |
|-----|--------|
| `ANTHROPIC_API_KEY` | Needs confirmation |
| `VOYAGE_API_KEY` | Needs confirmation |
| `UPSTASH_REDIS_REST_URL` | Needs confirmation |
| `UPSTASH_REDIS_REST_TOKEN` | Needs confirmation |
| `CRON_SECRET` | Needs confirmation |
| `ADMIN_EMAIL` | Needs confirmation |

---

## OVERALL COMPLETION: ~85%

The platform is production-ready at its core. Content pipeline, trust/rank
system, AI systems, admin dashboards, discovery, moderation, source
intelligence, and the autonomous growth loop (now with per-job health
tracking) are all implemented. The single largest remaining risk is **test
coverage** — still only 3 unit tests against a self-modifying pipeline, no E2E.
Other remaining work: notification integrations (Discord/Slack), pgvector
semantic-search hardening, and automated retry (vs. current detect+alert) for
repeatedly-failing cron jobs.

---

*End of Report*
