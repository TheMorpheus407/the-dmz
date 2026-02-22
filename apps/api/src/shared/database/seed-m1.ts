/**
 * Entry point for seeding the M1 foundation dataset.
 *
 * This command seeds:
 * - Tenants (system, acmeCorp, consumerPlatform, inactiveCo)
 * - Users (admin, manager, learner roles per tenant)
 * - User profiles (locale, timezone, accessibility, notification settings)
 * - Roles and permissions
 *
 * Safety:
 * - Requires explicit ALLOW_SEEDING environment variable for non-test environments
 * - Refuses to run against production databases
 * - Idempotent: safe to run multiple times
 */
import { closeDatabase } from './connection.js';
import { seedDatabase } from './seed.js';

const ALLOWED_ENVIRONMENTS = ['development', 'test', 'local'] as const;
type AllowedEnvironment = (typeof ALLOWED_ENVIRONMENTS)[number];

const isAllowedEnvironment = (env: string): env is AllowedEnvironment => {
  return ALLOWED_ENVIRONMENTS.includes(env as AllowedEnvironment);
};

const getEnvironment = (): string => {
  return process.env['NODE_ENV'] ?? process.env['APP_ENV'] ?? 'development';
};

const isTestDatabase = (databaseUrl: string): boolean => {
  try {
    const dbName = new URL(databaseUrl).pathname.split('/').pop()?.toLowerCase() ?? '';
    return dbName.includes('test');
  } catch {
    return false;
  }
};

const getDatabaseUrl = (): string => {
  return process.env['DATABASE_URL'] ?? '';
};

const assertCanSeed = (): void => {
  const env = getEnvironment();
  const databaseUrl = getDatabaseUrl();

  if (isTestDatabase(databaseUrl)) {
    return;
  }

  if (!isAllowedEnvironment(env)) {
    throw new Error(
      `Refusing to seed in "${env}" environment. ` +
        `Seeding is only allowed in: ${ALLOWED_ENVIRONMENTS.join(', ')}. ` +
        'Set NODE_ENV or APP_ENV to one of these values, or set ALLOW_SEEDING=1 to override.',
    );
  }

  const allowSeeding = process.env['ALLOW_SEEDING'];

  if (allowSeeding !== '1' && allowSeeding !== 'true') {
    throw new Error(
      'Seeding is not explicitly allowed. ' +
        'Set ALLOW_SEEDING=1 to enable seeding in this environment.',
    );
  }
};

const run = async (): Promise<void> => {
  console.warn('=== M1 Foundation Seed ===');
  console.warn(`Environment: ${getEnvironment()}`);
  console.warn(
    `Database: ${getDatabaseUrl() ? new URL(getDatabaseUrl()).pathname.split('/').pop() : 'not set'}`,
  );

  assertCanSeed();

  console.warn('Starting seed...');
  await seedDatabase();
  console.warn('Seed completed successfully.');
  await closeDatabase();
};

run().catch((error) => {
  console.error('M1 seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
