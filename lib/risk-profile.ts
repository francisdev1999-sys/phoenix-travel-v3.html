import { prisma } from '@/lib/db';

export type RiskLevel = 'low' | 'watch' | 'suspicious' | 'high_risk';

export interface RiskFactor { reason: string; delta: number }

export interface RiskResult {
  riskScore: number;
  riskLevel: RiskLevel;
  spamScore: number;
  botScore: number;
  reasons: RiskFactor[];
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 20) return 'low';
  if (score <= 50) return 'watch';
  if (score <= 75) return 'suspicious';
  return 'high_risk';
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low:         'text-emerald-400',
  watch:       'text-yellow-400',
  suspicious:  'text-orange-400',
  high_risk:   'text-red-400',
};

export const RISK_BG: Record<RiskLevel, string> = {
  low:         'bg-emerald-900/20 border-emerald-500/20',
  watch:       'bg-yellow-900/20 border-yellow-500/20',
  suspicious:  'bg-orange-900/20 border-orange-500/20',
  high_risk:   'bg-red-900/20 border-red-500/20',
};

// ── Pure scoring (no DB calls) ────────────────────────────────────────────────

export function scoreRisk(data: {
  submissionCount:        number;
  approvedCount:          number;
  rejectedCount:          number;
  accountAgeDays:         number;
  recentSubmissions24h:   number;
  recentEvents1h:         number;
  distinctPaths1h:        number;
  maxSamePathRepeats:     number;
  confirmedSpamCount:     number;
  reportCount:            number;
  role:                   string;
  trustScore:             number;
  isBanned:               boolean;
}): RiskResult {
  const reasons: RiskFactor[] = [];
  let risk = 0;
  let spam = 0;
  let bot  = 0;

  const add = (reason: string, delta: number, spamDelta = 0, botDelta = 0) => {
    reasons.push({ reason, delta });
    risk += delta; spam += spamDelta; bot += botDelta;
  };

  // ── Risk-increasing signals ─────────────────────────────────────────────────
  if (data.isBanned) {
    add('User is currently banned', 30);
  }

  if (data.submissionCount > 0) {
    const rate = data.rejectedCount / data.submissionCount;
    if (rate > 0.6)      add('Very high rejection rate (>60%)', 25, 10);
    else if (rate > 0.4) add('High rejection rate (>40%)',      15, 5);
    else if (rate > 0.2) add('Elevated rejection rate (>20%)',  8);
  }

  if (data.confirmedSpamCount > 0) {
    const d = Math.min(30, data.confirmedSpamCount * 10);
    add(`${data.confirmedSpamCount} confirmed spam submission(s)`, d, d);
  }

  if (data.reportCount >= 5)      add(`${data.reportCount} reports filed against account`, 25);
  else if (data.reportCount >= 3) add(`${data.reportCount} reports filed against account`, 15);
  else if (data.reportCount > 0)  add(`${data.reportCount} report filed against account`,  8);

  if (data.accountAgeDays < 1)      add('Account created less than 1 day ago',  20);
  else if (data.accountAgeDays < 7) add('Account created less than 7 days ago', 15);

  if (data.recentSubmissions24h > 20)      add(`${data.recentSubmissions24h} submissions in last 24 h`, 25, 20);
  else if (data.recentSubmissions24h > 10) add(`${data.recentSubmissions24h} submissions in last 24 h`, 12, 8);

  // Bot signals
  if (data.recentEvents1h > 300)      add(`${data.recentEvents1h} events in last hour — possible bot`, 35, 0, 35);
  else if (data.recentEvents1h > 150) add(`${data.recentEvents1h} events in last hour — suspicious`,  22, 0, 22);
  else if (data.recentEvents1h > 80)  add(`${data.recentEvents1h} events in last hour — elevated`,    12, 0, 12);

  if (data.maxSamePathRepeats > 80)       add(`Same route hit ${data.maxSamePathRepeats}× (bot pattern)`, 25, 0, 25);
  else if (data.maxSamePathRepeats > 40)  add(`Same route hit ${data.maxSamePathRepeats}× (suspicious)`,  15, 0, 15);

  if (data.recentEvents1h > 20 && data.distinctPaths1h < 3) {
    add('No browsing diversity in last hour — bot pattern', 18, 0, 18);
  }

  // ── Risk-decreasing signals ─────────────────────────────────────────────────
  if (data.accountAgeDays > 365)     add('Long-standing account (>1 year)',    -15);
  else if (data.accountAgeDays > 90) add('Established account (>90 days)',     -10);
  else if (data.accountAgeDays > 30) add('Established account (>30 days)',      -5);

  if (data.approvedCount >= 20)     add(`${data.approvedCount} approved contributions`, -20);
  else if (data.approvedCount >= 10) add(`${data.approvedCount} approved contributions`, -15);
  else if (data.approvedCount >= 3)  add(`${data.approvedCount} approved contributions`,  -8);
  else if (data.approvedCount > 0)   add(`${data.approvedCount} approved contribution(s)`, -3);

  if (['owner', 'admin', 'reviewer'].includes(data.role)) {
    add(`Trusted role: ${data.role}`, -20);
  }

  if (data.trustScore >= 80)      add('High trust score (≥80)',     -12);
  else if (data.trustScore >= 65) add('Good trust score (≥65)',      -6);

  return {
    riskScore: Math.min(100, Math.max(0, risk)),
    riskLevel: getRiskLevel(Math.min(100, Math.max(0, risk))),
    spamScore: Math.min(100, Math.max(0, spam)),
    botScore:  Math.min(100, Math.max(0, bot)),
    reasons,
  };
}

