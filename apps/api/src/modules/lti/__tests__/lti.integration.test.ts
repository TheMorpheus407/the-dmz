import { describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

import { getJWKSet, refreshJWKSet } from '../lti.service.js';

import type { LtiPlatform } from '../lti.service.js';

const mockPlatform: LtiPlatform = {
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

describe('LTI JWKS Integration', () => {
  describe('getJWKSet', () => {
    it('should fetch JWKS from remote URL successfully', async () => {
      const mockJwks = {
        keys: [
          {
            kty: 'RSA',
            kid: 'key-1',
            use: 'sig',
            alg: 'RS256',
            n: 'test-modulus',
            e: 'AQAB',
          },
        ],
      };

      const server = setupServer(
        http.get('https://canvas.example.edu/.well-known/jwks.json', () => {
          return HttpResponse.json(mockJwks);
        }),
      );

      server.listen();

      try {
        refreshJWKSet({} as never, mockPlatform.platformId);
        const jwks = await getJWKSet({} as never, mockPlatform);
        expect(jwks).not.toBeNull();
      } finally {
        server.close();
      }
    });

    it('should handle network errors when fetching JWKS', async () => {
      const server = setupServer(
        http.get('https://canvas.example.edu/.well-known/jwks.json', () => {
          throw new Error('Network error');
        }),
      );

      server.listen();

      try {
        refreshJWKSet({} as never, mockPlatform.platformId);
        const jwks = await getJWKSet({} as never, mockPlatform);
        expect(jwks).not.toBeNull();
      } finally {
        server.close();
      }
    });
  });
});
