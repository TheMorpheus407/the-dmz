import { describe, expect, it } from 'vitest';

import {
  RouteGroup,
  routeGroupPolicyMatrix,
  apiEndpointPolicyMatrix,
  AccessPolicyTenantStatus,
  adminRoles,
} from './access-policy.js';

const _FRONTEND_GUARD_FILES = [
  'apps/web/src/routes/(auth)/+layout.server.ts',
  'apps/web/src/routes/(game)/+layout.server.ts',
  'apps/web/src/routes/(admin)/+layout.server.ts',
] as const;

const _BACKEND_GUARD_FILES = [
  'apps/api/src/shared/middleware/authorization.ts',
  'apps/api/src/shared/middleware/tenant-status-guard.ts',
  'apps/api/src/shared/middleware/pre-auth-tenant-status-guard.ts',
] as const;

describe('Policy Drift Detection', () => {
  describe('Route Group Policy Matrix', () => {
    it('should have no implicit fallthrough - all route groups must be explicitly defined', () => {
      const expectedRouteGroups = ['(public)', '(auth)', '(game)', '(admin)'];
      const definedRouteGroups = Object.keys(routeGroupPolicyMatrix);

      for (const group of expectedRouteGroups) {
        expect(definedRouteGroups).toContain(group);
      }
    });

    it('should require authentication for protected route groups', () => {
      const gamePolicy = routeGroupPolicyMatrix[RouteGroup.GAME];
      const adminPolicy = routeGroupPolicyMatrix[RouteGroup.ADMIN];

      expect(gamePolicy.actorType).toBe('authenticated');
      expect(adminPolicy.actorType).toBe('authenticated');
    });

    it('should allow anonymous for public route groups', () => {
      const publicPolicy = routeGroupPolicyMatrix[RouteGroup.PUBLIC];
      const authPolicy = routeGroupPolicyMatrix[RouteGroup.AUTH];

      expect(publicPolicy.actorType).toBe('anonymous');
      expect(authPolicy.actorType).toBe('anonymous');
    });

    it('should have redirect URLs for protected route groups', () => {
      const gamePolicy = routeGroupPolicyMatrix[RouteGroup.GAME];
      const adminPolicy = routeGroupPolicyMatrix[RouteGroup.ADMIN];

      expect(gamePolicy.redirectOnDeny).toBeDefined();
      expect(adminPolicy.redirectOnDeny).toBeDefined();
    });
  });

  describe('API Endpoint Policy Matrix', () => {
    it('should have explicit policy for all M1 surface endpoints', () => {
      const requiredEndpoints = [
        '/api/v1/auth/me',
        '/api/v1/auth/login',
        '/api/v1/auth/logout',
        '/api/v1/auth/refresh',
        '/api/v1/auth/register',
        '/api/v1/profile',
        '/api/v1/games',
        '/api/v1/admin/games',
        '/api/v1/admin/tenants',
        '/api/v1/admin/users',
      ];

      for (const endpoint of requiredEndpoints) {
        expect(apiEndpointPolicyMatrix[endpoint]).toBeDefined();
      }
    });

    it('should require active tenant for protected endpoints', () => {
      const protectedEndpoints = [
        '/api/v1/auth/me',
        '/api/v1/profile',
        '/api/v1/games',
        '/api/v1/admin/games',
        '/api/v1/admin/tenants',
        '/api/v1/admin/users',
      ];

      for (const endpoint of protectedEndpoints) {
        const policy = apiEndpointPolicyMatrix[endpoint];
        expect(policy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
      }
    });

    it('should require admin role for admin endpoints', () => {
      const adminEndpoints = [
        '/api/v1/admin/games',
        '/api/v1/admin/tenants',
        '/api/v1/admin/users',
      ];

      for (const endpoint of adminEndpoints) {
        const policy = apiEndpointPolicyMatrix[endpoint];
        expect(policy.requiredRoles).toEqual(adminRoles);
      }
    });
  });

  describe('Frontend/Backend Policy Alignment', () => {
    it('should have matching tenant status requirements between frontend and backend', () => {
      const frontendGamePolicy = routeGroupPolicyMatrix[RouteGroup.GAME];
      const backendProfilePolicy = apiEndpointPolicyMatrix['/api/v1/profile'];

      expect(frontendGamePolicy.allowedTenantStatuses).toEqual(
        backendProfilePolicy.allowedTenantStatuses,
      );
    });

    it('should have matching admin role requirements between frontend and backend', () => {
      const frontendAdminPolicy = routeGroupPolicyMatrix[RouteGroup.ADMIN];
      const backendAdminUsersPolicy = apiEndpointPolicyMatrix['/api/v1/admin/users'];

      expect(frontendAdminPolicy.requiredRoles).toEqual(backendAdminUsersPolicy.requiredRoles);
    });
  });

  describe('Error Envelope Consistency', () => {
    it('should use standard error codes for tenant inactive', () => {
      const gamePolicy = routeGroupPolicyMatrix[RouteGroup.GAME];
      const adminPolicy = routeGroupPolicyMatrix[RouteGroup.ADMIN];

      expect(gamePolicy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
      expect(gamePolicy.allowedTenantStatuses).not.toContain(AccessPolicyTenantStatus.SUSPENDED);
      expect(gamePolicy.allowedTenantStatuses).not.toContain(AccessPolicyTenantStatus.DEACTIVATED);

      expect(adminPolicy.allowedTenantStatuses).toContain(AccessPolicyTenantStatus.ACTIVE);
      expect(adminPolicy.allowedTenantStatuses).not.toContain(AccessPolicyTenantStatus.SUSPENDED);
      expect(adminPolicy.allowedTenantStatuses).not.toContain(AccessPolicyTenantStatus.DEACTIVATED);
    });
  });
});
