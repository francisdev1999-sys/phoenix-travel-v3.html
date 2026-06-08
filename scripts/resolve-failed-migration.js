/**
 * Clears any stuck failed Prisma migrations before `migrate deploy` runs.
 *
 * Prisma P3009 blocks all deploys when a migration is recorded as started
 * but never finished. This script marks those rows as rolled-back directly
 * via SQL so Prisma retries them cleanly.
 *
 * Called from the `start` script in package.json before migrate deploy.
 */

'use strict';

const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[resolve-migration] No DATABASE_URL — skipping.');
    return;
  }

  const client = new Client({ connectionString: url });

  try {
    await client.connect();

    // Find migrations that started but never finished (failed mid-run)
    const { rows } = await client.query(`
      SELECT migration_name
      FROM   "_prisma_migrations"
      WHERE  finished_at    IS NULL
        AND  rolled_back_at IS NULL
        AND  started_at     IS NOT NULL
    `);

    if (rows.length === 0) {
      console.log('[resolve-migration] No stuck migrations found.');
      return;
    }

    for (const row of rows) {
      await client.query(
        `UPDATE "_prisma_migrations"
         SET    rolled_back_at = NOW()
         WHERE  migration_name = $1`,
        [row.migration_name],
      );
      console.log(`[resolve-migration] Cleared stuck migration: ${row.migration_name}`);
    }
  } catch (err) {
    // _prisma_migrations table may not exist yet on a fresh DB — that's fine.
    console.log(`[resolve-migration] Skipped (${err.message})`);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