// ── DB-backed: compute + upsert profile for one user ─────────────────────────

export async function computeAndSaveRiskProfile(userId: string): Promise<RiskResult> {
  const now   = new Date();
  const h1ago = new Date(now.getTime() - 60 * 60 * 1000);
  const d1ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [user, events1h, submittedRecent, confirmedSpamCount] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { role: true, trustScore: true, isBanned: true, createdAt: true,
                approvedCount: true, rejectedCount: true, submissionCount: true },
    }),
    prisma.userActivityEvent.findMany({
      where:   { userId, createdAt: { gte: h1ago } },
      select:  { path: true },
    }),
    prisma.proposedNode.count({ where: { submittedBy: userId, createdAt: { gte: d1ago } } }),
    prisma.proposedNode.count({ where: { submittedBy: userId, isSpam: true } }),
  ]);

  if (!user) return { riskScore: 0, riskLevel: 'low', spamScore: 0, botScore: 0, reasons: [] };

  // Compute bot signals from recent activity events
  const pathCounts: Record<string, number> = {};
  for (const e of events1h) {
    if (e.path) pathCounts[e.path] = (pathCounts[e.path] ?? 0) + 1;
  }
  const distinctPaths    = Object.keys(pathCounts).length;
  const maxSamePathRepeat = Math.max(0, ...Object.values(pathCounts));

  const result = scoreRisk({
    submissionCount:      user.submissionCount,
    approvedCount:        user.approvedCount,
    rejectedCount:        user.rejectedCount,
    accountAgeDays:       (now.getTime() - user.createdAt.getTime()) / 86_400_000,
    recentSubmissions24h: submittedRecent,
    recentEvents1h:       events1h.length,
    distinctPaths1h:      distinctPaths,
    maxSamePathRepeats:   maxSamePathRepeat,
    confirmedSpamCount:   confirmedSpamCount,
    reportCount:          0,
    role:                 user.role,
    trustScore:           user.trustScore,
    isBanned:             user.isBanned,
  });

  await prisma.userRiskProfile.upsert({
    where:  { userId },
    create: { userId, ...result, reasons: result.reasons as object[], lastCalculatedAt: now },
    update: { ...result, reasons: result.reasons as object[], lastCalculatedAt: now },
  });

  return result;
}
