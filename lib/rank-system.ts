/**
 * Rank Progression & Badge System
 *
 * Ranks are recognition only — they NEVER grant authority automatically.
 * Badge award is idempotent; re-awarding a badge is a no-op.
 */

import { prisma } from '@/lib/db';

// ── Rank definitions ──────────────────────────────────────────────────────────

export interface RankDefinition {
  name:        string;
  minActivity: number;
  minTrust:    number;
  minApproved: number;
  manualOnly:  boolean;
}

export const RANKS: RankDefinition[] = [
  { name: 'New Seeker',          minActivity:  0,  minTrust:  0,  minApproved:  0, manualOnly: false },
  { name: 'Active Seeker',       minActivity: 20,  minTrust:  0,  minApproved:  0, manualOnly: false },
  { name: 'Archive Explorer',    minActivity: 50,  minTrust: 21,  minApproved:  0, manualOnly: false },
  { name: 'Source Contributor',  minActivity: 30,  minTrust: 30,  minApproved:  1, manualOnly: false },
  { name: 'Evidence Builder',    minActivity: 40,  minTrust: 40,  minApproved:  3, manualOnly: false },
  { name: 'Trusted Seeker',      minActivity: 50,  minTrust: 60,  minApproved:  5, manualOnly: false },
  { name: 'Verified Contributor',minActivity: 60,  minTrust: 75,  minApproved: 10, manualOnly: false },
  { name: 'Research Ally',       minActivity: 70,  minTrust: 85,  minApproved: 20, manualOnly: false },
  { name: 'Archive Fellow',      minActivity: 80,  minTrust: 90,  minApproved: 30, manualOnly: false },
  { name: 'Council Reviewer',    minActivity:  0,  minTrust:  0,  minApproved:  0, manualOnly: true  },
];

export function computeRank(
  activityScore: number,
  trustScore:    number,
  approvedCount: number,
): string {
  // Walk backwards — highest rank that all conditions satisfy
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const r = RANKS[i];
    if (r.manualOnly) continue;
    if (
      activityScore >= r.minActivity &&
      trustScore    >= r.minTrust    &&
      approvedCount >= r.minApproved
    ) {
      return r.name;
    }
  }
  return 'New Seeker';
}

export async function refreshUserRank(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { activityScore: true, trustScore: true, approvedCount: true, rank: true },
  });
  if (!user) return 'New Seeker';

  const newRank = computeRank(user.activityScore, user.trustScore, user.approvedCount);
  if (newRank !== user.rank) {
    await prisma.user.update({ where: { id: userId }, data: { rank: newRank } });
  }
  return newRank;
}

// ── Badge award ───────────────────────────────────────────────────────────────

export async function awardBadge(
  userId:    string,
  badgeId:   string,
  awardedBy: string = 'system',
): Promise<boolean> {
  const exists = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId } },
  });
  if (exists) return false;

  const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
  if (!badge) return false;

  await prisma.userBadge.create({ data: { userId, badgeId, awardedBy } });
  return true;
}

// ── Automatic badge evaluation ────────────────────────────────────────────────

export async function evaluateBadges(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      createdAt:      true,
      trustScore:     true,
      approvedCount:  true,
      rejectedCount:  true,
      submissionCount:true,
      role:           true,
      earnedBadges:   { select: { badgeId: true } },
    },
  });
  if (!user) return [];

  const earned    = new Set(user.earnedBadges.map(b => b.badgeId));
  const awarded: string[] = [];

  const grant = async (id: string) => {
    if (!earned.has(id)) {
      const ok = await awardBadge(userId, id);
      if (ok) awarded.push(id);
    }
  };

  // Founding member — account created within first 90 days of platform (hardcoded date)
  const platformLaunch = new Date('2026-01-01');
  const ageMs = new Date().getTime() - platformLaunch.getTime();
  if (ageMs < 90 * 24 * 60 * 60 * 1000) await grant('founding-member');

  // Account age
  const memberMs = new Date().getTime() - new Date(user.createdAt).getTime();
  if (memberMs >= 365 * 24 * 60 * 60 * 1000) await grant('one-year');

  // Contribution milestones
  if (user.approvedCount >= 3) await grant('evidence-builder');

  // Reliable contributor
  if (user.submissionCount >= 10) {
    const rate = user.rejectedCount / user.submissionCount;
    if (rate < 0.1) await grant('reliable-contributor');
  }

  // Trusted researcher
  if (user.trustScore >= 80) await grant('trusted-researcher');

  // Authority badges — role-based
  if ((['source_verifier', 'reviewer', 'admin', 'owner'] as string[]).includes(user.role)) {
    await grant('source-verifier');
  }
  if ((['reviewer', 'admin', 'owner'] as string[]).includes(user.role)) {
    await grant('reviewer');
  }
  if ((['admin', 'owner'] as string[]).includes(user.role)) {
    await grant('admin');
  }

  // Source hunter — query approved sources
  const approvedSources = await prisma.source.count({
    where: { submittedBy: userId, status: 'approved' },
  });
  if (approvedSources >= 5) await grant('source-hunter');

  // Graph connector — query approved relationships
  const approvedEdges = await prisma.proposedEdge.count({
    where: { submittedBy: userId, status: 'approved' },
  });
  if (approvedEdges >= 5) await grant('graph-connector');

  return awarded;
}

// ── Activity score ────────────────────────────────────────────────────────────

/**
 * Log a user activity and update their activity score.
 * Score decays naturally — recent activity weights more.
 */
export const ACTIVITY_WEIGHTS: Record<string, number> = {
  login:     2,
  node_view: 1,
  search:    0.5,
  save:      1,
  submit:    3,
  comment:   1.5,
};

export async function logActivity(
  userId:     string,
  actionType: string,
  detail?:    Record<string, unknown>,
): Promise<void> {
  const weight = ACTIVITY_WEIGHTS[actionType] ?? 0.5;

  await prisma.$transaction([
    prisma.userActivityLog.create({
      data: { userId, actionType, detail: JSON.parse(JSON.stringify(detail ?? {})) },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt:  new Date(),
        activityScore: { increment: weight },
      },
    }),
  ]);

  // Hard cap at 1000 — prevents rank system distortion for long-time users
  await prisma.user.updateMany({
    where: { id: userId, activityScore: { gt: 1000 } },
    data:  { activityScore: 1000 },
  });
}

export async function getUserBadges(userId: string) {
  return prisma.userBadge.findMany({
    where:   { userId },
    include: { badge: true },
    orderBy: { awardedAt: 'asc' },
  });
}
