import { describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const { fetchOIDCUserInfo, fetchTransitiveGroupMemberships, clearOIDCMetadataCache } =
  await import('../auth.sso.service.js');

describe('OIDC Integration Tests', () => {
  describe('fetchOIDCUserInfo', () => {
    it('should fetch user info from userinfo endpoint', async () => {
      const mockUserInfo = {
        sub: 'user-123',
        name: 'Test User',
        email: 'user@example.com',
        picture: 'https://idp.example.com/photo.jpg',
      };

      const server = setupServer(
        http.get('https://idp.example.com/userinfo', async ({ request }) => {
          const authHeader = request.headers.get('authorization');
          expect(authHeader).toMatch(/^Bearer /);
          return HttpResponse.json(mockUserInfo);
        }),
      );

      server.listen();

      try {
        const userInfo = await fetchOIDCUserInfo(
          'https://idp.example.com/userinfo',
          'access-token-123',
        );
        expect(userInfo.sub).toBe('user-123');
        expect(userInfo.email).toBe('user@example.com');
      } finally {
        server.close();
      }
    });

    it('should handle 401 Unauthorized', async () => {
      const server = setupServer(
        http.get('https://idp.example.com/userinfo', () => {
          return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
        }),
      );

      server.listen();

      try {
        await expect(
          fetchOIDCUserInfo('https://idp.example.com/userinfo', 'invalid-token'),
        ).rejects.toThrow();
      } finally {
        server.close();
      }
    });
  });

  describe('fetchTransitiveGroupMemberships', () => {
    it('should fetch transitive group memberships from Microsoft Graph', async () => {
      const mockGroups = {
        '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#directoryObjects',
        value: [
          { id: 'group-1', displayName: 'Admins', '@odata.type': '#microsoft.graph.group' },
          { id: 'group-2', displayName: 'Developers', '@odata.type': '#microsoft.graph.group' },
        ],
      };

      const server = setupServer(
        http.get(
          'https://graph.microsoft.com/v1.0/users/test-user/transitiveMemberOf',
          async ({ request }) => {
            const authHeader = request.headers.get('authorization');
            expect(authHeader).toMatch(/^Bearer /);
            return HttpResponse.json(mockGroups);
          },
        ),
      );

      server.listen();

      try {
        const groups = await fetchTransitiveGroupMemberships('access-token-123', 'test-user');
        expect(groups).toHaveLength(2);
        expect(groups[0]).toBe('Admins');
        expect(groups[1]).toBe('Developers');
      } finally {
        server.close();
      }
    });

    it('should handle empty group memberships', async () => {
      const mockGroups = {
        '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#directoryObjects',
        value: [],
      };

      const server = setupServer(
        http.get('https://graph.microsoft.com/v1.0/users/test-user/transitiveMemberOf', () => {
          return HttpResponse.json(mockGroups);
        }),
      );

      server.listen();

      try {
        const groups = await fetchTransitiveGroupMemberships('access-token-123', 'test-user');
        expect(groups).toHaveLength(0);
      } finally {
        server.close();
      }
    });

    it('should return empty array on Graph API error', async () => {
      const server = setupServer(
        http.get('https://graph.microsoft.com/v1.0/users/test-user/transitiveMemberOf', () => {
          return HttpResponse.json(
            { error: { code: 'Authorization_RequestDenied' } },
            {
              status: 403,
            },
          );
        }),
      );

      server.listen();

      try {
        const groups = await fetchTransitiveGroupMemberships('access-token-123', 'test-user');
        expect(groups).toHaveLength(0);
      } finally {
        server.close();
      }
    });
  });

  describe('fetchJWKS', () => {
    it('should fetch JWKS from IdP', async () => {
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
        http.get('https://idp.example.com/jwks', () => {
          return HttpResponse.json(mockJwks);
        }),
      );

      server.listen();

      try {
        clearOIDCMetadataCache();
        const jwks = await fetchJWKS('https://idp.example.com/jwks');
        expect(jwks.keys).toHaveLength(1);
        expect(jwks.keys[0]?.kid).toBe('key-1');
      } finally {
        server.close();
      }
    });
  });
});
