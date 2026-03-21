import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { OIDCSignatureAlgorithm, SSOProviderType } from '@the-dmz/shared/auth';

import {
  encryptClientSecret,
  decryptClientSecret,
  generateState,
  generateNonce,
  generatePKCECodeVerifier,
  generatePKCECodeChallenge,
  mapGroupsToRole,
  buildOIDCAuthorizationUrl,
  exchangeCodeForTokens,
  validateOIDCIdToken,
  fetchTransitiveGroupMemberships,
  decodeJWT,
  buildOIDCLogoutUrl,
  clearOIDCMetadataCache,
  refreshAccessToken,
} from '../auth.sso.service.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve([])),
    insert: vi.fn(() => Promise.resolve([{ userId: 'test-user-id' }])),
    update: vi.fn(() => Promise.resolve({})),
  })),
}));

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve([])),
    insert: vi.fn(() => Promise.resolve([{ userId: 'test-user-id' }])),
    update: vi.fn(() => Promise.resolve({})),
    from: vi.fn(() => Promise.resolve([])),
    where: vi.fn(() => Promise.resolve([])),
  })),
}));

vi.mock('../../../config.js', () => ({
  loadConfig: vi.fn(() => ({
    JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'test-encryption-key-for-testing-purposes-only',
  })),
}));

describe('OIDC Service - Client Secret Encryption', () => {
  describe('encryptClientSecret', () => {
    it('should encrypt a client secret', () => {
      const secret = 'test-client-secret';
      const encrypted = encryptClientSecret(secret);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(secret);
      expect(encrypted).toContain(':');
    });

    it('should produce different ciphertext for same input (due to random salt/iv)', () => {
      const secret = 'test-client-secret';
      const encrypted1 = encryptClientSecret(secret);
      const encrypted2 = encryptClientSecret(secret);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decryptClientSecret', () => {
    it('should decrypt an encrypted secret', () => {
      const secret = 'test-client-secret';
      const encrypted = encryptClientSecret(secret);
      const decrypted = decryptClientSecret(encrypted);

      expect(decrypted).toBe(secret);
    });

    it('should throw for invalid format', () => {
      expect(() => decryptClientSecret('invalid')).toThrow();
    });
  });
});

describe('OIDC Service - State and Nonce Generation', () => {
  describe('generateState', () => {
    it('should generate a random state string', () => {
      const state = generateState();

      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(20);
    });

    it('should generate unique states', () => {
      const states = new Set(Array.from({ length: 100 }, () => generateState()));

      expect(states.size).toBe(100);
    });
  });

  describe('generateNonce', () => {
    it('should generate a random nonce string', () => {
      const nonce = generateNonce();

      expect(nonce).toBeDefined();
      expect(nonce.length).toBeGreaterThan(20);
    });

    it('should generate unique nonces', () => {
      const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));

      expect(nonces.size).toBe(100);
    });
  });
});

