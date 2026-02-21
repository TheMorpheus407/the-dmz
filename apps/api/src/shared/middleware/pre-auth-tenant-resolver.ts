import { getDatabaseClient } from '../database/connection.js';

import { ErrorCodes, AppError } from './error-handler.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value: string): boolean => UUID_REGEX.test(value);

export interface PreAuthTenantContext {
  tenantId: string;
  tenantSlug: string;
  source: 'header' | 'host' | 'fallback';
}

declare module 'fastify' {
  interface FastifyRequest {
    preAuthTenantContext?: PreAuthTenantContext;
  }
}

export interface TenantResolutionOptions {
  fallbackEnabled: boolean;
  fallbackSlug: string;
  headerName: string;
}

const resolveTenantFromHeader = (
  request: FastifyRequest,
  headerName: string,
): PreAuthTenantContext | null => {
  const headerValue = request.headers[headerName] as string | undefined;

  if (!headerValue) {
    return null;
  }

  if (isValidUuid(headerValue)) {
    return {
      tenantId: headerValue,
      tenantSlug: headerValue,
      source: 'header',
    };
  }

  return {
    tenantId: headerValue,
    tenantSlug: headerValue,
    source: 'header',
  };
};

const resolveTenantFromHost = (request: FastifyRequest): PreAuthTenantContext | null => {
  const host = request.headers.host;

  if (!host) {
    return null;
  }

  const hostname = host.split(':')[0];

  if (!hostname) {
    return null;
  }

  const localHosts = ['localhost', '127.0.0.1', '::1'];
  if (localHosts.includes(hostname)) {
    return null;
  }

  const subdomainMatch = hostname.match(/^([a-zA-Z0-9-]+)\.[a-zA-Z0-9.-]+$/);

  if (!subdomainMatch || !subdomainMatch[1]) {
    return null;
  }

  const slug = subdomainMatch[1].toLowerCase();

  return {
    tenantSlug: slug,
    tenantId: slug,
    source: 'host',
  };
};

export const resolvePreAuthTenant = async (
  request: FastifyRequest,
  config: AppConfig,
  options?: Partial<TenantResolutionOptions>,
): Promise<PreAuthTenantContext> => {
  const headerName = options?.headerName ?? config.TENANT_HEADER_NAME;
  const fallbackEnabled = options?.fallbackEnabled ?? config.TENANT_FALLBACK_ENABLED;
  const fallbackSlug = options?.fallbackSlug ?? config.TENANT_FALLBACK_SLUG;

  const headerResult = resolveTenantFromHeader(request, headerName);
  if (headerResult) {
    if (headerResult.source === 'header' && isValidUuid(headerResult.tenantId)) {
      const db = getDatabaseClient(config);
      const tenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.tenantId, headerResult.tenantId),
      });

      if (!tenant) {
        throw new AppError({
          code: ErrorCodes.TENANT_NOT_FOUND,
          message: `Tenant with ID ${headerResult.tenantId} not found`,
          statusCode: 404,
          details: { tenantId: headerResult.tenantId },
        });
      }

      return {
        tenantId: tenant.tenantId,
        tenantSlug: tenant.slug,
        source: 'header',
      };
    }

    const db = getDatabaseClient(config);
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, headerResult.tenantSlug),
    });

    if (!tenant) {
      throw new AppError({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: `Tenant with slug "${headerResult.tenantSlug}" not found`,
        statusCode: 404,
        details: { tenantSlug: headerResult.tenantSlug },
      });
    }

    return {
      tenantId: tenant.tenantId,
      tenantSlug: tenant.slug,
      source: 'header',
    };
  }

  const hostResult = resolveTenantFromHost(request);
  if (hostResult) {
    const db = getDatabaseClient(config);
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, hostResult.tenantSlug),
    });

    if (!tenant) {
      throw new AppError({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: `Tenant with subdomain "${hostResult.tenantSlug}" not found`,
        statusCode: 404,
        details: { tenantSlug: hostResult.tenantSlug },
      });
    }

    return {
      tenantId: tenant.tenantId,
      tenantSlug: tenant.slug,
      source: 'host',
    };
  }

  if (fallbackEnabled && fallbackSlug) {
    const db = getDatabaseClient(config);
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, fallbackSlug),
    });

    if (tenant) {
      return {
        tenantId: tenant.tenantId,
        tenantSlug: tenant.slug,
        source: 'fallback',
      };
    }
  }

  throw new AppError({
    code: ErrorCodes.TENANT_CONTEXT_MISSING,
    message: 'Tenant context is required. Provide X-Tenant-ID header or configure fallback.',
    statusCode: 401,
    details: {
      availableSources: ['X-Tenant-ID header', 'subdomain'],
      fallbackEnabled,
    },
  });
};

export const preAuthTenantResolver = (options?: Partial<TenantResolutionOptions>) => {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const config = request.server.config;
    const tenantContext = await resolvePreAuthTenant(request, config, options);
    request.preAuthTenantContext = tenantContext;
  };
};

export const registerPreAuthTenantResolver = async (app: FastifyInstance): Promise<void> => {
  app.addHook('preHandler', preAuthTenantResolver());
};
