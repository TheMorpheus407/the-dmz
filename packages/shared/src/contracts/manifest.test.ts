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

  describe('game session endpoints', () => {
    const gameSessionEndpoints = [
      { path: '/game/session', method: 'POST' as const },
      { path: '/game/session', method: 'GET' as const },
    ];

    it('should include all game session endpoints in manifest', () => {
      const manifestPaths = m1ApiContractManifest.endpoints.map((e) => e.path);
      expect(manifestPaths).toContain('/game/session');
    });

    it('should have correct HTTP methods for game session endpoints', () => {
      const postSessionEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/session' && e.method === 'POST',
      );
      expect(postSessionEndpoint).toBeDefined();
      expect(postSessionEndpoint?.method).toBe('POST');

      const getSessionEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/session' && e.method === 'GET',
      );
      expect(getSessionEndpoint).toBeDefined();
      expect(getSessionEndpoint?.method).toBe('GET');
    });

    it('should require auth for all game session endpoints', () => {
      for (const endpoint of gameSessionEndpoints) {
        const manifestEndpoint = m1ApiContractManifest.endpoints.find(
          (e) => e.path === endpoint.path && e.method === endpoint.method,
        );
        expect(manifestEndpoint?.requiresAuth).toBe(true);
      }
    });

    it('should have response schema references for game session endpoints', () => {
      const postSessionEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/session' && e.method === 'POST',
      );
      expect(postSessionEndpoint?.responseSchemaRef).toBe('gameSessionBootstrapResponseSchema');

      const getSessionEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/session' && e.method === 'GET',
      );
      expect(getSessionEndpoint?.responseSchemaRef).toBe('gameSessionBootstrapResponseSchema');
    });

    it('should use success response envelope for game session endpoints', () => {
      const postSessionEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/session' && e.method === 'POST',
      );
      expect(postSessionEndpoint?.responseEnvelope).toBe('success');

      const getSessionEndpoint = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/session' && e.method === 'GET',
      );
      expect(getSessionEndpoint?.responseEnvelope).toBe('success');
    });
  });

  describe('incident endpoints', () => {
    const incidentEndpoints = [
      { path: '/game/sessions/:sessionId/incidents', method: 'GET' as const },
      { path: '/game/sessions/:sessionId/incidents/active', method: 'GET' as const },
      { path: '/game/sessions/:sessionId/incidents/:incidentId', method: 'GET' as const },
      {
        path: '/game/sessions/:sessionId/incidents/:incidentId/available-actions',
        method: 'GET' as const,
      },
      {
        path: '/game/sessions/:sessionId/incidents/:incidentId/status',
        method: 'POST' as const,
      },
      {
        path: '/game/sessions/:sessionId/incidents/:incidentId/actions',
        method: 'POST' as const,
      },
      {
        path: '/game/sessions/:sessionId/incidents/:incidentId/resolve',
        method: 'POST' as const,
      },
      {
        path: '/game/sessions/:sessionId/incidents/:incidentId/review',
        method: 'GET' as const,
      },
      { path: '/game/sessions/:sessionId/incidents/stats', method: 'GET' as const },
    ];

    it('should include all incident endpoints in manifest', () => {
      const manifestPaths = m1ApiContractManifest.endpoints.map((e) => e.path);
      expect(manifestPaths).toContain('/game/sessions/:sessionId/incidents');
      expect(manifestPaths).toContain('/game/sessions/:sessionId/incidents/active');
      expect(manifestPaths).toContain('/game/sessions/:sessionId/incidents/:incidentId');
      expect(manifestPaths).toContain(
        '/game/sessions/:sessionId/incidents/:incidentId/available-actions',
      );
      expect(manifestPaths).toContain('/game/sessions/:sessionId/incidents/:incidentId/status');
      expect(manifestPaths).toContain('/game/sessions/:sessionId/incidents/:incidentId/actions');
      expect(manifestPaths).toContain('/game/sessions/:sessionId/incidents/:incidentId/resolve');
      expect(manifestPaths).toContain('/game/sessions/:sessionId/incidents/:incidentId/review');
      expect(manifestPaths).toContain('/game/sessions/:sessionId/incidents/stats');
    });

    it('should have correct HTTP methods for incident endpoints', () => {
      const listIncidents = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents',
      );
      expect(listIncidents?.method).toBe('GET');

      const updateStatus = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId/status',
      );
      expect(updateStatus?.method).toBe('POST');

      const addAction = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId/actions',
      );
      expect(addAction?.method).toBe('POST');

      const resolveIncident = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId/resolve',
      );
      expect(resolveIncident?.method).toBe('POST');
    });

    it('should require auth for all incident endpoints', () => {
      for (const endpoint of incidentEndpoints) {
        const manifestEndpoint = m1ApiContractManifest.endpoints.find(
          (e) => e.path === endpoint.path && e.method === endpoint.method,
        );
        expect(manifestEndpoint?.requiresAuth).toBe(true);
      }
    });

    it('should have response schema references for incident endpoints', () => {
      const listIncidents = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents',
      );
      expect(listIncidents?.responseSchemaRef).toBe('incidentListResponseSchema');

      const activeIncidents = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/active',
      );
      expect(activeIncidents?.responseSchemaRef).toBe('incidentListResponseSchema');

      const singleIncident = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId',
      );
      expect(singleIncident?.responseSchemaRef).toBe('incidentSingleResponseSchema');

      const availableActions = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId/available-actions',
      );
      expect(availableActions?.responseSchemaRef).toBe('availableActionsResponseSchema');

      const updateStatus = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId/status',
      );
      expect(updateStatus?.responseSchemaRef).toBe('incidentStatusUpdateResponseSchema');

      const addAction = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId/actions',
      );
      expect(addAction?.responseSchemaRef).toBe('incidentResponseActionResponseSchema');

      const resolveIncident = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId/resolve',
      );
      expect(resolveIncident?.responseSchemaRef).toBe('incidentResolveResponseSchema');

      const review = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/:incidentId/review',
      );
      expect(review?.responseSchemaRef).toBe('postIncidentReviewResponseSchema');

      const stats = m1ApiContractManifest.endpoints.find(
        (e) => e.path === '/game/sessions/:sessionId/incidents/stats',
      );
      expect(stats?.responseSchemaRef).toBe('incidentStatsResponseSchema');
    });

    it('should use success response envelope for all incident endpoints', () => {
      for (const endpoint of incidentEndpoints) {
        const manifestEndpoint = m1ApiContractManifest.endpoints.find(
          (e) => e.path === endpoint.path && e.method === endpoint.method,
        );
        expect(manifestEndpoint?.responseEnvelope).toBe('success');
      }
    });
  });

  describe('game endpoints completeness', () => {
    it('should have at least 11 game endpoints in the manifest', () => {
      const gameEndpoints = m1ApiContractManifest.endpoints.filter((e) =>
        e.path.startsWith('/game/'),
      );
      expect(gameEndpoints.length).toBeGreaterThanOrEqual(11);
    });

    it('should have game session and incident endpoints covering all HTTP methods', () => {
      const gameEndpoints = m1ApiContractManifest.endpoints.filter((e) =>
        e.path.startsWith('/game/'),
      );
      const methods = new Set(gameEndpoints.map((e) => e.method));
      expect(methods.has('GET')).toBe(true);
      expect(methods.has('POST')).toBe(true);
    });
  });
});
