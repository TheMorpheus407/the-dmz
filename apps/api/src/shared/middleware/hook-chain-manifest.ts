export type HookName =
  | 'authGuard'
  | 'tenantContext'
  | 'tenantStatusGuard'
  | 'requirePermission'
  | 'requireRole'
  | 'requireMfaForSuperAdmin'
  | 'validateCsrf'
  | 'rateLimiter'
  | 'idempotency';

export type RouteCategory = 'public' | 'auth' | 'protected' | 'game' | 'admin' | 'system';

export type LifecycleStage =
  | 'onRequest'
  | 'preParsing'
  | 'preValidation'
  | 'preHandler'
  | 'onSend'
  | 'onResponse'
  | 'onError';

export interface HookRequirement {
  hook: HookName;
  position: number;
  requiredFor: RouteCategory[];
}

export interface HookSourceBoundary {
  hook: HookName;
  allowedSources: string[];
}

export interface HookChainException {
  route: string;
  reason: string;
  expiresAt?: string;
  grantedAt: string;
}

export interface HookChainContract {
  version: string;
  lastUpdated: string;
  lifecycleStages: LifecycleStage[];
  categories: RouteCategory[];
  requiredHooks: HookRequirement[];
  allowedHooks: HookName[];
  hookSources: HookSourceBoundary[];
  exceptions: HookChainException[];
}

const HOOK_CHAIN_CONTRACT: HookChainContract = {
  version: '1.0.0',
  lastUpdated: '2026-02-23',
  lifecycleStages: [
    'onRequest',
    'preParsing',
    'preValidation',
    'preHandler',
    'onSend',
    'onResponse',
    'onError',
  ],
  categories: ['public', 'auth', 'protected', 'game', 'admin', 'system'],
  requiredHooks: [
    {
      hook: 'authGuard',
      position: 1,
      requiredFor: ['protected', 'game', 'admin'],
    },
    {
      hook: 'tenantContext',
      position: 2,
      requiredFor: ['protected', 'game', 'admin'],
    },
    {
      hook: 'tenantStatusGuard',
      position: 3,
      requiredFor: ['protected', 'game', 'admin'],
    },
  ],
  allowedHooks: [
    'authGuard',
    'tenantContext',
    'tenantStatusGuard',
    'requirePermission',
    'requireRole',
    'requireMfaForSuperAdmin',
    'validateCsrf',
    'rateLimiter',
    'idempotency',
  ],
  hookSources: [
    {
      hook: 'authGuard',
      allowedSources: ['shared/middleware/authorization.ts'],
    },
    {
      hook: 'tenantContext',
      allowedSources: ['shared/middleware/tenant-context.ts'],
    },
    {
      hook: 'tenantStatusGuard',
      allowedSources: ['shared/middleware/tenant-status-guard.ts'],
    },
    {
      hook: 'requirePermission',
      allowedSources: ['shared/middleware/authorization.ts'],
    },
    {
      hook: 'requireRole',
      allowedSources: ['shared/middleware/authorization.ts'],
    },
    {
      hook: 'requireMfaForSuperAdmin',
      allowedSources: ['shared/middleware/mfa-guard.ts'],
    },
    {
      hook: 'validateCsrf',
      allowedSources: ['modules/auth/csrf.ts'],
    },
    {
      hook: 'rateLimiter',
      allowedSources: ['shared/middleware/rate-limiter.ts'],
    },
    {
      hook: 'idempotency',
      allowedSources: ['shared/middleware/idempotency.ts'],
    },
  ],
  exceptions: [
    {
      route: '/health/authenticated',
      reason: 'Auth module provides authenticated health check requiring auth context',
      grantedAt: '2026-02-23',
    },
    {
      route: '/auth/refresh',
      reason: 'Refresh token endpoint uses validateCsrf instead of full auth chain',
      grantedAt: '2026-02-23',
    },
    {
      route: '/auth/mfa/status',
      reason: 'MFA status endpoint uses inline auth verification (equivalent to authGuard)',
      grantedAt: '2026-02-23',
    },
    {
      route: '/auth/mfa/webauthn/credentials',
      reason: 'MFA credentials endpoint uses inline auth verification (equivalent to authGuard)',
      grantedAt: '2026-02-23',
    },
  ],
};

export const HOOK_CHAIN_MANIFEST = HOOK_CHAIN_CONTRACT;

export function getRequiredHooksForCategory(category: RouteCategory): HookRequirement[] {
  return HOOK_CHAIN_MANIFEST.requiredHooks.filter((h) => h.requiredFor.includes(category));
}

export function getHookPosition(hookName: HookName): number | undefined {
  return HOOK_CHAIN_MANIFEST.requiredHooks.find((h) => h.hook === hookName)?.position;
}

export function isHookAllowed(hookName: HookName): boolean {
  return HOOK_CHAIN_MANIFEST.allowedHooks.includes(hookName);
}

export function isRouteExcepted(routePath: string): HookChainException | undefined {
  return HOOK_CHAIN_MANIFEST.exceptions.find((e) => routePath.startsWith(e.route));
}

export function isHookFromAllowedSource(hookName: HookName, sourcePath: string): boolean {
  const boundary = HOOK_CHAIN_MANIFEST.hookSources.find((h) => h.hook === hookName);
  if (!boundary) return false;
  return boundary.allowedSources.some((allowed) => sourcePath.includes(allowed));
}

export function getCategoryForRoute(routePath: string): RouteCategory {
  if (routePath === '/health' || routePath === '/ready') {
    return 'system';
  }
  if (routePath.startsWith('/health') && !routePath.includes('authenticated')) {
    return 'system';
  }
  if (routePath.startsWith('/auth/login') || routePath.startsWith('/auth/register')) {
    return 'public';
  }
  if (routePath.startsWith('/auth/refresh') || routePath.startsWith('/auth/logout')) {
    return 'auth';
  }
  if (routePath.startsWith('/auth/admin')) {
    return 'admin';
  }
  if (routePath.startsWith('/game')) {
    return 'game';
  }
  if (routePath.startsWith('/auth')) {
    return 'protected';
  }
  return 'public';
}

export interface HookChainViolation {
  type: 'missing_hook' | 'wrong_order' | 'duplicate_hook' | 'unapproved_hook' | 'invalid_source';
  route: string;
  file: string;
  expected?: string;
  observed?: string;
  message: string;
}

export type { HookChainContract as HookChainManifest };
