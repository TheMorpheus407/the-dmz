import { type FastifyRequest, type FastifyInstance } from 'fastify';

import { CredentialClass } from '@the-dmz/shared/contracts';

import { resolveEffectiveQuotaPolicy } from '../services/quota-resolution.service.js';

const extractCredentialClass = (request: FastifyRequest): CredentialClass => {
  if (request.apiKeyAuth?.ownerType) {
    if (request.apiKeyAuth.ownerType === 'pat') {
      return CredentialClass.PAT;
    }
    if (request.apiKeyAuth.ownerType === 'service') {
      return CredentialClass.SERVICE_CLIENT;
    }
    return CredentialClass.API_KEY;
  }

  return CredentialClass.API_KEY;
};

const extractTenantId = (request: FastifyRequest): string | undefined => {
  if (request.tenantContext?.tenantId) {
    return request.tenantContext.tenantId;
  }

  if (request.preAuthTenantContext?.tenantId) {
    return request.preAuthTenantContext.tenantId;
  }

  const headerTenantId = request.headers['x-tenant-id'];
  if (typeof headerTenantId === 'string') {
    return headerTenantId;
  }

  return undefined;
};

const shouldUseDatabase = (): boolean => {
  const nodeEnv = process.env['NODE_ENV'];
  if (nodeEnv === 'test') {
    return false;
  }
  if (process.env['VITEST'] === 'true') {
    return false;
  }
  return true;
};

const resolveTenantFromDatabase = async (
  tenantId: string,
): Promise<{
  planId: string | null;
  override: {
    id: string;
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
  } | null;
}> => {
  if (!shouldUseDatabase()) {
    return { planId: null, override: null };
  }

  let planId: string | null = null;
  let override: {
    id: string;
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
  } | null = null;

  try {
    const { getDatabaseClient } = await import('../database/connection.js');
    const { eq, and } = await import('drizzle-orm');
    const { tenants } = await import('../database/schema/tenants.js');
    const { tenantQuotaOverrides } = await import('../database/schema/tenant-quota.js');

    const db = getDatabaseClient();

    const [tenant] = await db
      .select({ planId: tenants.planId })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    planId = tenant?.planId ?? null;

    const now = new Date();
    const [quotaOverride] = await db
      .select({
        id: tenantQuotaOverrides.id,
        requestsPerMinute: tenantQuotaOverrides.requestsPerMinute,
        requestsPerHour: tenantQuotaOverrides.requestsPerHour,
        burstLimit: tenantQuotaOverrides.burstLimit,
        effectiveFrom: tenantQuotaOverrides.effectiveFrom,
        effectiveUntil: tenantQuotaOverrides.effectiveUntil,
      })
      .from(tenantQuotaOverrides)
      .where(
        and(eq(tenantQuotaOverrides.tenantId, tenantId), eq(tenantQuotaOverrides.status, 'active')),
      )
      .limit(1);

    if (quotaOverride) {
      const effectiveFrom = quotaOverride.effectiveFrom
        ? new Date(quotaOverride.effectiveFrom)
        : null;
      const effectiveUntil = quotaOverride.effectiveUntil
        ? new Date(quotaOverride.effectiveUntil)
        : null;

      const isEffective =
        (!effectiveFrom || effectiveFrom <= now) && (!effectiveUntil || effectiveUntil > now);

      if (isEffective) {
        override = {
          id: quotaOverride.id,
          requestsPerMinute: Number(quotaOverride.requestsPerMinute),
          requestsPerHour: Number(quotaOverride.requestsPerHour),
          burstLimit: Number(quotaOverride.burstLimit),
        };
      }
    }
  } catch {
    // Database unavailable or query failed - use default tier
  }

  return { planId, override };
};

export const quotaPolicyHook = async (request: FastifyRequest): Promise<void> => {
  const tenantId = extractTenantId(request);

  let planId: string | null = null;
  let override: {
    id: string;
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
  } | null = null;

  if (tenantId) {
    const result = await resolveTenantFromDatabase(tenantId);
    planId = result.planId;
    override = result.override;
  }

  const credentialClass = extractCredentialClass(request);
  const effectivePolicy = resolveEffectiveQuotaPolicy({ planId, override }, credentialClass);
  request.effectiveQuotaPolicy = effectivePolicy;
};

export const registerQuotaPolicyHook = (app: FastifyInstance): void => {
  app.addHook('onRequest', quotaPolicyHook);
};
