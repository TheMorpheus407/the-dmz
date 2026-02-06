import postgres from 'postgres';

const DEFAULT_DATABASE_TEST_URL = 'postgresql://dmz:dmz_dev@127.0.0.1:5432/dmz_test';
const EXPECTED_TEST_DATABASE_NAME = 'dmz_test';
const DATABASE_POOL_MAX = 1;
const DATABASE_POOL_TIMEOUT_SECONDS = 5;

export const E2E_TENANT_NAME = 'E2E Tenant';
export const E2E_TENANT_SLUG = 'e2e';
export const E2E_TEST_USER_EMAIL = 'operator@dmz.test';
export const E2E_TEST_USER_PASSWORD = 'dmz-e2e-password';

export type E2ESeedResult = {
  tenantSlug: string;
  testUserEmail: string;
};

const parseDatabaseName = (databaseUrl: string): string => {
  const pathnameSegments = new URL(databaseUrl).pathname.split('/').filter(Boolean);
  return decodeURIComponent(pathnameSegments[pathnameSegments.length - 1] ?? '').toLowerCase();
};

const assertTestDatabase = (databaseUrl: string): void => {
  const databaseName = parseDatabaseName(databaseUrl);

  if (databaseName !== EXPECTED_TEST_DATABASE_NAME) {
    throw new Error(
      [
        `Refusing to run E2E setup against "${databaseName || 'unknown'}".`,
        `E2E must use "${EXPECTED_TEST_DATABASE_NAME}".`,
        'Set DATABASE_TEST_URL to the dedicated test database.',
      ].join(' '),
    );
  }
};

const ensureE2ETestUsersTable = async (sql: ReturnType<typeof postgres>): Promise<void> => {
  await sql`
    create table if not exists e2e_test_users (
      user_id uuid primary key default gen_random_uuid() not null,
      tenant_slug varchar(63) not null references tenants(slug) on delete cascade,
      email varchar(255) not null unique,
      password varchar(255) not null,
      created_at timestamp with time zone default now() not null,
      updated_at timestamp with time zone default now() not null
    )
  `;
};

export const resolveDatabaseUrl = (env: NodeJS.ProcessEnv = process.env): string => {
  const databaseUrl = env.DATABASE_TEST_URL ?? env.DATABASE_URL ?? DEFAULT_DATABASE_TEST_URL;
  assertTestDatabase(databaseUrl);

  return databaseUrl;
};

export const seedTestDatabase = async (
  databaseUrl: string = resolveDatabaseUrl(),
): Promise<E2ESeedResult> => {
  const sql = postgres(databaseUrl, {
    max: DATABASE_POOL_MAX,
    idle_timeout: DATABASE_POOL_TIMEOUT_SECONDS,
    connect_timeout: DATABASE_POOL_TIMEOUT_SECONDS,
  });

  const seedSettings = {
    testUser: {
      email: E2E_TEST_USER_EMAIL,
      password: E2E_TEST_USER_PASSWORD,
    },
  };

  try {
    assertTestDatabase(databaseUrl);

    await sql`
      insert into tenants (name, slug, status, settings)
      values (${E2E_TENANT_NAME}, ${E2E_TENANT_SLUG}, 'active', ${sql.json(seedSettings)})
      on conflict (slug) do update set
        name = excluded.name,
        status = excluded.status,
        settings = excluded.settings
    `;

    await ensureE2ETestUsersTable(sql);

    await sql`
      insert into e2e_test_users (tenant_slug, email, password)
      values (${E2E_TENANT_SLUG}, ${E2E_TEST_USER_EMAIL}, ${E2E_TEST_USER_PASSWORD})
      on conflict (email) do update set
        tenant_slug = excluded.tenant_slug,
        password = excluded.password,
        updated_at = now()
    `;

    const seededUsers = await sql<{ email: string }[]>`
      select email
      from e2e_test_users
      where tenant_slug = ${E2E_TENANT_SLUG}
        and email = ${E2E_TEST_USER_EMAIL}
      limit 1
    `;

    if (seededUsers.length === 0) {
      throw new Error('E2E test user seeding verification failed.');
    }

    return {
      tenantSlug: E2E_TENANT_SLUG,
      testUserEmail: E2E_TEST_USER_EMAIL,
    };
  } finally {
    await sql.end({ timeout: DATABASE_POOL_TIMEOUT_SECONDS });
  }
};
