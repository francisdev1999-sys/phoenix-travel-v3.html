import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Database client setup.
 *
 * Two clients:
 *   prisma      — writes + transactions → primary DB
 *   prismaRead  — reads → read replica (falls back to primary when
 *                 DATABASE_READ_URL is not set)
 *
 * Connection pooling:
 *   Set DATABASE_URL to a PgBouncer/Prisma Accelerate pooled URL.
 *   Set DATABASE_DIRECT_URL for migrations (bypasses the pool).
 *   In development, both point to the same URL.
 */

const globalForPrisma = globalThis as unknown as {
  prisma:     PrismaClient;
  prismaRead: PrismaClient;
};

function createClient(connectionString: string | undefined): PrismaClient {
  // Always pass the adapter — PrismaPg with an empty/missing URL won't
  // open a connection until the first query, so the build succeeds even
  // when DATABASE_URL is unset. Queries will fail at runtime and must be
  // caught by callers (all DB routes degrade gracefully via try/catch).
  const adapter = new PrismaPg({ connectionString: connectionString ?? '' });
  return new PrismaClient({ adapter });
}

// Write client — always uses the primary DATABASE_URL
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createClient(process.env.DATABASE_URL);

// Read client — uses DATABASE_READ_URL if set, otherwise primary
export const prismaRead: PrismaClient =
  globalForPrisma.prismaRead ??
  createClient(process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma     = prisma;
  globalForPrisma.prismaRead = prismaRead;
}