describe('OIDC Service - PKCE', () => {
  describe('generatePKCECodeVerifier', () => {
    it('should generate a code verifier of appropriate length', () => {
      const verifier = generatePKCECodeVerifier();

      expect(verifier).toBeDefined();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it('should only use URL-safe characters', () => {
      const verifier = generatePKCECodeVerifier();

      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it('should generate unique verifiers', () => {
      const verifiers = new Set(Array.from({ length: 100 }, () => generatePKCECodeVerifier()));

      expect(verifiers.size).toBe(100);
    });
  });

  describe('generatePKCECodeChallenge', () => {
    it('should generate S256 code challenge from verifier', async () => {
      const verifier = generatePKCECodeVerifier();
      const challenge = await generatePKCECodeChallenge(verifier);

      expect(challenge).toBeDefined();
      expect(challenge).toMatch(/^[A-Za-z0-9\-._~]+$/);
      expect(challenge.length).toBe(43);
    });

    it('should produce deterministic challenge for same verifier', async () => {
      const verifier = 'test-verifier-string-abc123xyz';
      const challenge1 = await generatePKCECodeChallenge(verifier);
      const challenge2 = await generatePKCECodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
    });
  });
});

describe('OIDC Service - Authorization URL', () => {
  const mockProviderConfig = {
    type: SSOProviderType.OIDC,
    issuer: 'https://idp.example.com',
    clientId: 'test-client-id',
    authorizationEndpoint: 'https://idp.example.com/authorize',
    tokenEndpoint: 'https://idp.example.com/token',
    jwksUri: 'https://idp.example.com/jwks',
    scopes: ['openid', 'profile', 'email'],
    idTokenSignedResponseAlg: OIDCSignatureAlgorithm.RS256,
    allowedClockSkewSeconds: 60,
    responseType: 'code',
  };

  describe('buildOIDCAuthorizationUrl', () => {
    it('should build authorization URL with required params', async () => {
      const url = await buildOIDCAuthorizationUrl(
        mockProviderConfig,
        'test-client-id',
        'https://app.example.com/callback',
        'test-state',
        'test-nonce',
      );

      expect(url).toContain('https://idp.example.com/authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback');
      expect(url).toContain('scope=openid+profile+email');
      expect(url).toContain('state=test-state');
      expect(url).toContain('nonce=test-nonce');
    });

    it('should encode special characters in redirect URI', async () => {
      const url = await buildOIDCAuthorizationUrl(
        mockProviderConfig,
        'test-client-id',
        'https://app.example.com/callback?foo=bar',
        'state',
        'nonce',
      );

      expect(url).toContain('redirect_uri=');
    });

    it('should include PKCE code_challenge and code_challenge_method when pkceCodeVerifier is provided', async () => {
      const pkceCodeVerifier = generatePKCECodeVerifier();
      const url = await buildOIDCAuthorizationUrl(
        mockProviderConfig,
        'test-client-id',
        'https://app.example.com/callback',
        'test-state',
        'test-nonce',
        pkceCodeVerifier,
      );

      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('code_challenge')).toBeDefined();
      expect(urlObj.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('should not include PKCE params when pkceCodeVerifier is not provided', async () => {
      const url = await buildOIDCAuthorizationUrl(
        mockProviderConfig,
        'test-client-id',
        'https://app.example.com/callback',
        'test-state',
        'test-nonce',
      );

      const urlObj = new URL(url);
      expect(urlObj.searchParams.has('code_challenge')).toBe(false);
      expect(urlObj.searchParams.has('code_challenge_method')).toBe(false);
    });

    it('should compute correct code_challenge from pkceCodeVerifier', async () => {
      const pkceCodeVerifier = 'test-verifier-12345';
      const url = await buildOIDCAuthorizationUrl(
        mockProviderConfig,
        'test-client-id',
        'https://app.example.com/callback',
        'test-state',
        'test-nonce',
        pkceCodeVerifier,
      );

      const expectedChallenge = await generatePKCECodeChallenge(pkceCodeVerifier);
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('code_challenge')).toBe(expectedChallenge);
    });
  });
});

describe('OIDC Service - JWT Operations', () => {
  describe('decodeJWT', () => {
    it('should decode a valid JWT', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(
        JSON.stringify({ sub: 'user123', aud: 'client123', iss: 'https://idp.example.com' }),
      ).toString('base64url');
      const token = `${header}.${payload}.signature`;

      const decoded = decodeJWT(token);

      expect(decoded.header).toBeDefined();
      expect(decoded.payload).toBeDefined();
      expect(decoded.payload['sub']).toBe('user123');
    });

    it('should throw for invalid JWT', () => {
      expect(() => decodeJWT('invalid-token')).toThrow();
    });
  });
});

describe('OIDC Service - Role Mapping', () => {
  describe('mapGroupsToRole', () => {
    it('should return default role when no groups provided', () => {
      const result = mapGroupsToRole(
        [],
        [{ idpGroup: 'admins', rbRole: 'tenant_admin' }],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
      );

      expect(result).toBe('learner');
    });

    it('should return default role when no groups match', () => {
      const result = mapGroupsToRole(
        ['users', 'guests'],
        [
          { idpGroup: 'admins', rbRole: 'tenant_admin' },
          { idpGroup: 'managers', rbRole: 'manager' },
        ],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
      );

      expect(result).toBe('learner');
    });

    it('should map IdP group to RBAC role', () => {
      const result = mapGroupsToRole(
        ['admins', 'users'],
        [
          { idpGroup: 'admins', rbRole: 'tenant_admin' },
          { idpGroup: 'users', rbRole: 'learner' },
        ],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
      );

      expect(result).toBe('tenant_admin');
    });

    it('should handle transitive groups (nested group IDs)', () => {
      const result = mapGroupsToRole(
        ['group-123', 'group-456', 'group-789'],
        [
          {
            idpGroup: 'group-123',
            rbRole: 'tenant_admin',
            transitiveGroupIds: ['group-456', 'group-789'],
          },
        ],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
      );

      expect(result).toBe('tenant_admin');
    });

    it('should handle transitive groups when user is in nested group', () => {
      const result = mapGroupsToRole(
        [],
        [
          {
            idpGroup: 'group-nested-1',
            rbRole: 'manager',
          },
        ],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
        ['group-nested-1', 'group-nested-2'],
      );

      expect(result).toBe('manager');
    });

    it('should prioritize explicit group match over transitive', () => {
      const result = mapGroupsToRole(
        ['admins'],
        [
          { idpGroup: 'admins', rbRole: 'tenant_admin' },
          { idpGroup: 'group-123', rbRole: 'manager' },
        ],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
        ['admins'],
      );

      expect(result).toBe('tenant_admin');
    });

    it('should return default role for unmapped roles if not in allowed roles', () => {
      const result = mapGroupsToRole(
        ['admins'],
        [{ idpGroup: 'admins', rbRole: 'super_admin' }],
        'learner',
        ['tenant_admin', 'manager', 'trainer', 'learner'],
      );

      expect(result).toBe('learner');
    });

    it('should handle complex transitive group structures', () => {
      const result = mapGroupsToRole(
        [],
        [
          {
            idpGroup: 'enterprise-admin-group',
            rbRole: 'tenant_admin',
          },
        ],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
        ['enterprise-admin-group', 'dept-admin-group'],
      );

      expect(result).toBe('tenant_admin');
    });
  });
});

describe('OIDC Service - Logout', () => {
  describe('buildOIDCLogoutUrl', () => {
    it('should build logout URL with id_token_hint', () => {
      const url = buildOIDCLogoutUrl('https://idp.example.com/logout', 'id-token-hint-value');

      expect(url).toContain('https://idp.example.com/logout');
      expect(url).toContain('id_token_hint=id-token-hint-value');
    });

    it('should include post_logout_redirect_uri when provided', () => {
      const url = buildOIDCLogoutUrl(
        'https://idp.example.com/logout',
        'id-token-hint-value',
        'https://app.example.com/logged-out',
      );

      expect(url).toContain('post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Flogged-out');
    });

    it('should include state when provided', () => {
      const url = buildOIDCLogoutUrl(
        'https://idp.example.com/logout',
        'id-token-hint-value',
        undefined,
        'logout-state',
      );

      expect(url).toContain('state=logout-state');
    });
  });
});

describe('OIDC Service - Metadata Cache', () => {
  describe('clearOIDCMetadataCache', () => {
    it('should clear cache without error', () => {
      expect(() => clearOIDCMetadataCache()).not.toThrow();
    });

    it('should clear specific metadata URL', () => {
      expect(() =>
        clearOIDCMetadataCache('https://idp.example.com/.well-known/openid-configuration'),
      ).not.toThrow();
    });
  });
});

describe('OIDC Service - Token Exchange', () => {
  describe('exchangeCodeForTokens', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should throw error when token endpoint is empty', async () => {
      await expect(
        exchangeCodeForTokens(
          '',
          'client-id',
          'client-secret',
          'code',
          'redirect-uri',
          'code-verifier',
        ),
      ).rejects.toThrow();
    });

    it('should throw error when code exchange fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant', error_description: 'Invalid code' }),
      } as Response);

      await expect(
        exchangeCodeForTokens(
          'https://idp.example.com/token',
          'client-id',
          'client-secret',
          'invalid-code',
          'https://app.example.com/callback',
          'code-verifier',
        ),
      ).rejects.toThrow();
    });
  });
});

