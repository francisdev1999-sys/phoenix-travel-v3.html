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

// Roles that may reach the admin control panel and its privileged endpoints.
// The `admin` role now has full panel access (owner keeps exclusive rights
// only over owner-destructive actions, enforced per-route).
const PANEL_ADMIN_ROLES = new Set(['owner', 'admin']);

/**
 * Gate for the admin control panel + its privileged (`/api/super-admin/*`)
 * endpoints. Grants access to the `owner`/`admin` roles OR any configured
 * super-admin email. Owner-only protections (e.g. cannot demote/ban an owner)
 * are enforced separately in the individual routes.
 */
export async function requireSuperAdmin(): Promise<
  { error: NextResponse; session: null } | { error: null; session: Session }
> {
  const raw = await auth();
  const session = raw as Session | null;
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  if (!hasPanelAccess(session)) {
    return { error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

/** True for the owner/admin roles, or any configured super-admin email. */
export function hasPanelAccess(
  session: { user?: { role?: string | null; email?: string | null } } | null,
): boolean {
  if (!session?.user) return false;
  if (session.user.role && PANEL_ADMIN_ROLES.has(session.user.role)) return true;
  return isSuperAdminEmail(session.user.email);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && SUPER_ADMIN_EMAILS.has(email.toLowerCase());
}
