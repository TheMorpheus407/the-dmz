export const TENANT_SCOPED_TABLES = [
  {
    table: 'tenants',
    schema: 'public',
    description: 'Root tenant entity - each row IS the tenant',
    reason: 'Primary tenant entity - tenant_id is the primary key',
    hasNotNullTenantId: true,
    hasTenantFk: false,
    hasRls: false,
  },
  {
    table: 'users',
    schema: 'public',
    description: 'Tenant-scoped user accounts',
    reason: 'Users belong to tenants via tenant_id FK to public.tenants',
    hasNotNullTenantId: true,
    hasTenantFk: true,
    hasRls: false,
  },
  {
    table: 'sessions',
    schema: 'auth',
    description: 'Authentication sessions scoped to tenants',
    reason: 'Sessions are tied to users who belong to tenants',
    hasNotNullTenantId: true,
    hasTenantFk: true,
    hasRls: true,
    compositeForeignKeys: [
      {
        columns: ['tenant_id', 'user_id'],
        references: ['public.users.tenant_id', 'public.users.user_id'],
      },
    ],
  },
  {
    table: 'roles',
    schema: 'auth',
    description: 'Tenant-specific RBAC roles',
    reason: 'Roles are tenant-scoped for RBAC isolation',
    hasNotNullTenantId: true,
    hasTenantFk: true,
    hasRls: true,
  },
  {
    table: 'user_roles',
    schema: 'auth',
    description: 'User-role assignments scoped to tenants',
    reason: 'User role bindings must respect tenant boundaries',
    hasNotNullTenantId: true,
    hasTenantFk: true,
    hasRls: true,
    compositeForeignKeys: [
      {
        columns: ['tenant_id', 'user_id'],
        references: ['public.users.tenant_id', 'public.users.user_id'],
      },
      {
        columns: ['tenant_id', 'role_id'],
        references: ['auth.roles.tenant_id', 'auth.roles.id'],
      },
      {
        columns: ['tenant_id', 'assigned_by'],
        references: ['public.users.tenant_id', 'public.users.user_id'],
      },
    ],
  },
  {
    table: 'role_permissions',
    schema: 'auth',
    description: 'Role-permission bindings scoped to tenants',
    reason: 'Permissions are assigned to tenant-scoped roles via FK to auth.roles',
    hasNotNullTenantId: false,
    hasTenantFk: false,
    hasRls: true,
    note: 'Tenant isolation via FK to auth.roles which is already tenant-scoped',
  },
  {
    table: 'sso_connections',
    schema: 'auth',
    description: 'Tenant SSO configuration',
    reason: 'SSO connections are per-tenant for IdP isolation',
    hasNotNullTenantId: true,
    hasTenantFk: true,
    hasRls: true,
  },
  {
    table: 'user_profiles',
    schema: 'auth',
    description: 'User profile preferences scoped to tenants',
    reason: 'Profiles contain tenant-specific settings and preferences',
    hasNotNullTenantId: true,
    hasTenantFk: true,
    hasRls: true,
    compositeForeignKeys: [
      {
        columns: ['tenant_id', 'user_id'],
        references: ['public.users.tenant_id', 'public.users.user_id'],
      },
    ],
  },
] as const;

export const GLOBAL_TABLES = [
  {
    table: 'permissions',
    schema: 'auth',
    description: 'Global permission definitions',
    reason: 'Permissions are system-wide definitions, not tenant-scoped',
    hasTenantId: false,
    note: 'Authorization uses permission strings, not tenant-bound resources',
  },
] as const;

export type TenantScopedTable = (typeof TENANT_SCOPED_TABLES)[number];
export type GlobalTable = (typeof GLOBAL_TABLES)[number];

export function isTenantScoped(schema: string, table: string): boolean {
  return TENANT_SCOPED_TABLES.some((t) => t.schema === schema && t.table === table);
}

export function isGlobalTable(schema: string, table: string): boolean {
  return GLOBAL_TABLES.some((t) => t.schema === schema && t.table === table);
}

export function getTablePolicy(
  schema: string,
  table: string,
): TenantScopedTable | GlobalTable | undefined {
  const tenantScoped = TENANT_SCOPED_TABLES.find((t) => t.schema === schema && t.table === table);
  if (tenantScoped) return tenantScoped;

  const global = GLOBAL_TABLES.find((t) => t.schema === schema && t.table === table);
  return global;
}
