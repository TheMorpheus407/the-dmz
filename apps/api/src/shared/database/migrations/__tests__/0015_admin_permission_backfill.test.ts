import { randomUUID } from 'crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import postgres from 'postgres';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ADMIN_DATABASE_URL } from '@the-dmz/shared/testing';

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = resolve(migrationsDir, '0016_admin_permission_backfill.sql');
const migrationSql = readFileSync(migrationPath, 'utf8');

const readMigrationStatements = (fileName: string): string[] =>
  readFileSync(resolve(migrationsDir, fileName), 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

const runMigrationFile = async (sql: postgres.Sql, fileName: string): Promise<void> => {
  for (const statement of readMigrationStatements(fileName)) {
    await sql.unsafe(statement);
  }
};

function quotePostgresIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

describe('0015_admin_permission_backfill migration', () => {
  let databaseName: string;
  let adminPool: postgres.Sql | undefined;
  let databasePool: postgres.Sql | undefined;

  beforeEach(async () => {
    databaseName = `dmz_t_m0015_${randomUUID().replace(/-/g, '_')}`;
    adminPool = postgres(ADMIN_DATABASE_URL, { max: 1 });
    const quotedDbName = quotePostgresIdentifier(databaseName);
    await adminPool.unsafe(`DROP DATABASE IF EXISTS ${quotedDbName}`);
    await adminPool.unsafe(`CREATE DATABASE ${quotedDbName}`);
    databasePool = postgres(`postgresql://dmz:dmz_dev@localhost:5432/${databaseName}`, { max: 1 });
  });

  afterEach(async () => {
    if (databasePool) {
      await databasePool.end({ timeout: 5 });
    }

    if (adminPool) {
      await adminPool.unsafe(
        `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()
      `,
        [databaseName],
      );
      await adminPool.unsafe(`DROP DATABASE IF EXISTS ${quotePostgresIdentifier(databaseName)}`);
      await adminPool.end({ timeout: 5 });
    }
  });

  it('seeds admin read/write permissions and grants them to existing tenant admin roles', async () => {
    if (!databasePool) {
      throw new Error('Database pool not initialized');
    }

    await runMigrationFile(databasePool, '0000_rich_fantastic_four.sql');
    await runMigrationFile(databasePool, '0001_initial_schema.sql');
    await runMigrationFile(databasePool, '0002_uuid_v7.sql');

    const tenantId = randomUUID();
    const userId = randomUUID();

    await databasePool.unsafe(
      `
        INSERT INTO "tenants" ("tenant_id", "name", "slug", "status")
        VALUES ('${tenantId}', 'Upgraded Tenant', 'upgraded-${tenantId.slice(0, 8)}', 'active');

        INSERT INTO "users" ("user_id", "tenant_id", "email", "display_name", "role", "is_active")
        VALUES (
          '${userId}',
          '${tenantId}',
          'operator@archive.test',
          'Upgrade Operator',
          'super_admin',
          true
        );
      `,
    );

    await runMigrationFile(databasePool, '0002_auth_rbac_sessions.sql');

    const beforeBackfill = await databasePool<Array<{ resource: string; action: string }>>`
      SELECT p.resource, p.action
      FROM auth.role_permissions rp
      JOIN auth.roles r ON r.id = rp.role_id
      JOIN auth.permissions p ON p.id = rp.permission_id
      WHERE r.tenant_id = ${tenantId}::uuid
        AND r.name = 'admin'
        AND p.resource = 'admin'
      ORDER BY p.action
    `;

    expect(beforeBackfill).toEqual([]);

    const userRoleAssignments = await databasePool<Array<{ name: string }>>`
      SELECT r.name
      FROM auth.user_roles ur
      JOIN auth.roles r
        ON r.id = ur.role_id
       AND r.tenant_id = ur.tenant_id
      WHERE ur.tenant_id = ${tenantId}::uuid
        AND ur.user_id = ${userId}::uuid
    `;

    expect(userRoleAssignments).toEqual([{ name: 'admin' }]);

    await runMigrationFile(databasePool, '0016_admin_permission_backfill.sql');

    const adminPermissions = await databasePool<Array<{ resource: string; action: string }>>`
      SELECT resource, action
      FROM auth.permissions
      WHERE resource = 'admin'
      ORDER BY action
    `;

    expect(adminPermissions).toEqual([
      { resource: 'admin', action: 'read' },
      { resource: 'admin', action: 'write' },
    ]);

    const afterBackfill = await databasePool<Array<{ resource: string; action: string }>>`
      SELECT p.resource, p.action
      FROM auth.role_permissions rp
      JOIN auth.roles r ON r.id = rp.role_id
      JOIN auth.permissions p ON p.id = rp.permission_id
      WHERE r.tenant_id = ${tenantId}::uuid
        AND r.name = 'admin'
        AND p.resource = 'admin'
      ORDER BY p.action
    `;

    expect(afterBackfill).toEqual([
      { resource: 'admin', action: 'read' },
      { resource: 'admin', action: 'write' },
    ]);
  });

  it('uses tenant context and idempotent inserts for safe upgrades', () => {
    expect(migrationSql).toContain("PERFORM set_config('app.current_tenant_id'");
    expect(migrationSql).toContain("PERFORM set_config('app.tenant_id'");
    expect(migrationSql).toContain("('admin', 'read'");
    expect(migrationSql).toContain("('admin', 'write'");
    expect(migrationSql).toContain('AND "roles"."name" = \'admin\'');
    expect(migrationSql).toContain('ON CONFLICT ("resource", "action") DO UPDATE');
    expect(migrationSql).toContain('ON CONFLICT DO NOTHING;');
  });
});
