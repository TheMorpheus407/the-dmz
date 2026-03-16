import { sql, eq, and } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient, type DatabaseClient } from '../../shared/database/connection.js';
import {
  permissions,
  rolePermissions,
  roles,
  tenants,
  userRoles,
  users,
  type Tenant,
  type ProvisioningStatus,
  type TenantTier,
} from '../../shared/database/schema/index.js';
// eslint-disable-next-line import-x/no-restricted-paths
import { hashPassword } from '../auth/index.js';
import { generateSecurePassword } from '../../shared/utils/password.js';

import type { NewTenant, TenantWithStatus } from './tenant-provisioning.types.js';

const DEFAULT_ROLES = [
  { name: 'tenant_admin', description: 'Full tenant administrative access' },
  { name: 'manager', description: 'User management and reporting access' },
  { name: 'trainer', description: 'Training campaign and competency management' },
  { name: 'learner', description: 'Standard training consumer access' },
] as const;

const TIER_FEATURE_FLAGS: Record<TenantTier, Record<string, boolean>> = {
  starter: {
    training_campaigns: true,
    phishing_simulation: true,
    basic_reporting: true,
    scorm_export: true,
    lti_integration: false,
    advanced_analytics: false,
    sso_integration: false,
    scim_provisioning: false,
    custom_branding: false,
    api_access: false,
  },
  professional: {
    training_campaigns: true,
    phishing_simulation: true,
    advanced_reporting: true,
    scorm_export: true,
    lti_integration: true,
    advanced_analytics: true,
    sso_integration: true,
    scim_provisioning: true,
    custom_branding: true,
    api_access: false,
  },
  enterprise: {
    training_campaigns: true,
    phishing_simulation: true,
    advanced_reporting: true,
    scorm_export: true,
    lti_integration: true,
    advanced_analytics: true,
    sso_integration: true,
    scim_provisioning: true,
    custom_branding: true,
    api_access: true,
    dedicated_support: true,
    custom_integrations: true,
  },
  government: {
    training_campaigns: true,
    phishing_simulation: true,
    advanced_reporting: true,
    scorm_export: true,
    lti_integration: true,
    advanced_analytics: true,
    sso_integration: true,
    scim_provisioning: true,
    custom_branding: true,
    api_access: true,
    dedicated_support: true,
    custom_integrations: true,
    fedramp_compliance: true,
    data_residency: true,
  },
};

const TIER_QUOTAS: Record<TenantTier, { maxUsers: number; maxStorageGB: number }> = {
  starter: { maxUsers: 500, maxStorageGB: 10 },
  professional: { maxUsers: 5000, maxStorageGB: 100 },
  enterprise: { maxUsers: -1, maxStorageGB: -1 },
  government: { maxUsers: -1, maxStorageGB: -1 },
};

const ADMIN_PERMISSIONS = [
  'admin:read',
  'admin:write',
  'users:read',
  'users:write',
  'users:delete',
  'roles:read',
  'roles:write',
  'reports:read',
  'reports:export',
  'settings:read',
  'settings:write',
  'campaigns:read',
  'campaigns:write',
] as const;

const MANAGER_PERMISSIONS = [
  'users:read',
  'users:write',
  'roles:read',
  'reports:read',
  'reports:export',
  'campaigns:read',
  'campaigns:write',
] as const;

const TRAINER_PERMISSIONS = [
  'users:read',
  'reports:read',
  'campaigns:read',
  'campaigns:write',
] as const;

const LEARNER_PERMISSIONS = ['users:read', 'campaigns:read'] as const;

const PERMISSION_MAPPING: Record<string, readonly string[]> = {
  tenant_admin: ADMIN_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  trainer: TRAINER_PERMISSIONS,
  learner: LEARNER_PERMISSIONS,
};

const getFeatureFlags = (tier: TenantTier): Record<string, boolean> => {
  return { ...TIER_FEATURE_FLAGS[tier] };
};

const getQuotas = (tier: TenantTier) => {
  return { ...TIER_QUOTAS[tier] };
};

const ensureBasePermissions = async (db: DatabaseClient): Promise<Map<string, string>> => {
  const basePermissions = [
    {
      resource: 'admin',
      action: 'read',
      description: 'View tenant admin-only content and settings',
    },
    {
      resource: 'admin',
      action: 'write',
      description: 'Create and update tenant admin-only content and settings',
    },
    { resource: 'users', action: 'read', description: 'View user profiles' },
    { resource: 'users', action: 'write', description: 'Create and update users' },
    { resource: 'users', action: 'delete', description: 'Deactivate or remove users' },
    { resource: 'roles', action: 'read', description: 'View role definitions' },
    { resource: 'roles', action: 'write', description: 'Create and modify roles' },
    { resource: 'reports', action: 'read', description: 'View reports and analytics' },
    { resource: 'reports', action: 'export', description: 'Export report data' },
    { resource: 'settings', action: 'read', description: 'View tenant settings' },
    { resource: 'settings', action: 'write', description: 'Modify tenant settings' },
    { resource: 'campaigns', action: 'read', description: 'View training campaigns' },
    { resource: 'campaigns', action: 'write', description: 'Create and manage campaigns' },
  ] as const;

  for (const permission of basePermissions) {
    await db
      .insert(permissions)
      .values({
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      })
      .onConflictDoUpdate({
        target: [permissions.resource, permissions.action],
        set: {
          description: sql`excluded.description`,
        },
      });
  }

  const permissionRows = await db
    .select({
      id: permissions.id,
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(permissions);

  return new Map(
    permissionRows.map((permission) => [
      `${permission.resource}:${permission.action}`,
      permission.id,
    ]),
  );
};

export const createTenant = async (
  data: NewTenant,
  config: AppConfig = loadConfig(),
): Promise<{ tenant: Tenant; temporaryPassword: string }> => {
  const db = getDatabaseClient(config);

  const existingTenant = await db
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(eq(tenants.slug, data.slug))
    .limit(1);

  if (existingTenant.length > 0) {
    throw new Error(`Tenant with slug '${data.slug}' already exists`);
  }

  if (data.domain) {
    const existingDomain = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.domain, data.domain))
      .limit(1);

    if (existingDomain.length > 0) {
      throw new Error(`Tenant with domain '${data.domain}' already exists`);
    }
  }

  const tier = data.tier ?? 'starter';
  const featureFlags = getFeatureFlags(tier);
  const quotas = getQuotas(tier);

  const defaultSettings = {
    featureFlags,
    quotas,
  };

  const temporaryPassword = generateSecurePassword();

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: data.name,
      slug: data.slug,
      domain: data.domain ?? null,
      contactEmail: data.contactEmail ?? null,
      tier,
      planId: data.planId ?? 'free',
      status: 'active',
      provisioningStatus: 'pending',
      settings: defaultSettings,
      dataRegion: data.dataRegion ?? 'eu',
      isActive: true,
    })
    .returning();

  if (!tenant) {
    throw new Error('Failed to create tenant');
  }

  return { tenant, temporaryPassword };
};

