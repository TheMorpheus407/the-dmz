import { describe, expect, it, vi } from 'vitest';

import {
  logAuthorizationDenial,
  logInsufficientPermissions,
  logMissingPermissionDeclaration,
  logNoRoles,
  type DenialReason,
} from '../authorization-logging.service.js';

import type { HttpRequest } from '../http-request.js';

const createMockHttpRequest = (overrides: Partial<HttpRequest> = {}): HttpRequest => {
  const mockLog = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  return {
    id: 'test-request-id',
    url: '/test-route',
    method: 'GET',
    routeOptions: undefined,
    user: undefined,
    tenantContext: undefined,
    server: {
      config: {
        NODE_ENV: 'test',
      },
    },
    log: mockLog,
    ...overrides,
  } as HttpRequest;
};

describe('authorization-logging.service', () => {
  describe('logAuthorizationDenial', () => {
    it('logs authorization denial with request metadata', () => {
      const request = createMockHttpRequest({
        id: 'req-123',
        url: '/api/admin/users',
        method: 'DELETE',
        user: { userId: 'user-456' },
        tenantContext: { tenantId: 'tenant-789' },
      });

      logAuthorizationDenial(request, 'insufficient_permissions');

      expect(request.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123',
          tenantId: 'tenant-789',
          userId: 'user-456',
          route: '/api/admin/users',
          method: 'DELETE',
          denialReason: 'insufficient_permissions',
        }),
        'Authorization denied: insufficient_permissions',
      );
    });

    it('uses routeOptions.url when available', () => {
      const request = createMockHttpRequest({
        url: '/original-url',
        routeOptions: { url: '/api/v2/named-route' },
        method: 'POST',
      });

      logAuthorizationDenial(request, 'no_roles');

      expect(request.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          route: '/api/v2/named-route',
        }),
        expect.any(String),
      );
    });

    it('redacts userId and tenantId in production', () => {
      const request = createMockHttpRequest({
        server: { config: { NODE_ENV: 'production' } },
        user: { userId: 'user-123' },
        tenantContext: { tenantId: 'tenant-456' },
        routeOptions: { url: '/protected' },
        method: 'GET',
      });

      logAuthorizationDenial(request, 'insufficient_permissions', {
        redactSensitiveData: true,
      });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.userId).toBeUndefined();
      expect(logCall.tenantId).toBeUndefined();
    });

    it('includes userId and tenantId when redactSensitiveData is false in production', () => {
      const request = createMockHttpRequest({
        server: { config: { NODE_ENV: 'production' } },
        user: { userId: 'user-123' },
        tenantContext: { tenantId: 'tenant-456' },
        routeOptions: { url: '/protected' },
        method: 'GET',
      });

      logAuthorizationDenial(request, 'insufficient_permissions', {
        redactSensitiveData: false,
      });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.userId).toBe('user-123');
      expect(logCall.tenantId).toBe('tenant-456');
    });

    it('respects includeUserId option', () => {
      const request = createMockHttpRequest({
        user: { userId: 'user-123' },
        tenantContext: { tenantId: 'tenant-456' },
        routeOptions: { url: '/test' },
        method: 'GET',
      });

      logAuthorizationDenial(request, 'insufficient_permissions', {
        includeUserId: false,
        includeTenantId: true,
      });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.userId).toBeUndefined();
      expect(logCall.tenantId).toBe('tenant-456');
    });

    it('respects includeTenantId option', () => {
      const request = createMockHttpRequest({
        user: { userId: 'user-123' },
        tenantContext: { tenantId: 'tenant-456' },
        routeOptions: { url: '/test' },
        method: 'GET',
      });

      logAuthorizationDenial(request, 'insufficient_permissions', {
        includeUserId: true,
        includeTenantId: false,
      });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.userId).toBe('user-123');
      expect(logCall.tenantId).toBeUndefined();
    });

    it('works without user or tenantContext', () => {
      const request = createMockHttpRequest({
        user: undefined,
        tenantContext: undefined,
        routeOptions: { url: '/public' },
        method: 'GET',
      });

      expect(() => logAuthorizationDenial(request, 'no_roles')).not.toThrow();
      expect(request.log.warn).toHaveBeenCalled();
    });
  });

  describe('logInsufficientPermissions', () => {
    it('logs insufficient permissions with required and granted permissions', () => {
      const request = createMockHttpRequest({
        id: 'req-abc',
        url: '/api/resource',
        method: 'POST',
        user: { userId: 'user-xyz' },
        tenantContext: { tenantId: 'tenant-abc' },
      });

      const requiredPermissions = ['admin:manage', 'user:write'];
      const grantedPermissions = ['user:read'];

      logInsufficientPermissions(request, {
        requiredPermissions,
        grantedPermissions,
        evaluator: 'allOf',
      });

      expect(request.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-abc',
          tenantId: 'tenant-abc',
          userId: 'user-xyz',
          route: '/api/resource',
          method: 'POST',
          denialReason: 'insufficient_permissions',
          requiredPermissions,
          grantedPermissions,
          evaluator: 'allOf',
        }),
        'Authorization denied: insufficient permissions',
      );
    });

    it('redacts permissions in production by default', () => {
      const request = createMockHttpRequest({
        server: { config: { NODE_ENV: 'production' } },
        user: { userId: 'user-123' },
        tenantContext: { tenantId: 'tenant-456' },
        routeOptions: { url: '/api/admin' },
        method: 'GET',
      });

      logInsufficientPermissions(request, {
        requiredPermissions: ['admin:manage'],
        grantedPermissions: ['user:read'],
        evaluator: 'allOf',
      });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.requiredPermissions).toBeUndefined();
      expect(logCall.grantedPermissions).toBeUndefined();
    });

    it('includes permissions when redactSensitiveData is false', () => {
      const request = createMockHttpRequest({
        server: { config: { NODE_ENV: 'production' } },
        user: { userId: 'user-123' },
        tenantContext: { tenantId: 'tenant-456' },
        routeOptions: { url: '/api/admin' },
        method: 'GET',
      });

      logInsufficientPermissions(
        request,
        {
          requiredPermissions: ['admin:manage'],
          grantedPermissions: ['user:read'],
          evaluator: 'allOf',
        },
        {
          redactSensitiveData: false,
        },
      );

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.requiredPermissions).toEqual(['admin:manage']);
      expect(logCall.grantedPermissions).toEqual(['user:read']);
    });

    it('handles anyOf evaluator', () => {
      const request = createMockHttpRequest({
        routeOptions: { url: '/api/test' },
        method: 'GET',
      });

      logInsufficientPermissions(request, {
        requiredPermissions: ['admin:manage', 'user:write'],
        grantedPermissions: ['user:write'],
        evaluator: 'anyOf',
      });

      expect(request.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluator: 'anyOf',
        }),
        expect.any(String),
      );
    });
  });

  describe('logMissingPermissionDeclaration', () => {
    it('logs missing permission declaration error', () => {
      const request = createMockHttpRequest({
        id: 'req-def',
        url: '/api/unprotected-route',
        method: 'GET',
        routeOptions: undefined,
      });

      logMissingPermissionDeclaration(request);

      expect(request.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-def',
          route: '/api/unprotected-route',
          method: 'GET',
          denialReason: 'missing_permission_declaration',
        }),
        'Protected route missing permission declaration',
      );
    });

    it('uses routeOptions.url when available', () => {
      const request = createMockHttpRequest({
        url: '/fallback-url',
        routeOptions: { url: '/api/v1/named' },
        method: 'POST',
      });

      logMissingPermissionDeclaration(request);

      expect(request.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          route: '/api/v1/named',
        }),
        expect.any(String),
      );
    });

    it('works without routeOptions', () => {
      const request = createMockHttpRequest({
        url: '/simple-path',
        routeOptions: undefined,
        method: 'DELETE',
      });

      expect(() => logMissingPermissionDeclaration(request)).not.toThrow();
      expect(request.log.error).toHaveBeenCalled();
    });
  });

  describe('logNoRoles', () => {
    it('logs no roles denial with user and tenant info', () => {
      const request = createMockHttpRequest({
        id: 'req-ghi',
        url: '/api/role-protected',
        method: 'PUT',
        user: { userId: 'user-789' },
        tenantContext: { tenantId: 'tenant-012' },
      });

      logNoRoles(request);

      expect(request.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-ghi',
          tenantId: 'tenant-012',
          userId: 'user-789',
          route: '/api/role-protected',
          method: 'PUT',
          denialReason: 'no_roles',
        }),
        'Authorization denied: user has no roles assigned',
      );
    });

    it('redacts user and tenant in production', () => {
      const request = createMockHttpRequest({
        server: { config: { NODE_ENV: 'production' } },
        user: { userId: 'user-secret' },
        tenantContext: { tenantId: 'tenant-secret' },
        routeOptions: { url: '/role-route' },
        method: 'GET',
      });

      logNoRoles(request, { redactSensitiveData: true });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.userId).toBeUndefined();
      expect(logCall.tenantId).toBeUndefined();
    });

    it('includes user and tenant when not redacting', () => {
      const request = createMockHttpRequest({
        server: { config: { NODE_ENV: 'production' } },
        user: { userId: 'user-visible' },
        tenantContext: { tenantId: 'tenant-visible' },
        routeOptions: { url: '/role-route' },
        method: 'GET',
      });

      logNoRoles(request, { redactSensitiveData: false });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.userId).toBe('user-visible');
      expect(logCall.tenantId).toBe('tenant-visible');
    });

    it('works without user or tenantContext', () => {
      const request = createMockHttpRequest({
        user: undefined,
        tenantContext: undefined,
        routeOptions: { url: '/no-auth-route' },
        method: 'GET',
      });

      expect(() => logNoRoles(request)).not.toThrow();
      expect(request.log.warn).toHaveBeenCalled();
    });
  });

  describe('DenialReason type', () => {
    it('accepts valid denial reasons', () => {
      const request = createMockHttpRequest({
        routeOptions: { url: '/test' },
        method: 'GET',
      });

      const reasons: DenialReason[] = [
        'insufficient_permissions',
        'missing_permission_declaration',
        'no_roles',
      ];

      reasons.forEach((reason) => {
        expect(() => logAuthorizationDenial(request, reason)).not.toThrow();
      });
    });
  });

  describe('AuthorizationLoggingOptions', () => {
    it('accepts partial options and merges with defaults', () => {
      const request = createMockHttpRequest({
        server: { config: { NODE_ENV: 'development' } },
        user: { userId: 'user-test' },
        tenantContext: { tenantId: 'tenant-test' },
        routeOptions: { url: '/test' },
        method: 'GET',
      });

      logAuthorizationDenial(request, 'insufficient_permissions', {
        redactSensitiveData: false,
      });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.userId).toBe('user-test');
      expect(logCall.tenantId).toBe('tenant-test');
    });

    it('allows overriding includeUserId and includeTenantId independently', () => {
      const request = createMockHttpRequest({
        user: { userId: 'user-only' },
        tenantContext: { tenantId: 'tenant-only' },
        routeOptions: { url: '/test' },
        method: 'GET',
      });

      logAuthorizationDenial(request, 'no_roles', {
        includeUserId: true,
        includeTenantId: false,
      });

      const logCall = request.log.warn.mock.calls[0][0];
      expect(logCall.userId).toBe('user-only');
      expect(logCall.tenantId).toBeUndefined();
    });
  });
});
