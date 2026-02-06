import { pathToFileURL } from 'node:url';

import { eq, sql } from 'drizzle-orm';

import { SEED_TENANT_IDS, SEED_TENANTS } from '@the-dmz/shared/testing';

import { closeDatabase, getDatabaseClient } from './connection.js';
import { tenants } from './schema/index.js';

export { SEED_TENANT_IDS, SEED_TENANTS };

/**
 * Seed the database with deterministic tenant data.
 *
 * Idempotent: uses `ON CONFLICT (slug) DO UPDATE` so running the seed
 * multiple times always converges to the canonical seed state.
 *
 * User seeding is deferred until the `users` table lands (issue #18).
 */
export const seedDatabase = async (): Promise<void> => {
  const db = getDatabaseClient();

  for (const tenant of SEED_TENANTS) {
    await db
      .insert(tenants)
      .values({
        tenantId: tenant.tenantId,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        settings: tenant.settings,
      })
      .onConflictDoUpdate({
        target: [tenants.slug],
        set: {
          name: sql`excluded.name`,
          status: sql`excluded.status`,
          settings: sql`excluded.settings`,
          updatedAt: sql`now()`,
        },
      });
  }

  // Verify the system tenant exists
  const result = await db
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(eq(tenants.slug, 'system'))
    .limit(1);

  if (result.length === 0) {
    throw new Error('System tenant seeding failed');
  }

  console.warn(`Seeded ${SEED_TENANTS.length} tenants successfully.`);
};

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  seedDatabase()
    .then(() => closeDatabase())
    .catch((error) => {
      console.error('Database seed failed', error);
      process.exit(1);
    });
}
