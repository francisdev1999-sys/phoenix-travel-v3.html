import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

const raw = process.env.SUPER_ADMIN_EMAIL ?? 'francismathai08@gmail.com';
const SUPER_ADMIN_EMAILS = new Set(
  raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
);

// Always include the two known owner emails
SUPER_ADMIN_EMAILS.add('francismathai08@gmail.com');
SUPER_ADMIN_EMAILS.add('fastfacts711@gmail.com');

export async function requireSuperAdmin(): Promise<
  { error: NextResponse; session: null } | { error: null; session: Session }
> {
  const raw = await auth();
  const session = raw as Session | null;
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  if (!isSuperAdminEmail(session.user.email)) {
    return { error: NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && SUPER_ADMIN_EMAILS.has(email.toLowerCase());
}
