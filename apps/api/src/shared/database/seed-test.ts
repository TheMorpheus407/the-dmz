/**
 * Entry point for seeding the **test** database.
 *
 * Resolves the test database URL from environment variables:
 *   1. DATABASE_TEST_URL  (matches .env.example convention)
 *   2. TEST_DATABASE_URL  (matches issue #17 text)
 *   3. Falls back to the default test connection string
 *
 * Safety: refuses to run unless the resolved URL points to a database
 * whose name contains "test".
 */
import { closeDatabase } from './connection.js';
import { seedDatabase } from './seed.js';

const DEFAULT_TEST_DATABASE_URL = 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test';

const resolveTestDatabaseUrl = (): string => {
  return (
    process.env['DATABASE_TEST_URL'] ??
    process.env['TEST_DATABASE_URL'] ??
    DEFAULT_TEST_DATABASE_URL
  );
};

const assertTestDatabaseUrl = (url: string): void => {
  const dbName = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';

  if (!dbName.includes('test')) {
    throw new Error(
      `Refusing to seed non-test database "${dbName}". ` +
        'The database name must contain "test". ' +
        'Set DATABASE_TEST_URL or TEST_DATABASE_URL to a test database.',
    );
  }
};

const run = async (): Promise<void> => {
  const testUrl = resolveTestDatabaseUrl();
  assertTestDatabaseUrl(testUrl);

  // Override DATABASE_URL so that connection.ts picks up the test database.
  process.env['DATABASE_URL'] = testUrl;

  console.warn(`Seeding test database: ${new URL(testUrl).pathname.split('/').pop()}`);

  await seedDatabase();
  await closeDatabase();
};

run().catch((error) => {
  console.error('Test database seed failed', error);
  process.exit(1);
});