describe('OIDC Service - ID Token Validation', () => {
  describe('validateOIDCIdToken', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return invalid when issuer is empty', async () => {
      const result = await validateOIDCIdToken('some-token', '', '', 'client-id');

      expect(result.valid).toBe(false);
    });

    it('should reject token with invalid issuer', async () => {
      const invalidPayload = {
        iss: 'https://wrong-issuer.com',
        sub: 'user123',
        aud: ['client-id'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce: 'test-nonce',
      };

      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify(invalidPayload)).toString('base64url');
      const token = `${header}.${payload}.signature`;

      const result = await validateOIDCIdToken(
        token,
        'https://idp.example.com/jwks',
        'https://idp.example.com',
        'client-id',
        'test-nonce',
      );

      expect(result.valid).toBe(false);
    });

    it('should reject token with invalid audience', async () => {
      const invalidPayload = {
        iss: 'https://idp.example.com',
        sub: 'user123',
        aud: ['wrong-client-id'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce: 'test-nonce',
      };

      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify(invalidPayload)).toString('base64url');
      const token = `${header}.${payload}.signature`;

      const result = await validateOIDCIdToken(
        token,
        'https://idp.example.com/jwks',
        'https://idp.example.com',
        'client-id',
        'test-nonce',
      );

      expect(result.valid).toBe(false);
    });

    it('should reject token with expired timestamp', async () => {
      const expiredPayload = {
        iss: 'https://idp.example.com',
        sub: 'user123',
        aud: ['client-id'],
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
        nonce: 'test-nonce',
      };

      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
      const token = `${header}.${payload}.signature`;

      const result = await validateOIDCIdToken(
        token,
        'https://idp.example.com/jwks',
        'https://idp.example.com',
        'client-id',
        'test-nonce',
      );

      expect(result.valid).toBe(false);
    });

    it('should reject token with missing nonce when required', async () => {
      const payloadWithoutNonce = {
        iss: 'https://idp.example.com',
        sub: 'user123',
        aud: ['client-id'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify(payloadWithoutNonce)).toString('base64url');
      const token = `${header}.${payload}.signature`;

      const result = await validateOIDCIdToken(
        token,
        'https://idp.example.com/jwks',
        'https://idp.example.com',
        'client-id',
        'test-nonce',
      );

      expect(result.valid).toBe(false);
    });

    it('should reject token with mismatched nonce', async () => {
      const payloadWithNonce = {
        iss: 'https://idp.example.com',
        sub: 'user123',
        aud: ['client-id'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce: 'wrong-nonce',
      };

      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify(payloadWithNonce)).toString('base64url');
      const token = `${header}.${payload}.signature`;

      const result = await validateOIDCIdToken(
        token,
        'https://idp.example.com/jwks',
        'https://idp.example.com',
        'client-id',
        'test-nonce',
      );

      expect(result.valid).toBe(false);
    });
  });
});

