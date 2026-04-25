import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  };
};

const mockPlatform = {
  id: 'platform-id',
  platformId: 'canvas',
  tenantId: 'tenant-123',
  name: 'Canvas LMS',
  platformUrl: 'https://canvas.example.edu',
  clientId: 'test-client-id',
  deploymentId: 'deployment-1',
  publicKeysetUrl: 'https://canvas.example.edu/.well-known/jwks.json',
  authTokenUrl: 'https://canvas.example.edu/login/oauth2/token',
  authLoginUrl: 'https://canvas.example.edu/api/oidc/login',
  toolUrl: 'https://dmz.thearchive.game/lti/launch',
};

const mockStateData = {
  platformId: mockPlatform.platformId,
  codeVerifier: 'test-code-verifier',
  redirectUri: 'https://dmz.thearchive.game/lti/login',
};

vi.mock('../lti.service.js', () => ({
  initiateOidcLogin: vi.fn(),
  validateAndConsumeNonce: vi.fn().mockResolvedValue(true),
  validateAndConsumeState: vi.fn().mockResolvedValue(mockStateData),
  getLtiPlatformByInternalId: vi.fn().mockResolvedValue(mockPlatform),
  createLtiSession: vi.fn().mockResolvedValue({
    sessionId: 'session-id',
    tenantId: mockPlatform.tenantId,
    platformId: mockPlatform.platformId,
    launchId: 'launch-123',
  }),
  getLtiSessionByLaunchId: vi.fn(),
  getLtiLineItemByIdOnly: vi.fn(),
  createLtiLineItem: vi.fn(),
  createLtiScore: vi.fn(),
  listLtiLineItems: vi.fn().mockResolvedValue([]),
  getLtiLineItemByResourceLinkId: vi.fn(),
  createLtiDeepLinkContent: vi.fn(),
  generateState: vi.fn().mockReturnValue('launch-123'),
  verifyLtiJwt: vi.fn().mockResolvedValue({
    payload: {
      sub: 'user-123',
      nonce: 'test-nonce',
      'https://purl.imsglobal.org/spec/lti/claim/resource_link': { id: 'resource-link-1' },
      'https://purl.imsglobal.org/spec/lti/claim/context': { id: 'context-1' },
      'https://purl.imsglobal.org/spec/lti/claim/roles': ['Learner'],
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deployment-1',
    },
  }),
  getLtiPlatformByUrl: vi.fn(),
  getLtiPlatformByClientId: vi.fn(),
  generateNonce: vi.fn(),
  createNonce: vi.fn(),
  createState: vi.fn(),
  getJWKSet: vi.fn(),
  refreshJWKSet: vi.fn(),
  cleanupExpiredNonces: vi.fn(),
  cleanupExpiredStates: vi.fn(),
}));

describe('LTI token exchange network error handling', () => {
  const app = buildApp(createTestConfig());

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /lti/login', () => {
    it('returns 503 when fetch throws a network error (ECONNREFUSED)', async () => {
      const originalFetch = globalThis.fetch;
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      try {
        const response = await app.inject({
          method: 'POST',
          url: '/lti/login',
          payload: {
            code: 'authorization-code',
            state: 'valid-state',
            target_link_uri: 'https://dmz.thearchive.game/lti/login',
          },
        });

        expect(response.statusCode).toBe(503);
        const body = response.json() as {
          success: boolean;
          error: { code: string; message: string };
        };
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
      } finally {
        vi.stubGlobal('fetch', originalFetch);
      }
    });

    it('returns 503 when fetch throws a network error (ENOTFOUND)', async () => {
      const originalFetch = globalThis.fetch;
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ENOTFOUND')));

      try {
        const response = await app.inject({
          method: 'POST',
          url: '/lti/login',
          payload: {
            code: 'authorization-code',
            state: 'valid-state',
            target_link_uri: 'https://dmz.thearchive.game/lti/login',
          },
        });

        expect(response.statusCode).toBe(503);
        const body = response.json() as {
          success: boolean;
          error: { code: string; message: string };
        };
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
      } finally {
        vi.stubGlobal('fetch', originalFetch);
      }
    });

    it('returns 503 when fetch throws a network error (ETIMEDOUT)', async () => {
      const originalFetch = globalThis.fetch;
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ETIMEDOUT')));

      try {
        const response = await app.inject({
          method: 'POST',
          url: '/lti/login',
          payload: {
            code: 'authorization-code',
            state: 'valid-state',
            target_link_uri: 'https://dmz.thearchive.game/lti/login',
          },
        });

        expect(response.statusCode).toBe(503);
        const body = response.json() as {
          success: boolean;
          error: { code: string; message: string };
        };
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
      } finally {
        vi.stubGlobal('fetch', originalFetch);
      }
    });

    it('returns 503 when fetch throws a network error (Connection reset)', async () => {
      const originalFetch = globalThis.fetch;
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection reset by peer')));

      try {
        const response = await app.inject({
          method: 'POST',
          url: '/lti/login',
          payload: {
            code: 'authorization-code',
            state: 'valid-state',
            target_link_uri: 'https://dmz.thearchive.game/lti/login',
          },
        });

        expect(response.statusCode).toBe(503);
        const body = response.json() as {
          success: boolean;
          error: { code: string; message: string };
        };
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
      } finally {
        vi.stubGlobal('fetch', originalFetch);
      }
    });

    it('returns 503 when fetch throws an AbortError', async () => {
      const originalFetch = globalThis.fetch;
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));

      try {
        const response = await app.inject({
          method: 'POST',
          url: '/lti/login',
          payload: {
            code: 'authorization-code',
            state: 'valid-state',
            target_link_uri: 'https://dmz.thearchive.game/lti/login',
          },
        });

        expect(response.statusCode).toBe(503);
        const body = response.json() as {
          success: boolean;
          error: { code: string; message: string };
        };
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
      } finally {
        vi.stubGlobal('fetch', originalFetch);
      }
    });

    it('returns 401 when fetch returns an HTTP error response (not a network error)', async () => {
      const originalFetch = globalThis.fetch;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: vi.fn().mockResolvedValue({ error: 'invalid_grant' }),
        }),
      );

      try {
        const response = await app.inject({
          method: 'POST',
          url: '/lti/login',
          payload: {
            code: 'authorization-code',
            state: 'valid-state',
            target_link_uri: 'https://dmz.thearchive.game/lti/login',
          },
        });

        expect(response.statusCode).toBe(401);
        const body = response.json() as {
          success: boolean;
          error: { code: string; message: string };
        };
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
      } finally {
        vi.stubGlobal('fetch', originalFetch);
      }
    });
  });
});
