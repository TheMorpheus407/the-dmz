import type { RouteOwnershipManifest, RouteOwnershipEntry } from './ownership.types.js';

export const ROUTE_OWNERSHIP_MANIFEST: RouteOwnershipManifest = {
  ownership: [
    {
      module: 'auth',
      routePrefix: '/auth',
      routeTags: ['Auth'],
      ownedRoutes: [
        '/auth/register',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
        '/auth/profile',
        '/auth/admin/users',
        '/auth/mfa/webauthn/challenge',
        '/auth/mfa/webauthn/register',
        '/auth/mfa/webauthn/verify',
        '/auth/mfa/status',
        '/auth/mfa/webauthn/credentials',
        '/auth/mfa/webauthn/credentials/:credentialId',
        '/auth/api-keys',
        '/auth/api-keys/:keyId',
        '/auth/api-keys/:keyId/rotate',
        '/auth/api-keys/:keyId/revoke',
      ],
      exemptions: [
        {
          route: '/health/authenticated',
          reason: 'Auth module provides authenticated health check requiring auth context',
        },
      ],
    },
    {
      module: 'game',
      routePrefix: '/game',
      routeTags: ['Game'],
      ownedRoutes: ['/game/session'],
      exemptions: [],
    },
    {
      module: 'health',
      routePrefix: '/health',
      routeTags: ['Health'],
      ownedRoutes: ['/health', '/ready'],
      exemptions: [
        {
          route: '/ready',
          reason: 'Readiness probe at root path for Kubernetes/orchestrator compatibility',
        },
      ],
    },
  ],
};

export function getRouteOwnership(moduleName: string): RouteOwnershipEntry | undefined {
  return ROUTE_OWNERSHIP_MANIFEST.ownership.find((o) => o.module === moduleName);
}

export function isRouteOwnedByModule(moduleName: string, routePath: string): boolean {
  const ownership = getRouteOwnership(moduleName);
  if (!ownership) return false;

  if (ownership.exemptions.some((e) => e.route === routePath)) {
    return true;
  }

  return routePath.startsWith(ownership.routePrefix);
}

export function getRouteOwner(routePath: string): string | undefined {
  for (const ownership of ROUTE_OWNERSHIP_MANIFEST.ownership) {
    if (routePath.startsWith(ownership.routePrefix)) {
      return ownership.module;
    }
    if (ownership.exemptions.some((e) => e.route === routePath)) {
      return ownership.module;
    }
  }
  return undefined;
}

export function isRouteRegistered(routePath: string): boolean {
  return getRouteOwner(routePath) !== undefined;
}
