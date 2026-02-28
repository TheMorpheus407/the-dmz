import crypto from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { FastifyRequest } from 'fastify';

describe('Idempotency Middleware', () => {
  describe('isIdempotencyEnabledRoute', () => {
    it('should return false for GET requests', () => {
      const mockRequest = {
        method: 'GET',
        routeOptions: { url: '/api/v1/game/session' },
        url: '/api/v1/game/session',
      } as unknown as FastifyRequest;

      const result = isIdempotencyEnabledRoute(mockRequest);
      expect(result).toBe(false);
    });

    it('should return false for exempt paths', () => {
      const exemptPaths = ['/health', '/ready', '/auth/refresh', '/auth/login'];

      for (const path of exemptPaths) {
        const mockRequest = {
          method: 'POST',
          routeOptions: { url: path },
          url: path,
        } as unknown as FastifyRequest;

        const result = isIdempotencyEnabledRoute(mockRequest);
        expect(result).toBe(false);
      }
    });

    it('should return true for POST requests', () => {
      const mockRequest = {
        method: 'POST',
        routeOptions: { url: '/api/v1/game/session' },
        url: '/api/v1/game/session',
      } as unknown as FastifyRequest;

      const result = isIdempotencyEnabledRoute(mockRequest);
      expect(result).toBe(true);
    });

    it('should return true for PUT requests', () => {
      const mockRequest = {
        method: 'PUT',
        routeOptions: { url: '/api/v1/items/123' },
        url: '/api/v1/items/123',
      } as unknown as FastifyRequest;

      const result = isIdempotencyEnabledRoute(mockRequest);
      expect(result).toBe(true);
    });

    it('should return true for PATCH requests', () => {
      const mockRequest = {
        method: 'PATCH',
        routeOptions: { url: '/api/v1/auth/profile' },
        url: '/api/v1/auth/profile',
      } as unknown as FastifyRequest;

      const result = isIdempotencyEnabledRoute(mockRequest);
      expect(result).toBe(true);
    });
  });

  describe('hashKey', () => {
    it('should produce consistent hash for same input', () => {
      const key1 = hashKey('test-key-12345678');
      const key2 = hashKey('test-key-12345678');
      expect(key1).toBe(key2);
    });

    it('should produce different hashes for different inputs', () => {
      const key1 = hashKey('test-key-12345678');
      const key2 = hashKey('test-key-87654321');
      expect(key1).not.toBe(key2);
    });

    it('should produce 64 character hash', () => {
      const result = hashKey('test-key-12345678');
      expect(result).toHaveLength(64);
    });
  });

  describe('extractTenantId', () => {
    it('should extract tenant ID from request.tenantContext', () => {
      const mockRequest = {
        tenantContext: {
          tenantId: '550e8400-e29b-41d4-a716-446655440000',
        },
      } as unknown as FastifyRequest;

      const result = extractTenantId(mockRequest);
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return undefined when tenantContext is missing', () => {
      const mockRequest = {
        tenantContext: undefined,
      } as unknown as FastifyRequest;

      const result = extractTenantId(mockRequest);
      expect(result).toBeUndefined();
    });
  });

  describe('extractActorId', () => {
    it('should extract actor ID from request.user', () => {
      const mockRequest = {
        user: {
          userId: '550e8400-e29b-41d4-a716-446655440001',
        },
      } as unknown as FastifyRequest;

      const result = extractActorId(mockRequest);
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should return null when user is missing', () => {
      const mockRequest = {
        user: undefined,
      } as unknown as FastifyRequest;

      const result = extractActorId(mockRequest);
      expect(result).toBeNull();
    });
  });
});

function isIdempotencyEnabledRoute(request: FastifyRequest): boolean {
  const method = request.method.toUpperCase();
  const route = request.routeOptions?.url || request.url;

  const requiredForMethods = ['POST', 'PUT', 'PATCH'];
  if (!requiredForMethods.includes(method)) {
    return false;
  }

  const exemptPaths = ['/health', '/ready', '/auth/refresh', '/auth/login'];
  if (exemptPaths.some((path) => route.startsWith(path))) {
    return false;
  }

  return true;
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').substring(0, 64);
}

function extractTenantId(request: FastifyRequest): string | undefined {
  if (request.tenantContext?.tenantId) {
    return request.tenantContext.tenantId;
  }
  return undefined;
}

function extractActorId(request: FastifyRequest): string | null {
  if (request.user?.userId) {
    return request.user.userId;
  }
  return null;
}
