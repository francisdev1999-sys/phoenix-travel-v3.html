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
  if (!connectionString) {
    // Defer construction: the Proxy throws only on first property access,
    // so module evaluation succeeds during build without DATABASE_URL.
    // All DB routes have try/catch and degrade gracefully at runtime.
    return new Proxy({} as PrismaClient, {
      get(_t, prop) {
        if (prop === 'then') return undefined; // not a Promise
        throw new Error('[nexus] DATABASE_URL is not set — DB unavailable');
      },
    });
  }
  const adapter = new PrismaPg({ connectionString });
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
