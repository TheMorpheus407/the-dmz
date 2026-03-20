import type { OwnershipManifest } from './ownership.types.js';

export const OWNERSHIP_MANIFEST: OwnershipManifest = {
  ownership: [
    { schema: 'auth', table: 'permissions', module: 'auth' },
    { schema: 'auth', table: 'role_permissions', module: 'auth' },
    { schema: 'auth', table: 'roles', module: 'auth' },
    { schema: 'auth', table: 'sessions', module: 'auth' },
    { schema: 'auth', table: 'sso_connections', module: 'auth' },
    { schema: 'auth', table: 'user_profiles', module: 'auth' },
    { schema: 'auth', table: 'user_roles', module: 'auth' },
    { schema: 'auth', table: 'webauthn_credentials', module: 'auth' },
    { schema: 'public', table: 'game_sessions', module: 'game' },
    { schema: 'ai', table: 'prompt_templates', module: 'aiPipeline' },
  ],
  sharedTables: ['tenants', 'users', 'tenant_policy'],
  exceptions: [
    {
      schema: 'public',
      table: 'users',
      allowedModules: ['auth', 'game', 'settings'],
      justification:
        'Users table is a shared identity table required for authentication and game player references',
    },
    {
      schema: 'public',
      table: 'tenants',
      allowedModules: ['auth', 'game', 'settings'],
      justification: 'Tenants table is required for multi-tenancy isolation across all modules',
    },
    {
      schema: 'public',
      table: 'tenant_policy',
      allowedModules: ['auth', 'game', 'settings'],
      justification: 'Tenant policy is a cross-cutting concern for access control',
    },
    {
      schema: 'auth',
      table: 'user_profiles',
      allowedModules: ['auth', 'settings', 'multiplayer'],
      justification:
        'Multiplayer module requires player profile access to look up user IDs for co-op session creation',
    },
    {
      schema: 'public',
      table: 'game_sessions',
      allowedModules: ['game', 'multiplayer'],
      justification:
        'Multiplayer module requires game session access to create entries for co-op event persistence',
    },
    {
      schema: 'auth',
      table: 'sessions',
      allowedModules: ['admin'],
      justification:
        'Admin module requires session data for user activity tracking and login history in the user management interface',
    },
    {
      schema: 'auth',
      table: 'sso_connections',
      allowedModules: ['admin'],
      justification:
        'Admin module requires SSO connection data for managing IdP configurations in the admin panel',
    },
  ],
};

export function getModuleOwnedTables(moduleName: string): Array<{ schema: string; table: string }> {
  return OWNERSHIP_MANIFEST.ownership
    .filter((o) => o.module === moduleName)
    .map((o) => ({ schema: o.schema, table: o.table }));
}

export function getSharedTables(): string[] {
  return OWNERSHIP_MANIFEST.sharedTables;
}

export function isTableShared(schema: string, table: string): boolean {
  return OWNERSHIP_MANIFEST.sharedTables.some((t) => t === table || t === `${schema}.${table}`);
}

export function isAccessAllowed(moduleName: string, schema: string, table: string): boolean {
  const ownership = OWNERSHIP_MANIFEST.ownership.find(
    (o) => o.schema === schema && o.table === table,
  );

  if (!ownership) {
    return true;
  }

  if (ownership.module === moduleName) {
    return true;
  }

  const exception = OWNERSHIP_MANIFEST.exceptions.find(
    (e) => e.schema === schema && e.table === table,
  );

  if (exception && exception.allowedModules.includes(moduleName)) {
    return true;
  }

  return false;
}
