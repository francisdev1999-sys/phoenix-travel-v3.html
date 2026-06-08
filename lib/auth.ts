import NextAuth, { DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/db';

// ── Role hierarchy ────────────────────────────────────────────────────────────
// owner > admin > reviewer > contributor > user
// Only 'owner' and 'admin' reach the admin panel.
// Role is assigned on sign-in: ADMIN_EMAIL → 'owner', everyone else → 'user'.
// Promote other users by directly editing the role column in the DB.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'reviewer' | 'contributor' | 'user';

const ADMIN_ROLES: UserRole[] = ['owner', 'admin'];

/** True if the session belongs to an admin-or-higher user. */
export function isAdminSession(
  session: { user?: { role?: string; email?: string | null } } | null,
): boolean {
  if (!session?.user) return false;
  if (session.user.role && ADMIN_ROLES.includes(session.user.role as UserRole)) return true;
  // Fallback for the very first request after sign-in before role propagates
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

// ── Provider and DB detection ─────────────────────────────────────────────────
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
    async signIn({ user }) {
      // Assign owner role to the admin email on every sign-in.
      // Runs once per login session — never on every request.
      if (hasDB && user?.email === process.env.ADMIN_EMAIL) {
        try {
          await prisma.user.update({
            where: { email: user.email },
            data:  { role: 'owner' },
          });
        } catch {
          // User record may not exist yet on the very first ever sign-in
          // (the adapter creates it *after* signIn returns true). The role
          // will be corrected on the second sign-in. No action needed.
        }
      }
      return true;
    },

    session({ session, user }) {
      if (user) {
        session.user.id   = user.id;
        session.user.role = (user.role as UserRole | undefined) ?? 'user';
        // Hard-enforce owner role for the admin email regardless of DB state
        if (session.user.email === process.env.ADMIN_EMAIL) {
          session.user.role = 'owner';
        }
      }
      return session;
    },
  },
});
