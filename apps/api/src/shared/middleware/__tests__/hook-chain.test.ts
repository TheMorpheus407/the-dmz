import { describe, it, expect } from 'vitest';

import {
  HOOK_CHAIN_MANIFEST,
  getRequiredHooksForCategory,
  getCategoryForRoute,
  isRouteExcepted,
  isHookAllowed,
  getHookPosition,
  type RouteCategory,
  type HookName,
} from '../hook-chain-manifest.js';

describe('Hook Chain Manifest', () => {
  describe('getCategoryForRoute', () => {
    it('should categorize system health routes', () => {
      expect(getCategoryForRoute('/health')).toBe('system');
      expect(getCategoryForRoute('/ready')).toBe('system');
    });

    it('should categorize public auth routes', () => {
      expect(getCategoryForRoute('/auth/login')).toBe('public');
      expect(getCategoryForRoute('/auth/register')).toBe('public');
    });

    it('should categorize auth refresh routes', () => {
      expect(getCategoryForRoute('/auth/refresh')).toBe('auth');
    });

    it('should categorize admin routes', () => {
      expect(getCategoryForRoute('/auth/admin/users')).toBe('admin');
      expect(getCategoryForRoute('/auth/admin/something')).toBe('admin');
    });

    it('should categorize game routes', () => {
      expect(getCategoryForRoute('/game/session')).toBe('game');
      expect(getCategoryForRoute('/game/action')).toBe('game');
    });

    it('should categorize protected routes', () => {
      expect(getCategoryForRoute('/auth/me')).toBe('protected');
      expect(getCategoryForRoute('/auth/profile')).toBe('protected');
      expect(getCategoryForRoute('/auth/logout')).toBe('auth');
    });

    it('should default to public for unknown routes', () => {
      expect(getCategoryForRoute('/unknown')).toBe('public');
      expect(getCategoryForRoute('/api/v1/foo')).toBe('public');
    });
  });

  describe('getRequiredHooksForCategory', () => {
    it('should return no required hooks for public routes', () => {
      const hooks = getRequiredHooksForCategory('public');
      expect(hooks).toHaveLength(0);
    });

    it('should return no required hooks for system routes', () => {
      const hooks = getRequiredHooksForCategory('system');
      expect(hooks).toHaveLength(0);
    });

    it('should return auth, tenantContext, tenantStatusGuard for protected routes', () => {
      const hooks = getRequiredHooksForCategory('protected');
      expect(hooks).toHaveLength(3);
      expect(hooks.map((h) => h.hook)).toContain('authGuard');
      expect(hooks.map((h) => h.hook)).toContain('tenantContext');
      expect(hooks.map((h) => h.hook)).toContain('tenantStatusGuard');
    });

    it('should return correct positions for protected routes', () => {
      const hooks = getRequiredHooksForCategory('protected');
      const authGuard = hooks.find((h) => h.hook === 'authGuard');
      const tenantContext = hooks.find((h) => h.hook === 'tenantContext');
      const tenantStatusGuard = hooks.find((h) => h.hook === 'tenantStatusGuard');

      expect(authGuard?.position).toBe(1);
      expect(tenantContext?.position).toBe(2);
      expect(tenantStatusGuard?.position).toBe(3);
    });

    it('should return required hooks for admin routes', () => {
      const hooks = getRequiredHooksForCategory('admin');
      expect(hooks).toHaveLength(3);
      expect(hooks.map((h) => h.hook)).toContain('authGuard');
      expect(hooks.map((h) => h.hook)).toContain('tenantContext');
      expect(hooks.map((h) => h.hook)).toContain('tenantStatusGuard');
    });

    it('should return required hooks for game routes', () => {
      const hooks = getRequiredHooksForCategory('game');
      expect(hooks).toHaveLength(3);
    });
  });

  describe('isHookAllowed', () => {
    it('should return true for allowed hooks', () => {
      expect(isHookAllowed('authGuard')).toBe(true);
      expect(isHookAllowed('tenantContext')).toBe(true);
      expect(isHookAllowed('tenantStatusGuard')).toBe(true);
      expect(isHookAllowed('requirePermission')).toBe(true);
      expect(isHookAllowed('requireRole')).toBe(true);
      expect(isHookAllowed('requireMfaForSuperAdmin')).toBe(true);
      expect(isHookAllowed('validateCsrf')).toBe(true);
      expect(isHookAllowed('rateLimiter')).toBe(true);
    });

    it('should return false for unapproved hooks', () => {
      expect(isHookAllowed('customHook' as HookName)).toBe(false);
      expect(isHookAllowed('unknownMiddleware' as HookName)).toBe(false);
    });
  });

  describe('isRouteExcepted', () => {
    it('should return exception for /health/authenticated', () => {
      const exception = isRouteExcepted('/health/authenticated');
      expect(exception).toBeDefined();
      expect(exception?.reason).toContain('authenticated health check');
    });

    it('should return exception for /auth/refresh', () => {
      const exception = isRouteExcepted('/auth/refresh');
      expect(exception).toBeDefined();
    });

    it('should return undefined for non-excepted routes', () => {
      expect(isRouteExcepted('/auth/me')).toBeUndefined();
      expect(isRouteExcepted('/auth/profile')).toBeUndefined();
      expect(isRouteExcepted('/game/session')).toBeUndefined();
    });
  });

  describe('getHookPosition', () => {
    it('should return correct positions', () => {
      expect(getHookPosition('authGuard')).toBe(1);
      expect(getHookPosition('tenantContext')).toBe(2);
      expect(getHookPosition('tenantStatusGuard')).toBe(3);
    });

    it('should return undefined for hooks not in required list', () => {
      expect(getHookPosition('requirePermission')).toBeUndefined();
      expect(getHookPosition('validateCsrf')).toBeUndefined();
    });
  });

  describe('HOOK_CHAIN_MANIFEST', () => {
    it('should have valid version', () => {
      expect(HOOK_CHAIN_MANIFEST.version).toBeDefined();
      expect(HOOK_CHAIN_MANIFEST.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have all lifecycle stages', () => {
      const expectedStages = [
        'onRequest',
        'preParsing',
        'preValidation',
        'preHandler',
        'onSend',
        'onResponse',
        'onError',
      ];
      expect(HOOK_CHAIN_MANIFEST.lifecycleStages).toEqual(expectedStages);
    });

    it('should have all route categories', () => {
      const expectedCategories: RouteCategory[] = [
        'public',
        'auth',
        'protected',
        'game',
        'admin',
        'system',
      ];
      expect(HOOK_CHAIN_MANIFEST.categories).toEqual(expectedCategories);
    });

    it('should have hook source boundaries defined', () => {
      expect(HOOK_CHAIN_MANIFEST.hookSources.length).toBeGreaterThan(0);
      const authGuardSource = HOOK_CHAIN_MANIFEST.hookSources.find((h) => h.hook === 'authGuard');
      expect(authGuardSource).toBeDefined();
      expect(authGuardSource?.allowedSources).toContain('shared/middleware/authorization.ts');
    });

    it('should have required hooks with valid positions', () => {
      const positions = HOOK_CHAIN_MANIFEST.requiredHooks.map((h) => h.position);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(positions.length);
    });
  });
});
