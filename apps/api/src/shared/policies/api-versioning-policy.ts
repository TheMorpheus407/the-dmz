import { z } from 'zod';

export const DeprecationPolicySchema = z.object({
  requiredHeaders: z.object({
    deprecation: z.boolean().default(true),
    sunset: z.boolean().default(true),
    link: z.boolean().default(true),
  }),
  sunsetPolicy: z.object({
    defaultGracePeriodDays: z.number().min(0).default(180),
    majorVersionOverlapDays: z.number().min(0).default(365),
  }),
});

export type DeprecationPolicy = z.infer<typeof DeprecationPolicySchema>;

export const VersionedRouteRuleSchema = z.object({
  module: z.string(),
  requiredVersionPrefix: z.string(),
  allowedUnversioned: z.boolean().default(false),
});

export type VersionedRouteRule = z.infer<typeof VersionedRouteRuleSchema>;

export const UnversionedExceptionSchema = z.object({
  path: z.string(),
  reason: z.string(),
  expiryDate: z.string().optional(),
  reviewRequired: z.boolean().default(false),
  allowSubpaths: z.boolean().default(true),
});

export type UnversionedException = z.infer<typeof UnversionedExceptionSchema>;

export const ApiVersioningPolicySchema = z.object({
  activeMajorVersion: z.string(),
  versionedBasePath: z.string(),
  versionFormat: z.enum(['v{major}', 'v{major}.{minor}']).default('v{major}'),
  modules: z.array(VersionedRouteRuleSchema),
  allowedUnversionedExceptions: z.array(UnversionedExceptionSchema),
  deprecation: DeprecationPolicySchema,
  openApi: z.object({
    servers: z.array(
      z.object({
        url: z.string(),
        description: z.string().optional(),
      }),
    ),
    basePath: z.string(),
  }),
});

export type ApiVersioningPolicy = z.infer<typeof ApiVersioningPolicySchema>;

export const API_VERSIONING_POLICY: ApiVersioningPolicy = {
  activeMajorVersion: 'v1',
  versionedBasePath: '/api/v1',
  versionFormat: 'v{major}',
  modules: [
    {
      module: 'auth',
      requiredVersionPrefix: '/api/v1/auth',
      allowedUnversioned: false,
    },
    {
      module: 'game',
      requiredVersionPrefix: '/api/v1/game',
      allowedUnversioned: false,
    },
    {
      module: 'health',
      requiredVersionPrefix: '/health',
      allowedUnversioned: true,
    },
  ],
  allowedUnversionedExceptions: [
    {
      path: '/health',
      reason: 'Kubernetes liveness probe - must be at root for orchestration compatibility',
      reviewRequired: false,
      allowSubpaths: true,
    },
    {
      path: '/ready',
      reason: 'Kubernetes readiness probe - must be at root for orchestration compatibility',
      reviewRequired: false,
      allowSubpaths: false,
    },
    {
      path: '/api/v1',
      reason: 'API root status endpoint',
      reviewRequired: false,
      allowSubpaths: false,
    },
    {
      path: '/docs',
      reason: 'OpenAPI documentation UI',
      reviewRequired: false,
      allowSubpaths: true,
    },
  ],
  deprecation: {
    requiredHeaders: {
      deprecation: true,
      sunset: true,
      link: true,
    },
    sunsetPolicy: {
      defaultGracePeriodDays: 180,
      majorVersionOverlapDays: 365,
    },
  },
  openApi: {
    servers: [
      {
        url: '/api/v1',
        description: 'Current production API (v1)',
      },
    ],
    basePath: '/api/v1',
  },
};

export function getModuleVersionRule(moduleName: string): VersionedRouteRule | undefined {
  return API_VERSIONING_POLICY.modules.find((m) => m.module === moduleName);
}

export function isPathVersioned(path: string): boolean {
  return path.startsWith(API_VERSIONING_POLICY.versionedBasePath);
}

export function isPathAllowedUnversioned(path: string): boolean {
  return API_VERSIONING_POLICY.allowedUnversionedExceptions.some((exception) => {
    if (path === exception.path) {
      return true;
    }
    if (exception.allowSubpaths && path.startsWith(exception.path + '/')) {
      return true;
    }
    return false;
  });
}

export function getDeprecationPolicy(): DeprecationPolicy {
  return API_VERSIONING_POLICY.deprecation;
}

export function validateVersioningPolicy(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!API_VERSIONING_POLICY.activeMajorVersion) {
    errors.push('activeMajorVersion is required');
  }

  if (!API_VERSIONING_POLICY.versionedBasePath.startsWith('/')) {
    errors.push('versionedBasePath must start with /');
  }

  for (const exception of API_VERSIONING_POLICY.allowedUnversionedExceptions) {
    if (!exception.path.startsWith('/')) {
      errors.push(`Exception path must start with /: ${exception.path}`);
    }
    if (exception.reviewRequired && !exception.expiryDate) {
      errors.push(`Exception with reviewRequired=true must have expiryDate: ${exception.path}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
