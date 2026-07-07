export const dynamic = 'force-dynamic';
/**
 * Server mirror of the client engagement store (lib/store/engagementStore).
 *
 * GET  /api/user/engagement            → the signed-in user's snapshot
 * POST /api/user/engagement { ...snap } → conservatively merge & persist
 *
 * The merge is progress-preserving: XP/streak/depth take the max, arrays union,
 * daily-loop days take the later. A stale client can therefore never erase
 * progress made on another device. Anonymous callers get an empty snapshot and
 * their state simply lives in localStorage.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

interface Collection { id: string; name: string; nodeIds: string[] }
interface Expedition { id: string; name: string; chain: string[]; notes: string; depth: number; createdAt: number }

interface Snapshot {
  xp: number;
  visited: string[];
  connectionsFound: string[];
  maxDepth: number;
  bookmarks: string[];
  collections: Collection[];
  expeditions: Expedition[];
  proposals: string[];
  streak: number;
  lastActiveDay: number | null;
  questDay: number | null;
  mysteryDay: number | null;
  achUnlocked: string[];
  onboardingDone: boolean;
}

const EMPTY: Snapshot = {
  xp: 0, visited: [], connectionsFound: [], maxDepth: 0, bookmarks: [],
  collections: [], expeditions: [], proposals: [], streak: 0,
  lastActiveDay: null, questDay: null, mysteryDay: null, achUnlocked: [], onboardingDone: false,
};

type ProgressRow = {
  xp: number; theoriesExplored: string[]; connectionsDiscovered: string[]; rabbitHoleDepth: number;
  achievements: string[]; bookmarks: string[]; proposals: string[]; collections: unknown; expeditions: unknown;
  streak: number; lastActiveDay: number | null; questDay: number | null; mysteryDay: number | null; onboardingDone: boolean;
};

function rowToSnapshot(p: ProgressRow): Snapshot {
  return {
    xp:               p.xp,
    visited:          p.theoriesExplored,
    connectionsFound: p.connectionsDiscovered,
    maxDepth:         p.rabbitHoleDepth,
    bookmarks:        p.bookmarks,
    collections:      Array.isArray(p.collections) ? (p.collections as Collection[]) : [],
    expeditions:      Array.isArray(p.expeditions) ? (p.expeditions as Expedition[]) : [],
    proposals:        p.proposals,
    streak:           p.streak,
    lastActiveDay:    p.lastActiveDay,
    questDay:         p.questDay,
    mysteryDay:       p.mysteryDay,
    achUnlocked:      p.achievements,
    onboardingDone:   p.onboardingDone,
  };
}

const PROGRESS_SELECT = {
  xp: true, theoriesExplored: true, connectionsDiscovered: true, rabbitHoleDepth: true,
  achievements: true, bookmarks: true, proposals: true, collections: true, expeditions: true,
  streak: true, lastActiveDay: true, questDay: true, mysteryDay: true, onboardingDone: true,
} as const;

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json(EMPTY);

  const p = await prisma.userProgress.findUnique({ where: { userId }, select: PROGRESS_SELECT });
  return NextResponse.json(p ? rowToSnapshot(p as ProgressRow) : EMPTY);
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function laterDay(a: number | null, b: unknown): number | null {
  const bb = typeof b === 'number' ? b : null;
  if (a == null) return bb;
  if (bb == null) return a;
  return Math.max(a, bb);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, reason: 'anonymous' });

  const body = (await req.json().catch(() => ({}))) as Partial<Snapshot>;

  const existing = await prisma.userProgress.findUnique({ where: { userId }, select: PROGRESS_SELECT });
  const cur = existing ? rowToSnapshot(existing as ProgressRow) : EMPTY;

  const union = (a: string[], b: unknown) => Array.from(new Set([...a, ...asArray(b)]));

  // Merge collections by id (union node lists); expeditions by id (keep both sets).
  const collById = new Map(cur.collections.map(c => [c.id, { ...c }]));
  for (const c of Array.isArray(body.collections) ? body.collections : []) {
    if (!c || typeof c.id !== 'string') continue;
    const prev = collById.get(c.id);
    if (prev) prev.nodeIds = Array.from(new Set([...prev.nodeIds, ...asArray(c.nodeIds)]));
    else collById.set(c.id, { id: c.id, name: String(c.name ?? 'Collection'), nodeIds: asArray(c.nodeIds) });
  }
  const expById = new Map(cur.expeditions.map(e => [e.id, e]));
  for (const e of Array.isArray(body.expeditions) ? body.expeditions : []) {
    if (e && typeof e.id === 'string' && !expById.has(e.id)) expById.set(e.id, e);
  }

  const merged: Snapshot = {
    xp:               Math.max(cur.xp, num(body.xp)),
    visited:          union(cur.visited, body.visited),
    connectionsFound: union(cur.connectionsFound, body.connectionsFound),
    maxDepth:         Math.max(cur.maxDepth, num(body.maxDepth)),
    bookmarks:        union(cur.bookmarks, body.bookmarks),
    collections:      Array.from(collById.values()),
    expeditions:      Array.from(expById.values()).sort((a, b) => b.createdAt - a.createdAt),
    proposals:        union(cur.proposals, body.proposals),
    streak:           Math.max(cur.streak, num(body.streak)),
    lastActiveDay:    laterDay(cur.lastActiveDay, body.lastActiveDay),
    questDay:         laterDay(cur.questDay, body.questDay),
    mysteryDay:       laterDay(cur.mysteryDay, body.mysteryDay),
    achUnlocked:      union(cur.achUnlocked, body.achUnlocked),
    onboardingDone:   cur.onboardingDone || !!body.onboardingDone,
  };

  const data = {
    xp:                    merged.xp,
    theoriesExplored:      merged.visited,
    connectionsDiscovered: merged.connectionsFound,
    rabbitHoleDepth:       merged.maxDepth,
    achievements:          merged.achUnlocked,
    bookmarks:             merged.bookmarks,
    proposals:             merged.proposals,
    collections:           merged.collections as unknown as Prisma.InputJsonValue,
    expeditions:           merged.expeditions as unknown as Prisma.InputJsonValue,
    streak:                merged.streak,
    lastActiveDay:         merged.lastActiveDay,
    questDay:              merged.questDay,
    mysteryDay:            merged.mysteryDay,
    onboardingDone:        merged.onboardingDone,
  };

  await prisma.userProgress.upsert({
    where:  { userId },
    create: { userId, ...data },
    update: data,
  });

  return NextResponse.json(merged);
}
