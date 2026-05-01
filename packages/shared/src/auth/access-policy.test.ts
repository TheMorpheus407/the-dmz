import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ActorType,
  Role,
  AccessPolicyTenantStatus,
  RouteGroup,
  ROUTE_GROUP_POLICY_MATRIX,
  API_ENDPOINT_POLICY_MATRIX,
  isRouteGroupProtected,
  isApiEndpointProtected,
  hasRequiredRole,
  hasAllowedTenantStatus,
  evaluateRouteGroupPolicy,
  ADMIN_ROLES,
  ALL_ROLES,
  getApiPolicyForEndpoint,
  ApiScope,
} from './access-policy.js';

describe('Access Policy Constants', () => {
  describe('ActorType', () => {
    it('has anonymous and authenticated types', () => {
      expect(ActorType.ANONYMOUS).toBe('anonymous');
      expect(ActorType.AUTHENTICATED).toBe('authenticated');
    });
  });

  describe('Role', () => {
    it('has all required roles', () => {
      expect(Role.SUPER_ADMIN).toBe('super_admin');
      expect(Role.TENANT_ADMIN).toBe('tenant_admin');
      expect(Role.MANAGER).toBe('manager');
      expect(Role.TRAINER).toBe('trainer');
      expect(Role.LEARNER).toBe('learner');
    });
  });

  describe('AccessPolicyTenantStatus', () => {
    it('has all required statuses', () => {
      expect(AccessPolicyTenantStatus.PROVISIONING).toBe('provisioning');
      expect(AccessPolicyTenantStatus.ACTIVE).toBe('active');
      expect(AccessPolicyTenantStatus.SUSPENDED).toBe('suspended');
      expect(AccessPolicyTenantStatus.DEACTIVATED).toBe('deactivated');
    });
  });

  describe('RouteGroup', () => {
    it('has all route groups', () => {
      expect(RouteGroup.PUBLIC).toBe('(public)');
      expect(RouteGroup.AUTH).toBe('(auth)');
      expect(RouteGroup.GAME).toBe('(game)');
      expect(RouteGroup.ADMIN).toBe('(admin)');
    });
  });
});

