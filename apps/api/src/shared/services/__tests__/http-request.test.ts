import { describe, expect, it } from 'vitest';

import type { HttpRequest } from '../http-request.js';

describe('http-request', () => {
  describe('HttpRequest interface', () => {
    it('should accept valid HttpRequest implementation', () => {
      const mockLog = {
        warn: () => {},
        error: () => {},
        info: () => {},
        debug: () => {},
      };

      const request: HttpRequest = {
        id: 'req-123',
        url: '/api/test',
        method: 'GET',
        routeOptions: { url: '/api/v1/test' },
        user: { userId: 'user-456' },
        tenantContext: { tenantId: 'tenant-789' },
        server: {
          config: { NODE_ENV: 'test' },
        },
        log: mockLog,
      };

      expect(request.id).toBe('req-123');
      expect(request.url).toBe('/api/test');
      expect(request.method).toBe('GET');
      expect(request.routeOptions?.url).toBe('/api/v1/test');
      expect(request.user?.userId).toBe('user-456');
      expect(request.tenantContext?.tenantId).toBe('tenant-789');
      expect(request.server.config.NODE_ENV).toBe('test');
    });

    it('should allow omitting optional properties', () => {
      const mockLog = {
        warn: () => {},
        error: () => {},
        info: () => {},
        debug: () => {},
      };

      const request: HttpRequest = {
        id: 'req-minimal',
        url: '/public',
        method: 'GET',
        log: mockLog,
      };

      expect(request.id).toBe('req-minimal');
      expect(request.routeOptions).toBeUndefined();
      expect(request.user).toBeUndefined();
      expect(request.tenantContext).toBeUndefined();
      expect(request.server.config.NODE_ENV).toBeUndefined();
    });

    it('should support all HTTP methods', () => {
      const mockLog = {
        warn: () => {},
        error: () => {},
        info: () => {},
        debug: () => {},
      };

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      methods.forEach((method) => {
        const request: HttpRequest = {
          id: `req-${method}`,
          url: '/api/test',
          method,
          log: mockLog,
        };
        expect(request.method).toBe(method);
      });
    });
  });
});
