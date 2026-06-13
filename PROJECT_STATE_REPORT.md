# PROJECT STATE REPORT — NEXUS ARCHIVE
*Generated: 2026-06-13 | Auditor: Claude Code*

---

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXUS ARCHIVE                           │
│                    Next.js 16.2.7 App Router                   │
├─────────────────────────────────────────────────────────────────┤
│  FRONTEND                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   AppShell   │  │    NavBar    │  │  Providers           │  │
│  │  (view router│  │ (GitHub auth │  │  (SessionProvider)   │  │
│  │   state mgr) │  │  dropdown)   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  SECTIONS (all client components)                               │
│  ┌────────────┐ ┌─────────────────┐ ┌────────────────────────┐ │
│  │LandingPage │ │ KnowledgeGraph  │ │   TheoryPanel          │ │
│  │            │ │ (Canvas, force  │ │   (theory detail)      │ │
│  │            │ │  layout, 11T)   │ │                        │ │
│  └────────────┘ └─────────────────┘ └────────────────────────┘ │
│  ┌────────────┐ ┌─────────────────┐ ┌────────────────────────┐ │
│  │UniverseView│ │TimelineExplorer │ │   AncientGlobe         │ │
│  │ (R3F, 3D)  │ │ (14 events)     │ │   (12 sites, markers)  │ │
│  └────────────┘ └─────────────────┘ └────────────────────────┘ │
│  ┌────────────┐ ┌─────────────────┐ ┌────────────────────────┐ │
│  │EvidenceBoard│ │ RabbitHoleMode │ │   AIAssistant          │ │
│  │            │ │ (BFS traversal) │ │ ⚠ FAKE (no API call)   │ │
│  └────────────┘ └─────────────────┘ └────────────────────────┘ │
│  ┌────────────┐                                                 │
│  │ Dashboard  │   (Zustand progress display)                   │
│  └────────────┘                                                 │
│                                                                 │
│  EFFECTS: ParticleField (Canvas), TunnelEffect (Canvas)         │
├─────────────────────────────────────────────────────────────────┤
│  STATE MANAGEMENT                                               │
│  Zustand v5 + persist (localStorage only)                       │
│  userStore: progress, currentView, selectedTheory, rabbitHole   │
│  ⚠ DB sync exists in API but store NEVER calls it              │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Routes (Next.js App Router)                         │   │
│  │                                                         │   │
│  │ /api/auth/[...nextauth]   NextAuth v5 handlers          │   │
│  │ /api/progress             GET/POST user progress        │   │
│  │                                                         │   │
│  │ /api/super-admin/* (all guarded by SUPER_ADMIN_EMAIL)   │   │
│  │   cleanup-ai/analyze-nodes     POST                     │   │
│  │   cleanup-ai/analyze-sources   POST                     │   │
│  │   cleanup-ai/findings          GET                      │   │
│  │   cleanup-ai/findings/[id]/resolve  POST                │   │
│  │   cleanup-ai/findings/[id]/ignore   POST                │   │
│  │   cleanup-ai/runs              GET                      │   │
│  │   discovery-blacklist          GET/POST                 │   │
│  │   discovery-blacklist/[id]     DELETE                   │   │
│  │   discovery-whitelist          GET/POST                 │   │
│  │   discovery-whitelist/[id]     DELETE                   │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  DATABASE (PostgreSQL on Railway, Prisma v7)                    │
│  9 models (see Section 3)                                       │
├─────────────────────────────────────────────────────────────────┤
│  EXTERNAL SERVICES                                              │
│  GitHub OAuth (NextAuth)     ✅ configured                      │
│  Anthropic Claude Haiku      ⚠ needs ANTHROPIC_API_KEY         │
│  Upstash Redis               ❌ not in codebase                 │
│  pgvector                    ❌ not in schema                   │
│  Gemini API                  ❌ not in codebase (planned)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. TECH STACK (ACTUAL)

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Framework | Next.js App Router | 16.2.7 | ✅ |
| UI | React | 19.2.4 | ✅ |
| Language | TypeScript (strict) | ^5 | ✅ |
| Styling | Tailwind CSS v4 | ^4 | ✅ |
| Animation | Framer Motion | ^12.40 | ✅ |
| 3D | React Three Fiber + Drei | ^9.6 / ^10.7 | ✅ |
| State | Zustand + persist | ^5 | ✅ (localStorage only) |
| Auth | NextAuth v5 beta | ^5.0.0-beta.31 | ✅ |
| OAuth | GitHub only | — | ✅ |
| ORM | Prisma | ^7.8 | ✅ |
| DB | PostgreSQL (Railway) | — | ✅ |
| AI | Anthropic SDK (Haiku) | ^0.104.1 | ⚠ needs API key |
| Animation | GSAP | ^3.15 | installed, not used |
| Icons | lucide-react | ^1.17 | ✅ |

---

## 3. DATABASE MODELS (COMPLETE INVENTORY)

### Auth Models (NextAuth — do not modify)
```
User              id, name, email, emailVerified, image, createdAt
Account           id, userId, type, provider, providerAccountId, tokens...
Session           id, sessionToken, userId, expires
VerificationToken identifier, token, expires
```

### Application Models
```
UserProgress
  userId (1:1 → User)
  xp, level, theoriesExplored[], connectionsDiscovered[]
  achievements[], rabbitHoleChain[], rabbitHoleDepth
  recentDiscoveries[], updatedAt
  ⚠ Populated by API endpoint but store never calls the API

CleanupAuditRun
  mode, status, startedAt, completedAt, triggeredBy
  candidatesScanned, candidatesSentToAI
  keepCount, reviewCount, archiveCandidateCount
  deleteCandidateCount, blacklistCandidateCount
  estimatedCost, reportJson, findings[]

CleanupFinding
  auditRunId, itemType, itemId, title
  classification, relevanceScore, confidence
  reasons (Json), risksIfKept (Json), risksIfDeleted (Json)
  recommendedAction, status, resolvedBy, resolvedAt

DiscoveryBlacklist
  type, value, reason, createdBy, createdAt

DiscoveryWhitelist
  type, value, reason, createdBy, createdAt
```

### ❌ MISSING DB MODELS (claimed as "existing" in project context)
- Node (nodes live as static TypeScript files, not in DB)
- Edge/Relationship (static TypeScript files)
- Theory/Source (static TypeScript files)
- TimelineEvent (static TypeScript file)
- AncientSite (static TypeScript file)
- TrustScore (not implemented)
- ModerationRecord (not implemented)
- VectorEmbedding (not implemented)
- AuditLog (not implemented beyond cleanup)

---

## 4. DATA LAYER — CRITICAL ARCHITECTURE ISSUE

The archive has **TWO separate data systems** that are largely redundant and disconnected:

### System A: `lib/graph/` — Academic Knowledge Graph
- **File**: `lib/graph/nodes.ts` — **42 nodes**
- **File**: `lib/graph/edges.ts` — **55 edges**
- **Type**: `GraphNode` with `title`, `description`, `claims[]`, `criticisms[]`, `mainstream_view`, `tags[]`, `evidence_level`, `confidence_score`, `coordinates`, `year`
- **Used by**: `lib/cleanup/rules.ts` (cleanup auditor)
- **NOT used by**: the actual visual graph (KnowledgeGraph.tsx)

### System B: `lib/data/theories.ts` — UI Theory Cards
- **File**: `lib/data/theories.ts` — **11 theories**
- **Type**: `Theory` with `overview`, `mainClaims[]`, `evidence[]`, `criticisms[]`, `mainstreamPerspective`, `sources[]`, `connections[]`, `color`, `icon`, `featured`, `difficulty`
- **Used by**: `KnowledgeGraph.tsx` (visual graph), `AIAssistant.tsx`, `TheoryPanel.tsx`, `RabbitHoleMode.tsx`, `EvidenceBoard.tsx`

### Additional Static Data
- `lib/data/timeline.ts` — 14 `TimelineEvent` objects
- `lib/data/sites.ts` — 12 `AncientSite` objects

### Type Conflict
`lib/types.ts` defines `GraphNode` (with `label`, `size`) and `GraphEdge` (with `source`, `target`) — **different interfaces from** `lib/graph/types.ts` `GraphNode` and `GraphEdge`. The `lib/types.ts` definitions appear to be dead code not imported anywhere significant.

### Impact
- The visual Knowledge Graph shows only **11 nodes** (from theories.ts)
- The audit system analyzes **42 nodes** (from nodes.ts) but those nodes don't appear in the UI
- There is no single source of truth for archive content

---

## 5. FEATURE INVENTORY

### ✅ Fully Working
| Feature | File | Notes |
|---------|------|-------|
| GitHub OAuth sign-in | lib/auth.ts, NavBar.tsx | Users can sign in |
| Session management | NextAuth + PrismaAdapter | Sessions persisted in DB |
| User progress (localStorage) | lib/store/userStore.ts | XP, level, achievements, rabbitHole |
| Knowledge Graph visualization | components/sections/KnowledgeGraph.tsx | Canvas force-directed, 11 nodes from theories.ts |
| Theory detail panel | components/sections/TheoryPanel.tsx | Slides in from graph, rich content |
| Landing page | components/sections/LandingPage.tsx | Hero, animated entry |
| Universe View | components/sections/UniverseView.tsx | React Three Fiber 3D sphere with orbiting nodes |
| Timeline Explorer | components/sections/TimelineExplorer.tsx | 14 hardcoded events |
| Ancient Globe | components/sections/AncientGlobe.tsx | 12 hardcoded sites, clickable markers |
| Evidence Board | components/sections/EvidenceBoard.tsx | Evidence items from theories |
| Rabbit Hole Mode | components/sections/RabbitHoleMode.tsx | BFS traversal through theory connections |
| Dashboard | components/sections/Dashboard.tsx | XP, level, achievement display |
| Particle/Tunnel effects | components/effects/ | Background animations |
| Super Admin Dashboard | components/admin/CleanupDashboard.tsx | Full UI, 5 tabs |
| Cleanup AI (node rules) | lib/cleanup/rules.ts | Deterministic flagging |
| Cleanup AI (source rules) | lib/cleanup/rules.ts | Source quality checks |
| Cleanup AI (Claude analysis) | lib/cleanup/analyzer.ts | Haiku, needs API key |
| 10 super-admin API routes | app/api/super-admin/ | All guarded, force-dynamic |
| Admin page | app/admin/page.tsx | Email-gated access |

### ⚠ Partially Implemented
| Feature | Status | What's Missing |
|---------|--------|---------------|
| AI Research Assistant | Client-side keyword matching only — NO real AI call | Backend `/api/ai-chat` route calling Claude API |
| User progress DB sync | API endpoint exists (`/api/progress`) but Zustand store never calls it | Wire store → API on login |
| Cleanup AI analysis | Infrastructure complete, needs `ANTHROPIC_API_KEY` env var | Add to Railway |
| RabbitHole depth tracking | Depth tracked in Zustand but DB field `rabbitHoleChain` exists unused | Sync to DB |

### ❌ Claimed But Not Implemented
| Feature | Project Context Claim | Reality |
|---------|----------------------|---------|
| Vector embeddings | "existing" | Not in schema, no embedding code, no pgvector |
| pg_trgm search | "existing" | Not in schema, no full-text search |
| Upstash Redis | "existing" | Not in package.json, not in codebase |
| Trust system | "existing" | No DB model, no code |
| Moderation system | "existing" | No DB model, no code |
| Discovery pipeline | "existing" | No code beyond cleanup rules |
| Source credibility engine | "existing" | Only the cleanup rule checks for spam domains |
| Similarity infrastructure | "existing" | Nothing |
| Audit system (general) | "existing" | Only CleanupAuditRun model |

---

## 6. API ROUTES (COMPLETE INVENTORY)

```
GET/POST  /api/auth/[...nextauth]         NextAuth handler
GET       /api/progress                   Get user progress (requires auth)
POST      /api/progress                   Save user progress (requires auth)

POST      /api/super-admin/cleanup-ai/analyze-nodes     Run node cleanup analysis
POST      /api/super-admin/cleanup-ai/analyze-sources   Run source cleanup analysis
GET       /api/super-admin/cleanup-ai/findings          List findings (filter: itemType, classification, status)
POST      /api/super-admin/cleanup-ai/findings/[id]/resolve
POST      /api/super-admin/cleanup-ai/findings/[id]/ignore
GET       /api/super-admin/cleanup-ai/runs              List past audit runs

GET/POST  /api/super-admin/discovery-blacklist          List/add blacklist entries
DELETE    /api/super-admin/discovery-blacklist/[id]
GET/POST  /api/super-admin/discovery-whitelist          List/add whitelist entries
DELETE    /api/super-admin/discovery-whitelist/[id]
```

**Total: 12 routes (2 public/auth, 10 super-admin)**

---

## 7. ADMIN SYSTEMS

### Super Admin Dashboard (`/admin`)
- Access: `session.user.email === SUPER_ADMIN_EMAIL` (francismathai08@gmail.com)
- **Tab 1 Overview**: Analyze Nodes / Analyze Sources cards with Dry Run / Quick (20) / Full Audit buttons + stat counters
- **Tab 2 Findings**: Paginated findings table with filters by type/classification, expand for reasons/risks
- **Tab 3 Past Runs**: Audit run history table
- **Tab 4 Blacklist**: Add/remove blacklist entries (type, value, reason)
- **Tab 5 Whitelist**: Add/remove whitelist entries

---

## 8. AI SYSTEMS

### Cleanup Auditor (Real AI — Claude Haiku)
- **Location**: `lib/cleanup/analyzer.ts`
- **Model**: `claude-haiku-4-5-20251001`
- **Cost estimate**: ~$0.00025 per candidate
- **Flow**: Static rules flag candidates → Claude classifies as KEEP/REVIEW/ARCHIVE_CANDIDATE/DELETE_CANDIDATE/BLACKLIST_CANDIDATE
- **Status**: ⚠ Needs `ANTHROPIC_API_KEY` in Railway

### AI Research Assistant (Fake)
- **Location**: `components/sections/AIAssistant.tsx`
- **Reality**: `generateResponse()` function — pure keyword matching against local theories data
- **No API call whatsoever** — entirely client-side string matching
- **Risk**: Users believe they are talking to real AI; they are not

---

## 9. DISCOVERY SYSTEMS

**None implemented.** The project context describes a "discovery pipeline" — this does not exist in the codebase. The `DiscoveryBlacklist` and `DiscoveryWhitelist` DB models exist as support tables for a future system.

What exists:
- Cleanup rules engine flags *existing* static content
- No mechanism to discover or ingest *new* content

---

## 10. TIMELINE & GLOBE INTEGRATION

### Timeline (`TimelineExplorer.tsx`)
- 14 hardcoded events in `lib/data/timeline.ts`
- Range: -10,900 BCE to 2023 CE
- Events link to theory IDs but clicking may navigate to theories
- **Not connected to DB**; no ability to add events without editing source

### Globe (`AncientGlobe.tsx`)
- 12 hardcoded sites in `lib/data/sites.ts`
- Renders as a list with lat/lon (no actual 3D globe rendering — it's a card grid)
- **Not connected to DB**; no ability to add sites without editing source

---

## 11. EMBEDDING INFRASTRUCTURE

**Does not exist.** The project context mentions pgvector and similarity infrastructure. Neither is in the Prisma schema, no embedding generation code exists, and `pgvector` is not in `package.json`.

---

## 12. MODERATION SYSTEMS

**Does not exist** beyond the cleanup auditor which is for admin quality review, not user-generated content moderation.

---

## 13. MISSING SYSTEMS (PRIORITIZED)

### P0 — Breaks current user experience
1. **Real AI Assistant**: `AIAssistant.tsx` is fake. Integrate Claude API with a `/api/ai-chat` route.
2. **Progress DB Sync**: Zustand store never calls `/api/progress`. Users who log in on multiple devices lose progress.

### P1 — Core archive functionality
3. **Unified Data Model**: Merge `lib/data/theories.ts` (11 theories, UI-focused) and `lib/graph/nodes.ts` (42 nodes, academic) into a single coherent system. The visual graph should show all 42 nodes, not just 11.
4. **More Nodes/Theories**: Only 11 theories visible to users. The project aims for a growing archive — the data must expand.
5. **DB-backed Content**: Nodes, edges, theories, timeline events, and sites are all hardcoded static files. The DB has no models for them. A production archive needs DB-backed content with admin CRUD.

### P2 — Growth infrastructure
6. **Search**: No backend search. Client-side only, against 11 theories. pgvector full-text or pg_trgm needed.
7. **Vector Embeddings**: For "similar theories" and semantic search.
8. **Discovery Pipeline**: Automated or admin-assisted content discovery and ingestion.

### P3 — Platform features
9. **Source Credibility Engine**: Beyond spam-domain checking — citation verification, academic source scoring.
10. **User Trust System**: User reputation for community features.
11. **Moderation**: If user-submitted content is planned.
12. **Redis Caching**: For graph traversal and AI response caching.

---

## 14. TECHNICAL DEBT

| Issue | Severity | Location |
|-------|----------|----------|
| Dual data systems (theories.ts vs nodes.ts) | HIGH | lib/data/, lib/graph/ |
| Duplicate type definitions (GraphNode in lib/types.ts vs lib/graph/types.ts) | HIGH | lib/types.ts |
| AIAssistant is fake — no real AI | HIGH | components/sections/AIAssistant.tsx |
| Zustand store never calls /api/progress | MEDIUM | lib/store/userStore.ts |
| KnowledgeGraph uses 11 theories, not 42 nodes | MEDIUM | components/sections/KnowledgeGraph.tsx |
| lib/types.ts GraphNode/GraphEdge are dead code | LOW | lib/types.ts |
| GSAP installed but never imported | LOW | package.json |
| AncientGlobe is a card grid, not a globe | LOW | components/sections/AncientGlobe.tsx |
| Static data files cannot grow without code changes | HIGH | All lib/data/ and lib/graph/ |

---

## 15. PRODUCTION RISKS

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `ANTHROPIC_API_KEY` not set | Cleanup AI silently fails | Add to Railway env vars |
| Users expect real AI assistant, get keyword matching | Trust / credibility | Implement real `/api/ai-chat` |
| All archive data is static — no admin can add content | Growth impossible | DB-back nodes, theories, timeline, sites |
| Progress not synced to DB | Data loss on multi-device or session change | Wire userStore → /api/progress |
| No rate limiting on any API route | Abuse / cost | Add rate limiting before launch |
| Prisma migrate runs at server start | Cold start delay on Railway | Already correct in package.json `start` script |

---

## 16. CURRENT COMPLETION ESTIMATE

| System | Estimate |
|--------|----------|
| Visual shell / UI | 85% |
| Auth (GitHub OAuth) | 95% |
| Knowledge graph visualization | 60% (only 11/42 nodes visible) |
| Theory detail content | 25% (11 theories written, ~40+ needed) |
| AI Assistant | 10% (fake — needs real implementation) |
| Timeline | 30% (14 hardcoded events, no DB) |
| Globe / Sites | 30% (12 hardcoded sites, not a real globe) |
| User progress | 50% (localStorage works, DB sync not wired) |
| Admin cleanup system | 80% (needs API key) |
| Discovery pipeline | 0% |
| Vector search / embeddings | 0% |
| Source credibility engine | 5% |
| Trust / moderation | 0% |
| **Overall** | **~35%** |

---

## 17. RECOMMENDED ROADMAP

### Phase 1 — Fix What's Broken (1–2 days)
1. Add `ANTHROPIC_API_KEY` to Railway env vars
2. Wire `userStore.ts` → `/api/progress` (sync on login, save on change)
3. Implement real `/api/ai-chat` route → replace fake `generateResponse`

### Phase 2 — Unify Data Architecture (2–3 days)
4. Decide on ONE data schema for nodes (merge theories.ts + nodes.ts fields)
5. Create DB models: `Node`, `Edge`, `Source`, `TimelineEvent`, `AncientSite`
6. Migrate static data into DB via seed script
7. Update KnowledgeGraph to render all 42+ nodes from DB
8. Add admin CRUD for nodes/edges/theories

### Phase 3 — Expand Content (ongoing)
9. Write remaining 30+ theories to match nodes
10. Expand timeline to 50+ events
11. Expand sites to 30+ locations

### Phase 4 — Intelligence Layer (1 week)
12. Add pgvector to Prisma schema
13. Generate embeddings for all nodes on create/update
14. Semantic search API (`/api/search`)
15. "Similar nodes" recommendation
16. Real discovery pipeline (admin-assisted ingestion)

### Phase 5 — Platform Hardening
17. Rate limiting (Upstash Redis)
18. Source credibility scoring
19. User trust / contribution system
20. Performance optimization (caching graph traversals)

---

## 18. ENVIRONMENT VARIABLES REQUIRED

| Variable | Where Used | Status |
|----------|-----------|--------|
| `DATABASE_URL` | Prisma (prisma.config.ts) | ✅ Set in Railway |
| `GITHUB_CLIENT_ID` | lib/auth.ts | ✅ Set in Railway |
| `GITHUB_CLIENT_SECRET` | lib/auth.ts | ✅ Set in Railway |
| `AUTH_SECRET` | NextAuth (implicit) | ✅ Set in Railway |
| `ANTHROPIC_API_KEY` | lib/cleanup/analyzer.ts | ❌ NOT SET — cleanup AI broken |
| `SUPER_ADMIN_EMAIL` | lib/cleanup/admin-auth.ts | ✅ Defaults to francismathai08@gmail.com |

---

*End of Report*