describe('Route Group Policy Matrix', () => {
  it('defines policy for all route groups', () => {
    expect(ROUTE_GROUP_POLICY_MATRIX).toHaveProperty(RouteGroup.PUBLIC);
    expect(ROUTE_GROUP_POLICY_MATRIX).toHaveProperty(RouteGroup.AUTH);
    expect(ROUTE_GROUP_POLICY_MATRIX).toHaveProperty(RouteGroup.GAME);
    expect(ROUTE_GROUP_POLICY_MATRIX).toHaveProperty(RouteGroup.ADMIN);
  });

  it('allows anonymous for (public)', () => {
    const policy = ROUTE_GROUP_POLICY_MATRIX[RouteGroup.PUBLIC];
    expect(policy.actorType).toBe(ActorType.ANONYMOUS);
    expect(policy.requiredRoles).toHaveLength(0);
  });

  it('allows anonymous for (auth) but redirects authenticated', () => {
    const policy = ROUTE_GROUP_POLICY_MATRIX[RouteGroup.AUTH];
    expect(policy.actorType).toBe(ActorType.ANONYMOUS);
    expect(policy.requiredRoles).toHaveLength(0);
    expect(policy.redirectOnDeny).toBe('/game');
  });

  it('requires authentication for (game)', () => {
    const policy = ROUTE_GROUP_POLICY_MATRIX[RouteGroup.GAME];
    expect(policy.actorType).toBe(ActorType.AUTHENTICATED);
    expect(policy.requiredRoles).toHaveLength(0);
    expect(policy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
    expect(policy.redirectOnDeny).toBe('/login');
  });

  it('requires admin role for (admin)', () => {
    const policy = ROUTE_GROUP_POLICY_MATRIX[RouteGroup.ADMIN];
    expect(policy.actorType).toBe(ActorType.AUTHENTICATED);
    expect(policy.requiredRoles).toEqual(ADMIN_ROLES);
    expect(policy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
    expect(policy.redirectOnDeny).toBe('/game');
  });

  it('has no implicit fallthrough - all route groups have explicit policy', () => {
    const routeGroups = [RouteGroup.PUBLIC, RouteGroup.AUTH, RouteGroup.GAME, RouteGroup.ADMIN];
    for (const group of routeGroups) {
      const policy = ROUTE_GROUP_POLICY_MATRIX[group];
      expect(policy).toBeDefined();
      expect(policy.actorType).toBeDefined();
      expect(Array.isArray(policy.requiredRoles)).toBe(true);
      expect(Array.isArray(policy.allowedTenantStatuses)).toBe(true);
    }
  });
});

describe('API Endpoint Policy Matrix', () => {
  it('defines policies for auth endpoints', () => {
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/auth/me']).toBeDefined();
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/auth/login']).toBeDefined();
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/auth/logout']).toBeDefined();
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/auth/refresh']).toBeDefined();
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/auth/register']).toBeDefined();
  });

  it('defines policies for protected endpoints', () => {
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/profile']).toBeDefined();
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/games']).toBeDefined();
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/admin/games']).toBeDefined();
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/admin/tenants']).toBeDefined();
    expect(API_ENDPOINT_POLICY_MATRIX['/api/v1/admin/users']).toBeDefined();
  });

  it('requires active tenant for protected endpoints', () => {
    const profilePolicy = API_ENDPOINT_POLICY_MATRIX['/api/v1/profile'];
    expect(profilePolicy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
  });

  it('requires admin role for admin endpoints', () => {
    const adminUsersPolicy = API_ENDPOINT_POLICY_MATRIX['/api/v1/admin/users'];
    expect(adminUsersPolicy.requiredRoles).toEqual(ADMIN_ROLES);
  });

  it('allows any tenant status for auth endpoints', () => {
    const loginPolicy = API_ENDPOINT_POLICY_MATRIX['/api/v1/auth/login'];
    expect(loginPolicy.allowedTenantStatuses).toHaveLength(0);
  });
});

describe('isRouteGroupProtected', () => {
  it('returns false for (public)', () => {
    expect(isRouteGroupProtected(RouteGroup.PUBLIC)).toBe(false);
  });

  it('returns false for (auth)', () => {
    expect(isRouteGroupProtected(RouteGroup.AUTH)).toBe(false);
  });

  it('returns true for (game)', () => {
    expect(isRouteGroupProtected(RouteGroup.GAME)).toBe(true);
  });

  it('returns true for (admin)', () => {
    expect(isRouteGroupProtected(RouteGroup.ADMIN)).toBe(true);
  });
});

describe('isApiEndpointProtected', () => {
  it('returns false for public endpoints', () => {
    expect(isApiEndpointProtected('/api/v1/auth/login')).toBe(false);
    expect(isApiEndpointProtected('/api/v1/auth/register')).toBe(false);
  });

  it('returns true for protected endpoints', () => {
    expect(isApiEndpointProtected('/api/v1/auth/me')).toBe(true);
    expect(isApiEndpointProtected('/api/v1/profile')).toBe(true);
    expect(isApiEndpointProtected('/api/v1/games')).toBe(true);
  });
});

describe('hasRequiredRole', () => {
  it('returns true when no roles required', () => {
    expect(hasRequiredRole('any_role', [])).toBe(true);
    expect(hasRequiredRole(undefined, [])).toBe(true);
  });

  it('returns false when role required but user has none', () => {
    expect(hasRequiredRole(undefined, [Role.TENANT_ADMIN])).toBe(false);
    expect(hasRequiredRole(undefined, ADMIN_ROLES)).toBe(false);
  });

  it('returns true when user has required role', () => {
    expect(hasRequiredRole('tenant_admin', [Role.TENANT_ADMIN])).toBe(true);
    expect(hasRequiredRole('super_admin', ADMIN_ROLES)).toBe(true);
    expect(hasRequiredRole('learner', [Role.LEARNER])).toBe(true);
  });

  it('performs case-insensitive matching', () => {
    expect(hasRequiredRole('TENANT_ADMIN', [Role.TENANT_ADMIN])).toBe(true);
    expect(hasRequiredRole('SUPER_ADMIN', ADMIN_ROLES)).toBe(true);
  });
});

describe('hasAllowedTenantStatus', () => {
  it('returns true when no statuses required', () => {
    expect(hasAllowedTenantStatus('any_status', [])).toBe(true);
    expect(hasAllowedTenantStatus(undefined, [])).toBe(true);
  });

  it('returns true when tenant status is not provided (frontend default)', () => {
    expect(hasAllowedTenantStatus(undefined, [AccessPolicyTenantStatus.ACTIVE])).toBe(true);
  });

  it('returns true when tenant status is allowed', () => {
    expect(hasAllowedTenantStatus('active', [AccessPolicyTenantStatus.ACTIVE])).toBe(true);
    expect(
      hasAllowedTenantStatus('suspended', [
        AccessPolicyTenantStatus.ACTIVE,
        AccessPolicyTenantStatus.SUSPENDED,
      ]),
    ).toBe(true);
  });

  it('returns false when tenant status is not allowed', () => {
    expect(hasAllowedTenantStatus('suspended', [AccessPolicyTenantStatus.ACTIVE])).toBe(false);
    expect(hasAllowedTenantStatus('deactivated', [AccessPolicyTenantStatus.ACTIVE])).toBe(false);
  });
});

describe('evaluateRouteGroupPolicy', () => {
  describe('(public) route group', () => {
    it('allows anonymous users', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.PUBLIC, null);
      expect(result.allowed).toBe(true);
    });

    it('allows authenticated users', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.PUBLIC, { role: 'admin' });
      expect(result.allowed).toBe(true);
    });
  });

  describe('(auth) route group', () => {
    it('allows anonymous users', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.AUTH, null);
      expect(result.allowed).toBe(true);
    });

    it('redirects authenticated users to /game', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.AUTH, { role: 'learner' });
      expect(result.allowed).toBe(false);
      expect(result.redirectUrl).toBe('/game');
    });
  });

  describe('(game) route group', () => {
    it('redirects anonymous users to /login', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.GAME, null);
      expect(result.allowed).toBe(false);
      expect(result.redirectUrl).toBe('/login');
    });

    it('allows authenticated users with any role', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.GAME, { role: 'learner' });
      expect(result.allowed).toBe(true);
    });

    it('allows authenticated users with active tenant', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.GAME, {
        role: 'learner',
        tenantStatus: 'active',
      });
      expect(result.allowed).toBe(true);
    });

    it('denies users from suspended tenants', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.GAME, {
        role: 'learner',
        tenantStatus: 'suspended',
      });
      expect(result.allowed).toBe(false);
      expect(result.redirectUrl).toBe('/login');
    });
  });

  describe('(admin) route group', () => {
    it('redirects anonymous users to /login', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.ADMIN, null);
      expect(result.allowed).toBe(false);
      expect(result.redirectUrl).toBe('/game');
    });

    it('denies non-admin users', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.ADMIN, { role: 'learner' });
      expect(result.allowed).toBe(false);
      expect(result.redirectUrl).toBe('/game');
    });

    it('allows users with admin role', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.ADMIN, { role: 'tenant_admin' });
      expect(result.allowed).toBe(true);
    });

    it('allows super_admin users', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.ADMIN, { role: 'super_admin' });
      expect(result.allowed).toBe(true);
    });

    it('denies admin users from suspended tenants', () => {
      const result = evaluateRouteGroupPolicy(RouteGroup.ADMIN, {
        role: 'tenant_admin',
        tenantStatus: 'suspended',
      });
      expect(result.allowed).toBe(false);
    });
  });
});

