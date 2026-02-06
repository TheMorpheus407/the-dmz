import postgres from 'postgres';

import { E2E_TENANT_SLUG, E2E_TEST_USER_EMAIL, resolveDatabaseUrl } from './db-seed';

const DATABASE_POOL_MAX = 1;
const DATABASE_POOL_TIMEOUT_SECONDS = 5;

const tableExists = async (
  sql: ReturnType<typeof postgres>,
  tableName: string,
): Promise<boolean> => {
  const table = await sql<{ relation: string | null }[]>`
    select to_regclass(${`public.${tableName}`}) as relation
  `;

  return table.length > 0 && table[0].relation !== null;
};

export const cleanupTestData = async (
  databaseUrl: string = resolveDatabaseUrl(),
): Promise<void> => {
  const sql = postgres(databaseUrl, {
    max: DATABASE_POOL_MAX,
    idle_timeout: DATABASE_POOL_TIMEOUT_SECONDS,
    connect_timeout: DATABASE_POOL_TIMEOUT_SECONDS,
  });

  try {
    if (await tableExists(sql, 'e2e_test_users')) {
      await sql`
        delete from e2e_test_users
        where email = ${E2E_TEST_USER_EMAIL}
      `;
    }

    await sql`
      delete from tenants
      where slug = ${E2E_TENANT_SLUG}
    `;
  } finally {
    await sql.end({ timeout: DATABASE_POOL_TIMEOUT_SECONDS });
  }
};
