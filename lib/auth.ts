import NextAuth, { DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/db';

// ── Role hierarchy ────────────────────────────────────────────────────────────
// owner > admin > reviewer > contributor > user
// ADMIN_EMAIL → 'owner' on every sign-in.
// Promote other users by setting role in DB directly.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'reviewer' | 'contributor' | 'user';

const ADMIN_ROLES:    UserRole[] = ['owner', 'admin'];
const REVIEWER_ROLES: UserRole[] = ['owner', 'admin', 'reviewer'];

/** True if the session belongs to an admin-or-higher user. */
export function isAdminSession(
  session: { user?: { role?: string; email?: string | null } } | null,
): boolean {
  if (!session?.user) return false;
  if (session.user.role && ADMIN_ROLES.includes(session.user.role as UserRole)) return true;
  return session.user.email === process.env.ADMIN_EMAIL;
}

/** True if the session belongs to a reviewer-or-higher user (owner/admin/reviewer). */
export function isReviewerOrAboveSession(
  session: { user?: { role?: string; email?: string | null } } | null,
): boolean {
  if (!session?.user) return false;
  if (session.user.role && REVIEWER_ROLES.includes(session.user.role as UserRole)) return true;
  return session.user.email === process.env.ADMIN_EMAIL;
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
const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? 'nexus-dev-secret-set-AUTH_SECRET-in-production',

  ...(hasDB ? { adapter: PrismaAdapter(prisma) } : {}),

  providers: hasGoogle
    ? [
        Google({
          clientId:     process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          authorization: {
            params: {
              access_type: 'offline',
              prompt:      'select_account',
            },
          },
        }),
      ]
    : [],

  callbacks: {
    // ── 1. signIn: upgrade role for the owner email ──────────────────────────
    async signIn({ user }) {
      if (hasDB && user?.email === process.env.ADMIN_EMAIL) {
        try {
          await prisma.user.update({
            where: { email: user.email },
            data:  { role: 'owner' },
          });
        } catch {
          // User row may not exist yet on the very first sign-in; the adapter
          // creates it after signIn returns true. Role corrected next sign-in.
        }
      }
      return true;
    },

    // ── 2. jwt: write id + role into the JWT (JWT-session mode only) ─────────
    // Runs on first sign-in and on every token refresh.
    // In database-session mode this callback is NOT called.
    async jwt({ token, user }) {
      if (user) {
        // 'user' is populated only on the initial sign-in request
        token.id = user.id;
        token.role =
          user.email === process.env.ADMIN_EMAIL
            ? 'owner'
            : (user.role ?? 'user');
      }
      return token;
    },

    // ── 3. session: expose id + role to client ───────────────────────────────
    // 'user' is populated  → database-session mode (adapter present)
    // 'token' is populated → JWT-session mode (no adapter)
    session({ session, user, token }) {
      if (user) {
        // Database session mode
        session.user.id   = user.id;
        session.user.role = (user.role as UserRole | undefined) ?? 'user';
        // Hard-enforce owner role for ADMIN_EMAIL regardless of DB state
        if (session.user.email === process.env.ADMIN_EMAIL) {
          session.user.role = 'owner';
        }
      } else if (token) {
        // JWT session mode
        session.user.id   = (token.id as string | undefined) ?? '';
        session.user.role = (token.role as UserRole | undefined) ?? 'user';
        // Same hard-enforcement
        if (session.user.email === process.env.ADMIN_EMAIL) {
          session.user.role = 'owner';
        }
      }
      return session;
    },
  },
});
