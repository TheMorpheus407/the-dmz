import { describe, expect, it, vi, beforeEach } from 'vitest';

import { buildCorsOriginSet, configureCors, createCorsConfig, type CorsConfig } from '../cors.js';

import type { FastifyInstance } from 'fastify';

describe('CORS configurator', () => {
  describe('buildCorsOriginSet', () => {
    it('should create a set from cors origins list', () => {
      const origins = buildCorsOriginSet(
        ['http://localhost:3000', 'https://example.com'],
        'production',
      );
      expect(origins.has('http://localhost:3000')).toBe(true);
      expect(origins.has('https://example.com')).toBe(true);
    });

    it('should add 127.0.0.1 variants in non-production', () => {
      const origins = buildCorsOriginSet(['http://localhost:3000'], 'development');
      expect(origins.has('http://localhost:3000')).toBe(true);
      expect(origins.has('http://127.0.0.1:3000')).toBe(true);
    });

    it('should not add 127.0.0.1 variants in production', () => {
      const origins = buildCorsOriginSet(['http://localhost:3000'], 'production');
      expect(origins.has('http://localhost:3000')).toBe(true);
      expect(origins.has('http://127.0.0.1:3000')).toBe(false);
    });

    it('should handle empty corsOriginsList', () => {
      const origins = buildCorsOriginSet([], 'development');
      expect(origins.size).toBe(0);
    });

    it('should handle multiple localhost variants', () => {
      const origins = buildCorsOriginSet(
        ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
        'development',
      );
      expect(origins.has('http://localhost:3000')).toBe(true);
      expect(origins.has('http://localhost:5173')).toBe(true);
      expect(origins.has('http://localhost:8080')).toBe(true);
      expect(origins.has('http://127.0.0.1:3000')).toBe(true);
      expect(origins.has('http://127.0.0.1:5173')).toBe(true);
      expect(origins.has('http://127.0.0.1:8080')).toBe(true);
    });

    it('should add 127.0.0.1 variants in staging environment', () => {
      const origins = buildCorsOriginSet(['http://localhost:3000'], 'staging');
      expect(origins.has('http://localhost:3000')).toBe(true);
      expect(origins.has('http://127.0.0.1:3000')).toBe(true);
    });

    it('should add 127.0.0.1 variants in test environment', () => {
      const origins = buildCorsOriginSet(['http://localhost:3000'], 'test');
      expect(origins.has('http://localhost:3000')).toBe(true);
      expect(origins.has('http://127.0.0.1:3000')).toBe(true);
    });

    it('should handle origins without protocol', () => {
      const origins = buildCorsOriginSet(['localhost:3000'], 'production');
      expect(origins.has('localhost:3000')).toBe(true);
    });

    it('should handle origins with paths', () => {
      const origins = buildCorsOriginSet(['https://example.com/app'], 'production');
      expect(origins.has('https://example.com/app')).toBe(true);
    });
  });

  describe('createCorsConfig', () => {
    it('should create CorsConfig with correct structure', () => {
      const config = createCorsConfig(['http://localhost:3000'], 'production');

      expect(config).toHaveProperty('allowedOrigins');
      expect(config).toHaveProperty('credentials');
      expect(config.credentials).toBe(true);
    });

    it('should return credentials default as true', () => {
      const config = createCorsConfig(['http://localhost:3000'], 'production');
      expect(config.credentials).toBe(true);
    });

    it('should handle empty origins list', () => {
      const config = createCorsConfig([], 'production');
      expect(config.allowedOrigins.size).toBe(0);
      expect(config.credentials).toBe(true);
    });
  });

  describe('configureCors', () => {
    let mockApp: FastifyInstance;
    let mockRegister: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockRegister = vi.fn().mockResolvedValue(undefined);
      mockApp = {
        register: mockRegister,
      } as unknown as FastifyInstance;
    });

    it('should register CORS plugin with correct options', async () => {
      const corsConfig: CorsConfig = {
        allowedOrigins: new Set(['http://localhost:3000']),
        credentials: true,
      };

      await configureCors(mockApp, corsConfig);

      expect(mockRegister).toHaveBeenCalledTimes(1);
      const options = mockRegister.mock.calls[0][1];

      expect(options).toHaveProperty('origin');
      expect(options).toHaveProperty('credentials');
      expect(options.credentials).toBe(true);
    });

    it('should allow request with valid origin', async () => {
      const corsConfig: CorsConfig = {
        allowedOrigins: new Set(['http://localhost:3000']),
        credentials: true,
      };

      await configureCors(mockApp, corsConfig);

      const options = mockRegister.mock.calls[0][1];
      const originCallback = options.origin as (
        origin: string,
        callback: (err: Error | null, allow: boolean) => void,
      ) => void;

      let allowRequest: boolean | undefined;
      originCallback('http://localhost:3000', (err, allow) => {
        allowRequest = allow;
      });

      expect(allowRequest).toBe(true);
    });

    it('should deny request with invalid origin', async () => {
      const corsConfig: CorsConfig = {
        allowedOrigins: new Set(['http://localhost:3000']),
        credentials: true,
      };

      await configureCors(mockApp, corsConfig);

      const options = mockRegister.mock.calls[0][1];
      const originCallback = options.origin as (
        origin: string,
        callback: (err: Error | null, allow: boolean) => void,
      ) => void;

      let allowRequest: boolean | undefined;
      originCallback('http://evil.com', (err, allow) => {
        allowRequest = allow;
      });

      expect(allowRequest).toBe(false);
    });

    it('should allow request with no origin (same-origin)', async () => {
      const corsConfig: CorsConfig = {
        allowedOrigins: new Set(['http://localhost:3000']),
        credentials: true,
      };

      await configureCors(mockApp, corsConfig);

      const options = mockRegister.mock.calls[0][1];
      const originCallback = options.origin as (
        origin: string | undefined,
        callback: (err: Error | null, allow: boolean) => void,
      ) => void;

      let allowRequest: boolean | undefined;
      originCallback(undefined, (err, allow) => {
        allowRequest = allow;
      });

      expect(allowRequest).toBe(true);
    });

    it('should pass credentials from config', async () => {
      const corsConfig: CorsConfig = {
        allowedOrigins: new Set(['http://localhost:3000']),
        credentials: false,
      };

      await configureCors(mockApp, corsConfig);

      const options = mockRegister.mock.calls[0][1];
      expect(options.credentials).toBe(false);
    });
  });
});
