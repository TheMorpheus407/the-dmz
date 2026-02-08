import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import {
  permissions,
  rolePermissions,
  roles,
  sessions,
  ssoConnections,
  tenants,
  userRoles,
  users,
} from '../index.js';

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
    const tenantUserIdUniqueIdx = config.indexes.find(
      (i) => i.config.name === 'users_tenant_user_id_unique',
    );

    expect(uniqueIdx).toBeDefined();
    expect(uniqueIdx!.config.unique).toBe(true);
    expect(tenantUserIdUniqueIdx).toBeDefined();
    expect(tenantUserIdUniqueIdx!.config.unique).toBe(true);
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

describe('auth.permissions schema', () => {
  it('has the correct table name and schema', () => {
    const config = getTableConfig(permissions);

    expect(getTableName(permissions)).toBe('permissions');
    expect(config.schema).toBe('auth');
  });

  it('has all required columns', () => {
    const config = getTableConfig(permissions);
    const columnNames = config.columns.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('resource');
    expect(columnNames).toContain('action');
    expect(columnNames).toContain('description');
    expect(columnNames).toContain('created_at');
  });

  it('has unique index on (resource, action)', () => {
    const config = getTableConfig(permissions);
    const idx = config.indexes.find(
      (i) => i.config.name === 'auth_permissions_resource_action_unique',
    );

    expect(idx).toBeDefined();
    expect(idx!.config.unique).toBe(true);
  });
});

describe('auth.roles schema', () => {
  it('has the correct table name and schema', () => {
    const config = getTableConfig(roles);

    expect(getTableName(roles)).toBe('roles');
    expect(config.schema).toBe('auth');
  });

  it('has all required columns', () => {
    const config = getTableConfig(roles);
    const columnNames = config.columns.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('tenant_id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('description');
    expect(columnNames).toContain('is_system');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');
  });

  it('has tenant foreign key and unique index on (tenant_id, name)', () => {
    const config = getTableConfig(roles);
    const uniqueIdx = config.indexes.find((i) => i.config.name === 'auth_roles_tenant_name_unique');
    const tenantIdIdUniqueIdx = config.indexes.find(
      (i) => i.config.name === 'auth_roles_tenant_id_id_unique',
    );

    expect(config.foreignKeys.length).toBe(1);
    expect(config.foreignKeys[0]!.reference().foreignTable).toBe(tenants);
    expect(uniqueIdx).toBeDefined();
    expect(uniqueIdx!.config.unique).toBe(true);
    expect(tenantIdIdUniqueIdx).toBeDefined();
    expect(tenantIdIdUniqueIdx!.config.unique).toBe(true);
  });
});

describe('auth.sessions schema', () => {
  it('has the correct table name and schema', () => {
    const config = getTableConfig(sessions);

    expect(getTableName(sessions)).toBe('sessions');
    expect(config.schema).toBe('auth');
  });

  it('has all required columns', () => {
    const config = getTableConfig(sessions);
    const columnNames = config.columns.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('tenant_id');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('token_hash');
    expect(columnNames).toContain('ip_address');
    expect(columnNames).toContain('user_agent');
    expect(columnNames).toContain('expires_at');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('last_active_at');
  });

  it('has expected indexes and foreign keys', () => {
    const config = getTableConfig(sessions);
    const tokenHashUnique = config.indexes.find(
      (i) => i.config.name === 'auth_sessions_token_hash_unique',
    );
    const userExpiresIdx = config.indexes.find(
      (i) => i.config.name === 'auth_sessions_user_expires_at_idx',
    );

    const foreignKeyNames = config.foreignKeys.map((fk) => fk.getName());

    expect(config.foreignKeys.length).toBe(2);
    expect(foreignKeyNames).toContain('sessions_tenant_id_tenants_tenant_id_fk');
    expect(foreignKeyNames).toContain('sessions_tenant_id_user_id_users_tenant_id_user_id_fk');
    expect(tokenHashUnique).toBeDefined();
    expect(tokenHashUnique!.config.unique).toBe(true);
    expect(userExpiresIdx).toBeDefined();
  });
});

describe('auth.role_permissions schema', () => {
  it('has the correct table name and schema', () => {
    const config = getTableConfig(rolePermissions);

    expect(getTableName(rolePermissions)).toBe('role_permissions');
    expect(config.schema).toBe('auth');
  });

  it('has composite primary key and cascading foreign keys', () => {
    const config = getTableConfig(rolePermissions);

    expect(config.primaryKeys.length).toBe(1);
    expect(config.primaryKeys[0]!.getName()).toBe('auth_role_permissions_role_id_permission_id_pk');
    expect(config.foreignKeys.length).toBe(2);
    expect(config.foreignKeys[0]!.onDelete).toBe('cascade');
    expect(config.foreignKeys[1]!.onDelete).toBe('cascade');
  });
});

describe('auth.user_roles schema', () => {
  it('has the correct table name and schema', () => {
    const config = getTableConfig(userRoles);

    expect(getTableName(userRoles)).toBe('user_roles');
    expect(config.schema).toBe('auth');
  });

  it('has all required columns', () => {
    const config = getTableConfig(userRoles);
    const columnNames = config.columns.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('tenant_id');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('role_id');
    expect(columnNames).toContain('assigned_by');
    expect(columnNames).toContain('assigned_at');
    expect(columnNames).toContain('expires_at');
    expect(columnNames).toContain('scope');
  });

  it('has unique/index constraints and foreign keys', () => {
    const config = getTableConfig(userRoles);
    const tenantUserRoleUnique = config.indexes.find(
      (i) => i.config.name === 'auth_user_roles_tenant_user_role_unique',
    );
    const tenantUserIdx = config.indexes.find(
      (i) => i.config.name === 'auth_user_roles_tenant_user_idx',
    );

    const foreignKeyNames = config.foreignKeys.map((fk) => fk.getName());

    expect(config.foreignKeys.length).toBe(4);
    expect(foreignKeyNames).toContain('user_roles_tenant_id_tenants_tenant_id_fk');
    expect(foreignKeyNames).toContain('user_roles_tenant_id_user_id_users_tenant_id_user_id_fk');
    expect(foreignKeyNames).toContain('user_roles_tenant_id_role_id_roles_tenant_id_id_fk');
    expect(foreignKeyNames).toContain(
      'user_roles_tenant_id_assigned_by_users_tenant_id_user_id_fk',
    );
    expect(tenantUserRoleUnique).toBeDefined();
    expect(tenantUserRoleUnique!.config.unique).toBe(true);
    expect(tenantUserIdx).toBeDefined();
  });
});

describe('auth.sso_connections schema', () => {
  it('has the correct table name and schema', () => {
    const config = getTableConfig(ssoConnections);

    expect(getTableName(ssoConnections)).toBe('sso_connections');
    expect(config.schema).toBe('auth');
  });

  it('has all required columns', () => {
    const config = getTableConfig(ssoConnections);
    const columnNames = config.columns.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('tenant_id');
    expect(columnNames).toContain('provider');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('metadata_url');
    expect(columnNames).toContain('client_id');
    expect(columnNames).toContain('client_secret_encrypted');
    expect(columnNames).toContain('is_active');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');
  });

  it('has tenant/provider index and tenant foreign key', () => {
    const config = getTableConfig(ssoConnections);
    const tenantProviderIdx = config.indexes.find(
      (i) => i.config.name === 'auth_sso_connections_tenant_provider_idx',
    );

    expect(config.foreignKeys.length).toBe(1);
    expect(config.foreignKeys[0]!.reference().foreignTable).toBe(tenants);
    expect(tenantProviderIdx).toBeDefined();
  });
});