describe('getApiPolicyForEndpoint', () => {
  describe('exact match behavior', () => {
    it('returns policy for /api/v1/auth/me', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/auth/me');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.AUTH_ME);
    });

    it('returns policy for /api/v1/auth/login', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/auth/login');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.AUTH_LOGIN);
    });

    it('returns policy for /api/v1/auth/logout', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/auth/logout');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.AUTH_LOGOUT);
    });

    it('returns policy for /api/v1/auth/refresh', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/auth/refresh');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.AUTH_REFRESH);
    });

    it('returns policy for /api/v1/auth/register', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/auth/register');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.AUTH_REGISTER);
    });

    it('returns policy for /api/v1/profile', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/profile');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.PROFILE_READ);
      expect(policy?.scopes).toContain(ApiScope.PROFILE_WRITE);
    });

    it('returns policy for /api/v1/games', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/games');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.GAME_READ);
      expect(policy?.scopes).toContain(ApiScope.GAME_WRITE);
    });

    it('returns policy for /api/v1/admin/games', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/admin/games');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.GAME_ADMIN_READ);
      expect(policy?.scopes).toContain(ApiScope.GAME_ADMIN_WRITE);
      expect(policy?.requiredRoles).toEqual(ADMIN_ROLES);
    });

    it('returns policy for /api/v1/admin/tenants', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/admin/tenants');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.ADMIN_TENANT_READ);
      expect(policy?.scopes).toContain(ApiScope.ADMIN_TENANT_WRITE);
      expect(policy?.requiredRoles).toEqual(ADMIN_ROLES);
    });

    it('returns policy for /api/v1/admin/users', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/admin/users');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.ADMIN_USER_READ);
      expect(policy?.scopes).toContain(ApiScope.ADMIN_USER_WRITE);
      expect(policy?.requiredRoles).toEqual(ADMIN_ROLES);
    });
  });

  describe('unprotected endpoint behavior', () => {
    it('returns policy object for unprotected endpoint /api/v1/auth/login (not undefined)', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/auth/login');
      expect(policy).toBeDefined();
      expect(policy?.allowedTenantStatuses).toHaveLength(0);
      expect(policy?.requiredRoles).toHaveLength(0);
    });

    it('returns policy object for unprotected endpoint /api/v1/auth/register', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/auth/register');
      expect(policy).toBeDefined();
      expect(policy?.allowedTenantStatuses).toHaveLength(0);
    });
  });

  describe('unknown endpoint behavior', () => {
    it('returns undefined for /api/v1/unknown/route', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/unknown/route');
      expect(policy).toBeUndefined();
    });

    it('returns undefined for completely unrelated path', () => {
      const policy = getApiPolicyForEndpoint('/some/random/path');
      expect(policy).toBeUndefined();
    });

    it('returns undefined for /api/v2/auth/me (different version)', () => {
      const policy = getApiPolicyForEndpoint('/api/v2/auth/me');
      expect(policy).toBeUndefined();
    });

    it('returns undefined for /api/v1/auth/me/extra (trailing segment)', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/auth/me/extra');
      expect(policy).toBeUndefined();
    });
  });

  describe('wildcard pattern matching', () => {
    beforeEach(() => {
      Object.defineProperty(API_ENDPOINT_POLICY_MATRIX, '/api/v1/admin/*', {
        value: {
          scopes: [ApiScope.ADMIN_TENANT_READ],
          requiredRoles: ADMIN_ROLES,
          allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
        },
        writable: true,
        enumerable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      delete (API_ENDPOINT_POLICY_MATRIX as Record<string, unknown>)['/api/v1/admin/*'];
    });

    it('matches wildcard pattern for /api/v1/admin/analytics', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/admin/analytics');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.ADMIN_TENANT_READ);
    });

    it('matches wildcard pattern for /api/v1/admin/settings', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/admin/settings');
      expect(policy).toBeDefined();
      expect(policy?.scopes).toContain(ApiScope.ADMIN_TENANT_READ);
    });

    it('does not match wildcard pattern for /api/v1/profile (non-admin)', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/profile');
      expect(policy?.scopes).toContain(ApiScope.PROFILE_READ);
    });

    it('does not match wildcard pattern for /api/v1/games (non-admin)', () => {
      const policy = getApiPolicyForEndpoint('/api/v1/games');
      expect(policy?.scopes).toContain(ApiScope.GAME_READ);
    });
  });
});

describe('Role arrays', () => {
  it('ADMIN_ROLES contains admin roles', () => {
    expect(ADMIN_ROLES).toContain(Role.SUPER_ADMIN);
    expect(ADMIN_ROLES).toContain(Role.TENANT_ADMIN);
    expect(ADMIN_ROLES).not.toContain(Role.MANAGER);
    expect(ADMIN_ROLES).not.toContain(Role.LEARNER);
  });

  it('ALL_ROLES contains all roles', () => {
    expect(ALL_ROLES).toHaveLength(5);
    expect(ALL_ROLES).toContain(Role.SUPER_ADMIN);
    expect(ALL_ROLES).toContain(Role.TENANT_ADMIN);
    expect(ALL_ROLES).toContain(Role.MANAGER);
    expect(ALL_ROLES).toContain(Role.TRAINER);
    expect(ALL_ROLES).toContain(Role.LEARNER);
  });
});
