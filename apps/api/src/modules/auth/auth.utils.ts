import { getDatabaseClient } from '../../shared/database/connection.js';
import { tenants } from '../../shared/database/schema/tenants.js';

import type { AppConfig } from '../../config.js';

export interface ResolveTenantOptions {
  tenantId?: string;
  required?: boolean;
}

export interface ResolvedTenant {
  tenantId: string;
  isNew: boolean;
}

export const resolveTenantId = async (
  config: AppConfig,
  options?: ResolveTenantOptions,
): Promise<string> => {
  const db = getDatabaseClient(config);

  if (options?.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.tenantId, options.tenantId!),
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant.tenantId;
  }

  const defaultTenant = await db.query.tenants.findFirst({
    where: (tenants, { eq }) => eq(tenants.slug, 'default'),
  });

  if (!defaultTenant) {
    if (options?.required) {
      const [created] = await db
        .insert(tenants)
        .values({
          name: 'Default Tenant',
          slug: 'default',
        })
        .returning({ tenantId: tenants.tenantId });

      if (!created || !created.tenantId) {
        throw new Error('Failed to create default tenant');
      }

      return created.tenantId;
    }
    throw new Error('Default tenant not found');
  }

  return defaultTenant.tenantId;
};
