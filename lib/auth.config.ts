import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth config — no Prisma, no Node.js-only APIs.
 * Used by middleware.ts to verify JWTs without hitting the database.
 * lib/auth.ts imports this and extends it with the Prisma adapter + providers.
 */
export const authConfig = {
  providers: [],
  session:   { strategy: 'jwt' as const },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { role?: string }).role ?? 'user';
        if (user.email === process.env.ADMIN_EMAIL) token.role = 'owner';
      }
      return token;
    },
    session({ session, token }) {
      session.user.id    = (token.id as string | undefined) ?? '';
      session.user.role  = ((token.role as string | undefined) ?? 'user') as never;
      if (session.user.email === process.env.ADMIN_EMAIL) {
        session.user.role = 'owner' as never;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
