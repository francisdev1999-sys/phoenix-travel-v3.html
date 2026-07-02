# THE NEXUS ARCHIVE

A full-stack, community-driven **knowledge-graph platform** for sourced
alternative-history / ancient-mystery research. Nodes (topics) and Edges
(relationships) form a navigable graph; every claim must carry sources,
criticisms, and a mainstream view. An AI layer (Claude) reviews submissions,
generates rabbit-hole narratives, and drives an **autonomous growth pipeline**
that discovers, promotes, and connects new content on a schedule.

> The repo directory is named `phoenix-travel-v3.html` for historical reasons —
> the actual project is `nexus-archive` (see `package.json`).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 ·
Framer Motion · Three.js / React Three Fiber · Zustand · NextAuth v5 ·
Prisma 7 + PostgreSQL (pgvector + pg_trgm) · Anthropic Claude · Voyage
embeddings · Upstash Redis (rate limit) · Resend (email). Deployed on Railway.

## Structure

- `app/` — App Router pages + **~130 API routes** under `app/api/`
  - `app/api/cron/` — 12 scheduled jobs (discovery, promotion, audit, trust,
    nightly `learning-pass`…)
  - `app/api/admin/` — admin panel APIs (role: `owner` | `admin`)
  - `app/api/super-admin/` — privileged APIs (also `owner` | `admin`; owner-only
    protections are enforced per-route)
- `components/sections/AdminPanel.tsx` — the full admin control panel (all tabs)
- `components/admin/` — admin dashboards (cleanup, user-intel, moderation…)
- `lib/` — business logic
  - `lib/discovery/` — autonomous node/source/relationship discovery + promoters
  - `lib/learning/` — self-learning models (logistic "neurons"): a node-promotion
    model AND a connection-quality (edge) model. Features are intrinsic + graph
    signals; datasets are drawn from the whole archive (published nodes/edges as
    positives, rejected/archived as negatives); shared trainer, scorer, auto-retrain
  - `lib/jobs/` — IngestionJob queue + processor
  - `lib/cron/tracker.ts` — wraps every cron handler to record a `CronRun`
  - `lib/cleanup/`, `lib/similarity/`, `lib/maturity/`, `lib/trust-score.ts`,
    `lib/rank-system.ts`, `lib/permissions.ts`, `lib/quality-gates.ts`
- `prisma/schema.prisma` — 68 models; migrations in `prisma/migrations/`
- `middleware.ts` — security headers + route auth (`/api/admin`, `/api/super-admin`,
  `/api/cron` via `CRON_SECRET`)

## Roles

`owner > admin > moderation_admin > reviewer > source_verifier >
verified_contributor > contributor > user | banned`

- `admin` has **full control-panel access** (all tabs + `/api/super-admin/*`).
- Only an existing **owner** can grant/revoke `owner`/`admin` (that's how a
  second owner is minted, from the Users tab). Owner targets are protected from
  ban/suspend/demote.

## Autonomous pipeline

GitHub Actions (`.github/workflows/autonomous-growth-cron.yml`) is the only
scheduler in production — it POSTs `/api/cron/<job>` with `CRON_SECRET`.
Loop: discover → auto-promote (strict quality gates **+ a learned lane**) →
suggest/auto-approve relationships → discover/auto-approve sources → similarity
→ audit/cleanup → trust/rank → nightly `learning-pass`. Every run is recorded in
`CronRun`; the admin panel surfaces per-job health (`/api/admin/cron-health`).

The **learned lane**: an online-learning model (`lib/learning/`) trained nightly
on the whole archive (published nodes + their sources/connections as positives,
rejected/archived items as negatives) scores each discovered candidate. When the
strict static gate declines, a *mature* model (enough labeled data + accuracy bar)
may auto-approve a high-confidence candidate that also clears hard safety guards.
A cold/immature model has no authority, so it never publishes junk on day one.
Besides the nightly pass, `emit()` fires a gated background retrain as the archive
grows (`maybeAutoTrain`), so the model keeps learning from new data automatically.
The admin **Learning** tab shows weights, accuracy history, and live precision.

## Commands

```bash
npm run dev    # dev server
npm run build  # prisma generate && next build
npm run start  # prisma migrate deploy && next start
npm run lint   # eslint
npx tsc --noEmit   # typecheck
npx vitest run     # unit tests (__tests__/)
```

## Conventions

- No auto-publishing of user content — everything goes through review + trust
  gates. Autonomous auto-approve lanes are deliberately strict; don't loosen
  quality thresholds without being asked.
- Cron handlers are called **directly** (no internal HTTP hop) when composed —
  the `/api/super-admin/*` routes are session-gated and reject cookieless calls.
