import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '0002_auth_rbac_sessions.sql',
);
const migrationSql = readFileSync(migrationPath, 'utf8');

describe('0002_auth_rbac_sessions migration', () => {
  it('creates auth schema and all required auth tables', () => {
    expect(migrationSql).toContain('CREATE SCHEMA IF NOT EXISTS "auth"');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "auth"."sessions"');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "auth"."roles"');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "auth"."permissions"');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "auth"."role_permissions"');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "auth"."user_roles"');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "auth"."sso_connections"');
  });

  it('enables and forces row-level security for tenant-scoped auth tables', () => {
    expect(migrationSql).toContain('ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE "auth"."sessions" FORCE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE "auth"."roles" ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE "auth"."roles" FORCE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain(
      'ALTER TABLE "auth"."role_permissions" ENABLE ROW LEVEL SECURITY;',
    );
    expect(migrationSql).toContain(
      'ALTER TABLE "auth"."role_permissions" FORCE ROW LEVEL SECURITY;',
    );
    expect(migrationSql).toContain('ALTER TABLE "auth"."user_roles" ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE "auth"."user_roles" FORCE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain(
      'ALTER TABLE "auth"."sso_connections" ENABLE ROW LEVEL SECURITY;',
    );
    expect(migrationSql).toContain(
      'ALTER TABLE "auth"."sso_connections" FORCE ROW LEVEL SECURITY;',
    );
    expect(migrationSql).toContain('CREATE POLICY "tenant_isolation_sessions"');
    expect(migrationSql).toContain('CREATE POLICY "tenant_isolation_roles"');
    expect(migrationSql).toContain('CREATE POLICY "tenant_isolation_role_permissions"');
    expect(migrationSql).toContain('CREATE POLICY "tenant_isolation_user_roles"');
    expect(migrationSql).toContain('CREATE POLICY "tenant_isolation_sso_connections"');
  });

  it('supports both tenant context variables for RLS compatibility', () => {
    expect(migrationSql).toContain("current_setting('app.current_tenant_id', true)");
    expect(migrationSql).toContain("current_setting('app.tenant_id', true)");
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION "auth"."current_tenant_id"()');
  });

  it('enforces tenant-scoped referential integrity for sessions and role assignments', () => {
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_user_id_unique" ON "public"."users"',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "auth_roles_tenant_id_id_unique" ON "auth"."roles"',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "sessions_tenant_id_user_id_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","user_id")',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "user_roles_tenant_id_user_id_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","user_id")',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "user_roles_tenant_id_role_id_roles_tenant_id_id_fk" FOREIGN KEY ("tenant_id","role_id") REFERENCES "auth"."roles"("tenant_id","id")',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "user_roles_tenant_id_assigned_by_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","assigned_by") REFERENCES "public"."users"("tenant_id","user_id")',
    );
  });

  it('maintains updated_at triggers for auth tables that include updated_at columns', () => {
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.set_updated_at()');
    expect(migrationSql).toContain('CREATE TRIGGER "trg_auth_roles_updated_at"');
    expect(migrationSql).toContain('CREATE TRIGGER "trg_auth_sso_connections_updated_at"');
  });

  it('seeds default permissions, roles, role mappings, and user role assignments idempotently', () => {
    expect(migrationSql).toContain('INSERT INTO "auth"."permissions"');
    expect(migrationSql).toContain('ON CONFLICT ("resource", "action") DO UPDATE');

    expect(migrationSql).toContain("('admin', 'Full tenant administration')");
    expect(migrationSql).toContain("('manager', 'Team and reporting management')");
    expect(migrationSql).toContain("('learner', 'Standard learner access')");
    expect(migrationSql).toContain('ON CONFLICT ("tenant_id", "name") DO UPDATE');

    expect(migrationSql).toContain('INSERT INTO "auth"."role_permissions"');
    expect(migrationSql).toContain("PERFORM set_config('app.current_tenant_id'");
    expect(migrationSql).toContain("PERFORM set_config('app.tenant_id'");
    expect(migrationSql).toContain('AND "roles"."name" = \'admin\'');
    expect(migrationSql).toContain('AND "roles"."name" = \'manager\'');
    expect(migrationSql).toContain('ON CONFLICT DO NOTHING;');

    expect(migrationSql).toContain(
      'INSERT INTO "auth"."user_roles" ("tenant_id", "user_id", "role_id")',
    );
    expect(migrationSql).toContain(
      "WHEN \"users\".\"role\" IN ('super_admin', 'tenant_admin', 'admin') THEN 'admin'",
    );
    expect(migrationSql).toContain('ON CONFLICT ("tenant_id", "user_id", "role_id") DO NOTHING;');
  });

  it('enforces FORCE RLS only after tenant-scoped seed writes are completed', () => {
    const tenantSeedBlockIndex = migrationSql.indexOf(
      'FOR tenant_row IN SELECT "tenant_id" FROM "public"."tenants" LOOP',
    );
    const firstForceRlsIndex = migrationSql.indexOf(
      'ALTER TABLE "auth"."sessions" FORCE ROW LEVEL SECURITY;',
    );

    expect(tenantSeedBlockIndex).toBeGreaterThan(-1);
    expect(firstForceRlsIndex).toBeGreaterThan(tenantSeedBlockIndex);
  });
});
