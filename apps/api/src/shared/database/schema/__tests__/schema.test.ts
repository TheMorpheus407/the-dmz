import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { tenants, users } from '../index.js';

describe('tenants schema', () => {
  it('has the correct table name', () => {
    expect(getTableName(tenants)).toBe('tenants');
  });

  it('has all required columns', () => {
    const config = getTableConfig(tenants);
    const columnNames = config.columns.map((c) => c.name);

    expect(columnNames).toContain('tenant_id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('slug');
    expect(columnNames).toContain('domain');
    expect(columnNames).toContain('plan_id');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('settings');
    expect(columnNames).toContain('data_region');
    expect(columnNames).toContain('is_active');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');
  });

  it('has tenant_id as primary key', () => {
    const config = getTableConfig(tenants);
    const tenantIdCol = config.columns.find((c) => c.name === 'tenant_id');

    expect(tenantIdCol).toBeDefined();
    expect(tenantIdCol!.primary).toBe(true);
  });

  it('has a unique constraint on slug', () => {
    const config = getTableConfig(tenants);
    const slugCol = config.columns.find((c) => c.name === 'slug');

    expect(slugCol).toBeDefined();
    expect(slugCol!.isUnique).toBe(true);
  });

  it('has correct default values', () => {
    const config = getTableConfig(tenants);
    const planIdCol = config.columns.find((c) => c.name === 'plan_id');
    const dataRegionCol = config.columns.find((c) => c.name === 'data_region');
    const isActiveCol = config.columns.find((c) => c.name === 'is_active');
    const statusCol = config.columns.find((c) => c.name === 'status');

    expect(planIdCol!.hasDefault).toBe(true);
    expect(dataRegionCol!.hasDefault).toBe(true);
    expect(isActiveCol!.hasDefault).toBe(true);
    expect(statusCol!.hasDefault).toBe(true);
  });

  it('marks domain as nullable', () => {
    const config = getTableConfig(tenants);
    const domainCol = config.columns.find((c) => c.name === 'domain');

    expect(domainCol).toBeDefined();
    expect(domainCol!.notNull).toBe(false);
  });
});

describe('users schema', () => {
  it('has the correct table name', () => {
    expect(getTableName(users)).toBe('users');
  });

  it('has all required columns', () => {
    const config = getTableConfig(users);
    const columnNames = config.columns.map((c) => c.name);

    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('tenant_id');
    expect(columnNames).toContain('email');
    expect(columnNames).toContain('display_name');
    expect(columnNames).toContain('role');
    expect(columnNames).toContain('is_active');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');
  });

  it('has user_id as primary key', () => {
    const config = getTableConfig(users);
    const userIdCol = config.columns.find((c) => c.name === 'user_id');

    expect(userIdCol).toBeDefined();
    expect(userIdCol!.primary).toBe(true);
  });

  it('has tenant_id as not null', () => {
    const config = getTableConfig(users);
    const tenantIdCol = config.columns.find((c) => c.name === 'tenant_id');

    expect(tenantIdCol).toBeDefined();
    expect(tenantIdCol!.notNull).toBe(true);
  });

  it('has a foreign key on tenant_id', () => {
    const config = getTableConfig(users);

    expect(config.foreignKeys.length).toBe(1);
    expect(config.foreignKeys[0]!.reference().foreignTable).toBe(tenants);
  });

  it('has composite unique index on (tenant_id, email)', () => {
    const config = getTableConfig(users);
    const uniqueIdx = config.indexes.find((i) => i.config.name === 'users_tenant_email_unique');

    expect(uniqueIdx).toBeDefined();
    expect(uniqueIdx!.config.unique).toBe(true);
  });

  it('has an index on tenant_id', () => {
    const config = getTableConfig(users);
    const idx = config.indexes.find((i) => i.config.name === 'users_tenant_id_idx');

    expect(idx).toBeDefined();
  });

  it('has correct default values', () => {
    const config = getTableConfig(users);
    const roleCol = config.columns.find((c) => c.name === 'role');
    const isActiveCol = config.columns.find((c) => c.name === 'is_active');

    expect(roleCol!.hasDefault).toBe(true);
    expect(isActiveCol!.hasDefault).toBe(true);
  });

  it('marks display_name as nullable', () => {
    const config = getTableConfig(users);
    const displayNameCol = config.columns.find((c) => c.name === 'display_name');

    expect(displayNameCol).toBeDefined();
    expect(displayNameCol!.notNull).toBe(false);
  });
});
