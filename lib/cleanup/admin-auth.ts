import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'francismathai08@gmail.com';

export async function requireSuperAdmin(): Promise<
  { error: NextResponse; session: null } | { error: null; session: Session }
> {
  const raw = await auth();
  const session = raw as Session | null;
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  if (session.user.email !== SUPER_ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return email === SUPER_ADMIN_EMAIL;
}
