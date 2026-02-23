import { describe, expect, it } from 'vitest';

import {
  ROUTE_OWNERSHIP_MANIFEST,
  getRouteOwnership,
  isRouteOwnedByModule,
  getRouteOwner,
  isRouteRegistered,
} from '../index.js';

describe('Route Ownership Manifest', () => {
  describe('getRouteOwnership', () => {
    it('should return ownership for auth module', () => {
      const ownership = getRouteOwnership('auth');
      expect(ownership).toBeDefined();
      expect(ownership?.module).toBe('auth');
      expect(ownership?.routePrefix).toBe('/auth');
    });

    it('should return ownership for game module', () => {
      const ownership = getRouteOwnership('game');
      expect(ownership).toBeDefined();
      expect(ownership?.module).toBe('game');
      expect(ownership?.routePrefix).toBe('/game');
    });

    it('should return ownership for health module', () => {
      const ownership = getRouteOwnership('health');
      expect(ownership).toBeDefined();
      expect(ownership?.module).toBe('health');
      expect(ownership?.routePrefix).toBe('/health');
    });

    it('should return undefined for unknown module', () => {
      const ownership = getRouteOwnership('unknown');
      expect(ownership).toBeUndefined();
    });
  });

  describe('isRouteOwnedByModule', () => {
    it('should allow auth module to own routes under /auth prefix', () => {
      expect(isRouteOwnedByModule('auth', '/auth/login')).toBe(true);
      expect(isRouteOwnedByModule('auth', '/auth/register')).toBe(true);
      expect(isRouteOwnedByModule('auth', '/auth/mfa/status')).toBe(true);
    });

    it('should not allow auth module to own routes under /game prefix', () => {
      expect(isRouteOwnedByModule('auth', '/game/session')).toBe(false);
    });

    it('should not allow auth module to own routes under /health prefix', () => {
      expect(isRouteOwnedByModule('auth', '/health')).toBe(false);
    });

    it('should allow auth module to own /health/authenticated via exemption', () => {
      expect(isRouteOwnedByModule('auth', '/health/authenticated')).toBe(true);
    });

    it('should allow game module to own routes under /game prefix', () => {
      expect(isRouteOwnedByModule('game', '/game/session')).toBe(true);
    });

    it('should not allow game module to own routes under /auth prefix', () => {
      expect(isRouteOwnedByModule('game', '/auth/login')).toBe(false);
    });

    it('should allow health module to own routes under /health prefix', () => {
      expect(isRouteOwnedByModule('health', '/health')).toBe(true);
    });

    it('should allow health module to own /ready via exemption', () => {
      expect(isRouteOwnedByModule('health', '/ready')).toBe(true);
    });

    it('should not allow health module to own routes under /auth prefix', () => {
      expect(isRouteOwnedByModule('health', '/auth/login')).toBe(false);
    });
  });

  describe('getRouteOwner', () => {
    it('should return auth for /auth/login', () => {
      expect(getRouteOwner('/auth/login')).toBe('auth');
    });

    it('should return game for /game/session', () => {
      expect(getRouteOwner('/game/session')).toBe('game');
    });

    it('should return health for /health', () => {
      expect(getRouteOwner('/health')).toBe('health');
    });

    it('should return health for /ready (via exemption)', () => {
      expect(getRouteOwner('/ready')).toBe('health');
    });

    it('should return auth for /health/authenticated (via exemption)', () => {
      expect(getRouteOwner('/health/authenticated')).toBe('auth');
    });

    it('should return undefined for unknown route', () => {
      expect(getRouteOwner('/unknown/path')).toBeUndefined();
    });
  });

  describe('isRouteRegistered', () => {
    it('should return true for registered routes', () => {
      expect(isRouteRegistered('/auth/login')).toBe(true);
      expect(isRouteRegistered('/game/session')).toBe(true);
      expect(isRouteRegistered('/health')).toBe(true);
      expect(isRouteRegistered('/ready')).toBe(true);
    });

    it('should return false for unregistered routes', () => {
      expect(isRouteRegistered('/unknown/path')).toBe(false);
      expect(isRouteRegistered('/admin/users')).toBe(false);
    });
  });

  describe('manifest structure', () => {
    it('should have all required modules', () => {
      const modules = ROUTE_OWNERSHIP_MANIFEST.ownership.map((o) => o.module);
      expect(modules).toContain('auth');
      expect(modules).toContain('game');
      expect(modules).toContain('health');
    });

    it('should have routeTags for each module', () => {
      for (const entry of ROUTE_OWNERSHIP_MANIFEST.ownership) {
        expect(entry.routeTags).toBeDefined();
        expect(entry.routeTags.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty ownedRoutes for each module', () => {
      for (const entry of ROUTE_OWNERSHIP_MANIFEST.ownership) {
        expect(entry.ownedRoutes).toBeDefined();
        expect(entry.ownedRoutes.length).toBeGreaterThan(0);
      }
    });
  });
});
