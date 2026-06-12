import { prisma } from '@/lib/db';

const DAILY_LIMIT_USD   = parseFloat(process.env.AI_DAILY_LIMIT_USD   ?? '2.0');
const MONTHLY_LIMIT_USD = parseFloat(process.env.AI_MONTHLY_LIMIT_USD ?? '20.0');

function todayKey():   string { return new Date().toISOString().slice(0, 10); }
function monthKey():   string { return new Date().toISOString().slice(0, 7); }

export async function checkBudget(): Promise<{ ok: boolean; reason?: string }> {
  const [daily, monthly] = await Promise.all([
    prisma.aiBudget.findUnique({ where: { period_periodType: { period: todayKey(),  periodType: 'daily'   } } }),
    prisma.aiBudget.findUnique({ where: { period_periodType: { period: monthKey(),  periodType: 'monthly' } } }),
  ]);

  if (daily?.emergencyStop || monthly?.emergencyStop)
    return { ok: false, reason: 'Emergency stop active' };
  if (daily   && daily.estimatedCostUsd   >= (daily.dailyLimitUsd     ?? DAILY_LIMIT_USD))
    return { ok: false, reason: `Daily AI budget exhausted ($${daily.estimatedCostUsd.toFixed(2)})` };
  if (monthly && monthly.estimatedCostUsd >= (monthly.monthlyLimitUsd ?? MONTHLY_LIMIT_USD))
    return { ok: false, reason: `Monthly AI budget exhausted ($${monthly.estimatedCostUsd.toFixed(2)})` };

  return { ok: true };
}

export async function recordUsage(tokensIn: number, tokensOut: number, model = 'claude-haiku-4-5') {
  // Pricing per million tokens (input / output)
  const rates: Record<string, [number, number]> = {
    'claude-haiku-4-5':   [1.00, 5.00],
    'claude-sonnet-4-6':  [3.00, 15.00],
    'claude-opus-4-8':    [5.00, 25.00],
  };
  const [inRate, outRate] = rates[model] ?? [1.00, 5.00];
  const cost = (tokensIn / 1_000_000) * inRate + (tokensOut / 1_000_000) * outRate;

  const upsertData = (period: string, periodType: string) => ({
    where:  { period_periodType: { period, periodType } },
    create: { period, periodType, tokensIn, tokensOut, estimatedCostUsd: cost,
              dailyLimitUsd: DAILY_LIMIT_USD, monthlyLimitUsd: MONTHLY_LIMIT_USD },
    update: { tokensIn:         { increment: tokensIn },
              tokensOut:        { increment: tokensOut },
              estimatedCostUsd: { increment: cost } },
  });

  await Promise.all([
    prisma.aiBudget.upsert(upsertData(todayKey(),  'daily')),
    prisma.aiBudget.upsert(upsertData(monthKey(), 'monthly')),
  ]);

  return cost;
}

export async function getBudgetStatus() {
  const [daily, monthly] = await Promise.all([
    prisma.aiBudget.findUnique({ where: { period_periodType: { period: todayKey(),  periodType: 'daily'   } } }),
    prisma.aiBudget.findUnique({ where: { period_periodType: { period: monthKey(),  periodType: 'monthly' } } }),
  ]);
  return {
    daily: {
      spent: daily?.estimatedCostUsd ?? 0,
      limit: daily?.dailyLimitUsd ?? DAILY_LIMIT_USD,
      stop:  daily?.emergencyStop ?? false,
    },
    monthly: {
      spent: monthly?.estimatedCostUsd ?? 0,
      limit: monthly?.monthlyLimitUsd ?? MONTHLY_LIMIT_USD,
      stop:  monthly?.emergencyStop ?? false,
    },
  };
}
