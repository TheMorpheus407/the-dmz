import { pathToFileURL } from 'node:url';

import { eq, sql } from 'drizzle-orm';

import { SEED_TENANT_IDS, SEED_TENANTS, SEED_USERS } from '@the-dmz/shared/testing';

import { closeDatabase, getDatabaseClient } from './connection.js';
import { tenants, users } from './schema/index.js';

export { SEED_TENANT_IDS, SEED_TENANTS, SEED_USERS };

/**
 * Seed the database with deterministic tenant and user data.
 *
 * Idempotent: uses `ON CONFLICT ... DO UPDATE` so running the seed
 * multiple times always converges to the canonical seed state.
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
  const tenantResult = await db
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(eq(tenants.slug, 'system'))
    .limit(1);

  if (tenantResult.length === 0) {
    throw new Error('System tenant seeding failed');
  }

  for (const user of SEED_USERS) {
    await db
      .insert(users)
      .values({
        userId: user.userId,
        tenantId: user.tenantId,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
      })
      .onConflictDoUpdate({
        target: [users.userId],
        set: {
          email: sql`excluded.email`,
          displayName: sql`excluded.display_name`,
          role: sql`excluded.role`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      });
  }

  console.warn(
    `Seeded ${SEED_TENANTS.length} tenants and ${SEED_USERS.length} users successfully.`,
  );
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
