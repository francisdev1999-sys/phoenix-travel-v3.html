import NextAuth, { DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GitHub from 'next-auth/providers/github';
import { prisma } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

const hasDB     = !!process.env.DATABASE_URL;
const hasGitHub = !!(process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_CLIENT_ID ?? process.env.GITHUB_ID);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? 'nexus-dev-secret-set-AUTH_SECRET-in-production',
  ...(hasDB ? { adapter: PrismaAdapter(prisma) } : {}),
  providers: hasGitHub
    ? [
        GitHub({
          clientId:     process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_CLIENT_ID ?? process.env.GITHUB_ID ?? '',
          clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_CLIENT_SECRET ?? process.env.GITHUB_SECRET ?? '',
        }),
      ]
    : [],
  callbacks: {
    session({ session, user }) {
      if (user) session.user.id = user.id;
      return session;
    },
  },
});
