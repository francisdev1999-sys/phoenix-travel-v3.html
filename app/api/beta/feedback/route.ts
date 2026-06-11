export const dynamic = 'force-dynamic';
/**
 * POST /api/beta/feedback
 * Submit beta feedback. Works for both authenticated and anonymous users.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const CATEGORIES = ['bug', 'usability', 'credibility', 'discovery', 'content', 'other'] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();

  const { category, severity, page, description, screenshotUrl, reproSteps } = body;

  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (!SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: 'Invalid severity' }, { status: 400 });
  }
  if (!page || typeof page !== 'string') {
    return NextResponse.json({ error: 'page is required' }, { status: 400 });
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return NextResponse.json({ error: 'description must be at least 10 characters' }, { status: 400 });
  }

  const feedback = await prisma.betaFeedback.create({
    data: {
      userId:       session?.user?.id ?? null,
      category,
      severity,
      page:         page.slice(0, 200),
      description:  description.trim().slice(0, 4000),
      screenshotUrl: screenshotUrl?.slice(0, 500) || null,
      reproSteps:   reproSteps?.trim().slice(0, 2000) || null,
    },
  });

  return NextResponse.json({ id: feedback.id }, { status: 201 });
}