export const createDefaultRoles = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`select set_config('app.is_super_admin', 'true', true)`);

    for (const role of DEFAULT_ROLES) {
      await tx
        .insert(roles)
        .values({
          tenantId,
          name: role.name,
          description: role.description,
          isSystem: true,
        })
        .onConflictDoUpdate({
          target: [roles.tenantId, roles.name],
          set: {
            description: sql`excluded.description`,
            isSystem: true,
            updatedAt: sql`now()`,
          },
        });
    }
  });
};

export const createInitialAdmin = async (
  tenantId: string,
  adminEmail: string,
  adminDisplayName: string,
  config: AppConfig = loadConfig(),
): Promise<{ userId: string; roleId: string; temporaryPassword: string }> => {
  const db = getDatabaseClient(config);

  const temporaryPassword = generateSecurePassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const [user] = await db
    .insert(users)
    .values({
      tenantId,
      email: adminEmail,
      displayName: adminDisplayName,
      passwordHash,
      role: 'tenant_admin',
      isActive: true,
    })
    .returning();

  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.name, 'tenant_admin')))
    .limit(1);

  if (!role) {
    throw new Error('Tenant admin role not found');
  }

  if (!user) {
    throw new Error('Failed to create admin user');
  }

  await db
    .insert(userRoles)
    .values({
      tenantId,
      userId: user.userId,
      roleId: role.id,
    })
    .onConflictDoNothing();

  return { userId: user.userId, roleId: role.id, temporaryPassword };
};

export const assignPermissionsToRoles = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);
  const permissionMap = await ensureBasePermissions(db);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`select set_config('app.is_super_admin', 'true', true)`);

    const roleRows = await tx
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.tenantId, tenantId));

    const roleIdByName = new Map(roleRows.map((role) => [role.name, role.id]));

    for (const [roleName, permissionKeys] of Object.entries(PERMISSION_MAPPING)) {
      const roleId = roleIdByName.get(roleName);
      if (!roleId) continue;

      for (const permissionKey of permissionKeys) {
        const permissionId = permissionMap.get(permissionKey);
        if (!permissionId) continue;

        await tx
          .insert(rolePermissions)
          .values({
            roleId,
            permissionId,
          })
          .onConflictDoNothing();
      }
    }
  });
};

export const initializeTenant = async (
  tenantId: string,
  adminEmail: string,
  adminDisplayName: string,
  config: AppConfig = loadConfig(),
): Promise<{ userId: string; temporaryPassword: string }> => {
  const db = getDatabaseClient(config);

  const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.provisioningStatus === 'ready') {
    throw new Error('Tenant is already provisioned');
  }

  await db
    .update(tenants)
    .set({ provisioningStatus: 'provisioning', updatedAt: sql`now()` })
    .where(eq(tenants.tenantId, tenantId));

  try {
    await createDefaultRoles(tenantId, config);
    await assignPermissionsToRoles(tenantId, config);

    const { userId, temporaryPassword } = await createInitialAdmin(
      tenantId,
      adminEmail,
      adminDisplayName,
      config,
    );

    await db
      .update(tenants)
      .set({ provisioningStatus: 'ready', updatedAt: sql`now()` })
      .where(eq(tenants.tenantId, tenantId));

    return { userId, temporaryPassword };
  } catch (error) {
    await db
      .update(tenants)
      .set({ provisioningStatus: 'failed', updatedAt: sql`now()` })
      .where(eq(tenants.tenantId, tenantId));

    throw error;
  }
};

export const getTenantProvisioningStatus = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<TenantWithStatus> => {
  const db = getDatabaseClient(config);

  const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain,
    tier: tenant.tier as TenantTier,
    status: tenant.status,
    provisioningStatus: tenant.provisioningStatus as ProvisioningStatus,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
};

export const isTenantReady = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const [tenant] = await db
    .select({ provisioningStatus: tenants.provisioningStatus })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  return tenant?.provisioningStatus === 'ready';
};

export const seedTenantAuthModel = async (
  config: AppConfig = loadConfig(),
  tenantId: string,
): Promise<void> => {
  await createDefaultRoles(tenantId, config);
  await assignPermissionsToRoles(tenantId, config);
};

export { type NewTenant, type TenantWithStatus } from './tenant-provisioning.types.js';
