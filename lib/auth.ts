import NextAuth, { DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { prisma } from '@/lib/db';
import { authConfig } from '@/lib/auth.config';

// ── Role hierarchy ────────────────────────────────────────────────────────────
// owner > admin > moderation_admin > reviewer > source_verifier
//   > verified_contributor > contributor > user | banned
//
// ADMIN_EMAIL → 'owner' on every sign-in.
// Promote other users via /api/admin/users/[id]/role.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'owner'
  | 'admin'
  | 'moderation_admin'
  | 'reviewer'
  | 'source_verifier'
  | 'verified_contributor'
  | 'contributor'
  | 'user'
  | 'banned';

const ADMIN_ROLES:    UserRole[] = ['owner', 'admin'];
const MOD_ROLES:      UserRole[] = ['owner', 'admin', 'moderation_admin'];
const REVIEWER_ROLES: UserRole[] = ['owner', 'admin', 'reviewer'];

export function isAdminSession(
  session: { user?: { role?: string; email?: string | null } } | null,
): boolean {
  if (!session?.user) return false;
  if (session.user.role && (ADMIN_ROLES as string[]).includes(session.user.role)) return true;
  return session.user.email === process.env.ADMIN_EMAIL;
}

export function isModOrAboveSession(
  session: { user?: { role?: string; email?: string | null } } | null,
): boolean {
  if (!session?.user) return false;
  if (session.user.role && (MOD_ROLES as string[]).includes(session.user.role)) return true;
  return session.user.email === process.env.ADMIN_EMAIL;
}

export function isReviewerOrAboveSession(
  session: { user?: { role?: string; email?: string | null } } | null,
): boolean {
  if (!session?.user) return false;
  if (session.user.role && (REVIEWER_ROLES as string[]).includes(session.user.role)) return true;
  return session.user.email === process.env.ADMIN_EMAIL;
}

/** True only for the platform owner (super-admin). */
export function isOwnerSession(
  session: { user?: { role?: string; email?: string | null } } | null,
): boolean {
  if (!session?.user) return false;
  return session.user.role === 'owner' || session.user.email === process.env.ADMIN_EMAIL;
}

// ── NextAuth type augmentation ────────────────────────────────────────────────
declare module 'next-auth' {
  interface Session {
    user: { id: string; role: UserRole } & DefaultSession['user'];
  }
  interface User {
    role?: string;
  }
}
declare module '@auth/core/jwt' {
  interface JWT {
    id?:   string;
    role?: string;
  }
}

// ── Runtime flags ─────────────────────────────────────────────────────────────
const hasDB     = !!process.env.DATABASE_URL;
const hasGoogle = !!(process.env.AUTH_GOOGLE_ID  && process.env.AUTH_GOOGLE_SECRET);
const hasGitHub = !!(process.env.AUTH_GITHUB_ID  && process.env.AUTH_GITHUB_SECRET);

const providers = [
  ...(hasGoogle ? [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: { access_type: 'offline', prompt: 'select_account' },
      },
    }),
  ] : []),
  ...(hasGitHub ? [
    GitHub({
      clientId:     process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  secret: process.env.AUTH_SECRET ?? 'nexus-dev-secret-set-AUTH_SECRET-in-production',

  ...(hasDB ? { adapter: PrismaAdapter(prisma) } : {}),

  providers,

  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user }) {
      if (hasDB && user?.email === process.env.ADMIN_EMAIL) {
        try {
          await prisma.user.update({
            where: { email: user.email },
            data:  { role: 'owner' },
          });
        } catch {
          // User row may not exist yet on first sign-in; role corrected next time.
        }
      }
      return true;
    },
  },
});
