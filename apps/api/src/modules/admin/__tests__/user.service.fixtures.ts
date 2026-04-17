import { tenants, users } from '../../../shared/database/schema/index.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';
import type { Tenant, User } from '../../../shared/database/schema/index.js';

export type TestTenantValues = {
  name: string;
  slug: string;
  tier?: string;
  status?: string;
  provisioningStatus?: string;
  isActive?: boolean;
};

export type TestUserValues = {
  tenantId: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  role?: string;
  isActive?: boolean;
};

export const createTestTenant = async (
  db: DatabaseClient,
  values: TestTenantValues,
): Promise<Tenant> => {
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: values.name,
      slug: values.slug,
      tier: values.tier ?? 'enterprise',
      status: values.status ?? 'active',
      provisioningStatus: values.provisioningStatus ?? 'ready',
      isActive: values.isActive ?? true,
    })
    .returning();
  return tenant!;
};

export const createTestUser = async (db: DatabaseClient, values: TestUserValues): Promise<User> => {
  const [user] = await db
    .insert(users)
    .values({
      tenantId: values.tenantId,
      email: values.email,
      displayName: values.displayName,
      passwordHash: values.passwordHash ?? 'hash',
      role: values.role ?? 'learner',
      isActive: values.isActive ?? true,
    })
    .returning();
  return user!;
};

export const createAdminUser = async (
  db: DatabaseClient,
  tenantId: string,
  email?: string,
  displayName?: string,
): Promise<User> => {
  return createTestUser(db, {
    tenantId,
    email: email ?? 'admin@test.com',
    displayName: displayName ?? 'Admin User',
    role: 'tenant_admin',
    isActive: true,
  });
};

export const createTestTenantWithAdmin = async (
  db: DatabaseClient,
  options?: {
    tenantName?: string;
    tenantSlug?: string;
    adminEmail?: string;
    adminDisplayName?: string;
  },
): Promise<{ tenant: Tenant; adminUser: User }> => {
  const tenant = await createTestTenant(db, {
    name: options?.tenantName ?? 'Test Tenant',
    slug: options?.tenantSlug ?? `test-tenant-${crypto.randomUUID()}`,
  });

  const adminUser = await createAdminUser(
    db,
    tenant.tenantId,
    options?.adminEmail,
    options?.adminDisplayName,
  );

  return { tenant, adminUser };
};