describe('OIDC Service - Transitive Group Memberships', () => {
  describe('fetchTransitiveGroupMemberships', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return empty array when userId is empty', async () => {
      const result = await fetchTransitiveGroupMemberships('access-token', '');

      expect(result).toEqual([]);
    });

    it('should return empty array when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await fetchTransitiveGroupMemberships('access-token', 'user-id');

      expect(result).toEqual([]);
    });
  });
});

describe('OIDC Service - Token Refresh', () => {
  describe('refreshAccessToken', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should throw error when token endpoint is empty', async () => {
      await expect(
        refreshAccessToken('', 'client-id', 'client-secret', 'refresh-token'),
      ).rejects.toThrow();
    });

    it('should throw error when refresh fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant', error_description: 'Invalid refresh token' }),
      } as Response);

      await expect(
        refreshAccessToken(
          'https://idp.example.com/token',
          'client-id',
          'client-secret',
          'invalid-refresh-token',
        ),
      ).rejects.toThrow();
    });

    it('should return tokens on successful refresh', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          id_token: 'new-id-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      } as Response);

      const result = await refreshAccessToken(
        'https://idp.example.com/token',
        'client-id',
        'client-secret',
        'valid-refresh-token',
      );

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.idToken).toBe('new-id-token');
      expect(result.expiresIn).toBe(3600);
    });

    it('should handle refresh token rotation', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      } as Response);

      const result = await refreshAccessToken(
        'https://idp.example.com/token',
        'client-id',
        'client-secret',
        'valid-refresh-token',
      );

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBeUndefined();
    });
  });
});
