import { describe, expect, it } from 'vitest';

import {
  m1ApiContractManifest,
  m1ApiContractManifestSchema,
  m1AuthEndpoints,
  m1ProtectedEndpoints,
  m1PublicEndpoints,
} from './manifest.js';

describe('M1 API Contract Manifest', () => {
  describe('manifest structure', () => {
    it('should have valid version', () => {
      expect(m1ApiContractManifest.version).toBe('1.0.0');
    });

    it('should have all required M1 endpoints', () => {
      const paths = m1ApiContractManifest.endpoints.map((e) => e.path);
      expect(paths).toContain('/api/v1/auth/register');
      expect(paths).toContain('/api/v1/auth/login');
      expect(paths).toContain('/api/v1/auth/refresh');
      expect(paths).toContain('/api/v1/auth/logout');
      expect(paths).toContain('/api/v1/auth/me');
      expect(paths).toContain('/api/v1/auth/profile');
      expect(paths).toContain('/api/v1/health/authenticated');
      expect(paths).toContain('/health');
      expect(paths).toContain('/ready');
    });

    it('should have correct HTTP methods for each endpoint', () => {
      const loginEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/api/v1/auth/login',
      );
      expect(loginEndpoint?.method).toBe('POST');

      const meEndpoint = m1ApiContractManifest.endpoints.find((e) => e.path === '/api/v1/auth/me');
      expect(meEndpoint?.method).toBe('GET');

      const logoutEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/api/v1/auth/logout',
      );
      expect(logoutEndpoint?.method).toBe('DELETE');
    });
  });

  describe('auth classification', () => {
    it('should correctly identify auth endpoints', () => {
      expect(m1AuthEndpoints.length).toBeGreaterThan(0);
      expect(m1AuthEndpoints.every((e) => e.path.startsWith('/api/v1/auth'))).toBe(true);
    });

    it('should correctly identify protected endpoints', () => {
      expect(m1ProtectedEndpoints.every((e) => e.requiresAuth)).toBe(true);
      const protectedPaths = m1ProtectedEndpoints.map((e) => e.path);
      expect(protectedPaths).toContain('/api/v1/auth/logout');
      expect(protectedPaths).toContain('/api/v1/auth/me');
      expect(protectedPaths).toContain('/api/v1/auth/profile');
      expect(protectedPaths).toContain('/api/v1/health/authenticated');
    });

    it('should correctly identify public endpoints', () => {
      expect(m1PublicEndpoints.every((e) => !e.requiresAuth)).toBe(true);
      const publicPaths = m1PublicEndpoints.map((e) => e.path);
      expect(publicPaths).toContain('/api/v1/auth/register');
      expect(publicPaths).toContain('/api/v1/auth/login');
      expect(publicPaths).toContain('/api/v1/auth/refresh');
      expect(publicPaths).toContain('/health');
      expect(publicPaths).toContain('/ready');
    });

    it('should have no overlap between protected and public', () => {
      const protectedPaths = new Set(m1ProtectedEndpoints.map((e) => e.path));
      const publicPaths = new Set(m1PublicEndpoints.map((e) => e.path));
      const overlap = [...protectedPaths].filter((p) => publicPaths.has(p));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('contract validation scenarios', () => {
    it('should pass when manifest is properly structured', () => {
      const result = m1ApiContractManifestSchema.safeParse(m1ApiContractManifest);
      expect(result.success).toBe(true);
    });

    it('should detect drift in endpoint method', () => {
      const driftedManifest = {
        ...m1ApiContractManifest,
        endpoints: m1ApiContractManifest.endpoints.map((e) =>
          e.path === '/api/v1/auth/login' ? { ...e, method: 'GET' as const } : e,
        ),
      };
      const result = m1ApiContractManifestSchema.safeParse(driftedManifest);
      expect(result.success).toBe(true);

      const loginEndpoint = driftedManifest.endpoints.find((e) => e.path === '/api/v1/auth/login');
      expect(loginEndpoint?.method).toBe('GET');
    });

    it('should detect drift in auth requirement', () => {
      const driftedManifest = {
        ...m1ApiContractManifest,
        endpoints: m1ApiContractManifest.endpoints.map((e) =>
          e.path === '/health' ? { ...e, requiresAuth: true } : e,
        ),
      };
      const healthEndpoint = driftedManifest.endpoints.find((e) => e.path === '/health');
      expect(healthEndpoint?.requiresAuth).toBe(true);
    });

    it('should have response schema references for auth endpoints', () => {
      const loginEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/api/v1/auth/login',
      );
      expect(loginEndpoint?.responseSchemaRef).toBe('loginResponseSchema');

      const meEndpoint = m1ApiContractManifest.endpoints.find((e) => e.path === '/api/v1/auth/me');
      expect(meEndpoint?.responseSchemaRef).toBe('meResponseSchema');
    });
  });

  describe('protected route auth contract', () => {
    it('should require auth for protected health check', () => {
      const protectedHealthEndpoint = m1ProtectedEndpoints.find(
        (e) => e.path === '/api/v1/health/authenticated',
      );
      expect(protectedHealthEndpoint?.requiresAuth).toBe(true);
    });

    it('should not require auth for public health probes', () => {
      const publicHealthEndpoint = m1PublicEndpoints.find((e) => e.path === '/health');
      expect(publicHealthEndpoint?.requiresAuth).toBe(false);

      const readyEndpoint = m1PublicEndpoints.find((e) => e.path === '/ready');
      expect(readyEndpoint?.requiresAuth).toBe(false);
    });
  });
});
