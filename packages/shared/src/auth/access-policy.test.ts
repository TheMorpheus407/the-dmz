import { describe, expect, it } from 'vitest';

import {
  ActorType,
  Role,
  AccessPolicyTenantStatus,
  RouteGroup,
  routeGroupPolicyMatrix,
  apiEndpointPolicyMatrix,
  isRouteGroupProtected,
  isApiEndpointProtected,
  hasRequiredRole,
  hasAllowedTenantStatus,
  evaluateRouteGroupPolicy,
  adminRoles,
  allRoles,
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
    expect(routeGroupPolicyMatrix).toHaveProperty(RouteGroup.PUBLIC);
    expect(routeGroupPolicyMatrix).toHaveProperty(RouteGroup.AUTH);
    expect(routeGroupPolicyMatrix).toHaveProperty(RouteGroup.GAME);
    expect(routeGroupPolicyMatrix).toHaveProperty(RouteGroup.ADMIN);
  });

  it('allows anonymous for (public)', () => {
    const policy = routeGroupPolicyMatrix[RouteGroup.PUBLIC];
    expect(policy.actorType).toBe(ActorType.ANONYMOUS);
    expect(policy.requiredRoles).toHaveLength(0);
  });

  it('allows anonymous for (auth) but redirects authenticated', () => {
    const policy = routeGroupPolicyMatrix[RouteGroup.AUTH];
    expect(policy.actorType).toBe(ActorType.ANONYMOUS);
    expect(policy.requiredRoles).toHaveLength(0);
    expect(policy.redirectOnDeny).toBe('/game');
  });

  it('requires authentication for (game)', () => {
    const policy = routeGroupPolicyMatrix[RouteGroup.GAME];
    expect(policy.actorType).toBe(ActorType.AUTHENTICATED);
    expect(policy.requiredRoles).toHaveLength(0);
    expect(policy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
    expect(policy.redirectOnDeny).toBe('/login');
  });

  it('requires admin role for (admin)', () => {
    const policy = routeGroupPolicyMatrix[RouteGroup.ADMIN];
    expect(policy.actorType).toBe(ActorType.AUTHENTICATED);
    expect(policy.requiredRoles).toEqual(adminRoles);
    expect(policy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
    expect(policy.redirectOnDeny).toBe('/game');
  });

  it('has no implicit fallthrough - all route groups have explicit policy', () => {
    const routeGroups = [RouteGroup.PUBLIC, RouteGroup.AUTH, RouteGroup.GAME, RouteGroup.ADMIN];
    for (const group of routeGroups) {
      const policy = routeGroupPolicyMatrix[group];
      expect(policy).toBeDefined();
      expect(policy.actorType).toBeDefined();
      expect(Array.isArray(policy.requiredRoles)).toBe(true);
      expect(Array.isArray(policy.allowedTenantStatuses)).toBe(true);
    }
  });
});

describe('API Endpoint Policy Matrix', () => {
  it('defines policies for auth endpoints', () => {
    expect(apiEndpointPolicyMatrix['/api/v1/auth/me']).toBeDefined();
    expect(apiEndpointPolicyMatrix['/api/v1/auth/login']).toBeDefined();
    expect(apiEndpointPolicyMatrix['/api/v1/auth/logout']).toBeDefined();
    expect(apiEndpointPolicyMatrix['/api/v1/auth/refresh']).toBeDefined();
    expect(apiEndpointPolicyMatrix['/api/v1/auth/register']).toBeDefined();
  });

  it('defines policies for protected endpoints', () => {
    expect(apiEndpointPolicyMatrix['/api/v1/profile']).toBeDefined();
    expect(apiEndpointPolicyMatrix['/api/v1/games']).toBeDefined();
    expect(apiEndpointPolicyMatrix['/api/v1/admin/games']).toBeDefined();
    expect(apiEndpointPolicyMatrix['/api/v1/admin/tenants']).toBeDefined();
    expect(apiEndpointPolicyMatrix['/api/v1/admin/users']).toBeDefined();
  });

  it('requires active tenant for protected endpoints', () => {
    const profilePolicy = apiEndpointPolicyMatrix['/api/v1/profile'];
    expect(profilePolicy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
  });

  it('requires admin role for admin endpoints', () => {
    const adminUsersPolicy = apiEndpointPolicyMatrix['/api/v1/admin/users'];
    expect(adminUsersPolicy.requiredRoles).toEqual(adminRoles);
  });

  it('allows any tenant status for auth endpoints', () => {
    const loginPolicy = apiEndpointPolicyMatrix['/api/v1/auth/login'];
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
    expect(hasRequiredRole(undefined, adminRoles)).toBe(false);
  });

  it('returns true when user has required role', () => {
    expect(hasRequiredRole('tenant_admin', [Role.TENANT_ADMIN])).toBe(true);
    expect(hasRequiredRole('super_admin', adminRoles)).toBe(true);
    expect(hasRequiredRole('learner', [Role.LEARNER])).toBe(true);
  });

  it('performs case-insensitive matching', () => {
    expect(hasRequiredRole('TENANT_ADMIN', [Role.TENANT_ADMIN])).toBe(true);
    expect(hasRequiredRole('SUPER_ADMIN', adminRoles)).toBe(true);
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

describe('Role arrays', () => {
  it('adminRoles contains admin roles', () => {
    expect(adminRoles).toContain(Role.SUPER_ADMIN);
    expect(adminRoles).toContain(Role.TENANT_ADMIN);
    expect(adminRoles).not.toContain(Role.MANAGER);
    expect(adminRoles).not.toContain(Role.LEARNER);
  });

  it('allRoles contains all roles', () => {
    expect(allRoles).toHaveLength(5);
    expect(allRoles).toContain(Role.SUPER_ADMIN);
    expect(allRoles).toContain(Role.TENANT_ADMIN);
    expect(allRoles).toContain(Role.MANAGER);
    expect(allRoles).toContain(Role.TRAINER);
    expect(allRoles).toContain(Role.LEARNER);
  });
});
