import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OAuthClientExpiredError,
  OAuthClientRevokedError,
  OAuthInsufficientScopeError,
  OAuthInvalidClientError,
} from '../auth.errors.js';
import { issueClientCredentialsToken, verifyOAuthToken } from '../auth.oauth-client.service.js';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../auth.repo.js', () => ({
  findOAuthClientByClientId: vi.fn(),
  findOAuthClientByClientIdOnly: vi.fn(),
  updateOAuthClientLastUsed: vi.fn(),
}));

vi.mock('../auth.crypto.js', () => ({
  hashPassword: vi.fn(),
}));

vi.mock('../jwt-keys.service.js', () => ({
  signJWT: vi.fn(),
  verifyJWT: vi.fn(),
}));

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn(),
  },
  verify: vi.fn(),
}));

const mockConfig = {
  TOKEN_HASH_SALT: 'test-salt',
  JWT_ISSUER: 'https://test-issuer.local',
  JWT_AUDIENCE: 'test-api',
} as const;

const mockValidClient = {
  id: 'client-id-123',
  clientId: 'test-client-id',
  tenantId: 'tenant-123',
  name: 'Test Client',
  secretHash: '$argon2id$v=19$m=65536,t=3,p=4$testhash',
  previousSecretHash: null,
  rotationGracePeriodHours: '24',
  rotationGraceEndsAt: null,
  scopes: 'scim.read scim.write',
  expiresAt: null,
  revokedAt: null,
  lastUsedAt: null,
  createdAt: new Date(),
};

describe('issueClientCredentialsToken() error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('client not found', () => {
    it('throws OAuthInvalidClientError when client does not exist', async () => {
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue(null);

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'nonexistent-client',
          clientSecret: 'some-secret',
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(OAuthInvalidClientError);
    });

    it('does not call argon2.verify when client not found', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue(null);

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'nonexistent-client',
          clientSecret: 'some-secret',
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow();

      expect(argon2.verify).not.toHaveBeenCalled();
    });
  });

  describe('client revoked', () => {
    it('throws OAuthClientRevokedError when client has revokedAt set', async () => {
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        revokedAt: new Date(Date.now() - 1000),
      });

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'test-client-id',
          clientSecret: 'valid-secret',
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(OAuthClientRevokedError);
    });

    it('does not verify secret when client is revoked', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        revokedAt: new Date(Date.now() - 1000),
      });

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'test-client-id',
          clientSecret: 'valid-secret',
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow();

      expect(argon2.verify).not.toHaveBeenCalled();
    });
  });

  describe('client expired', () => {
    it('throws OAuthClientExpiredError when client has expired', async () => {
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'test-client-id',
          clientSecret: 'valid-secret',
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(OAuthClientExpiredError);
    });

    it('does not verify secret when client is expired', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'test-client-id',
          clientSecret: 'valid-secret',
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow();

      expect(argon2.verify).not.toHaveBeenCalled();
    });

    it('allows token issuance when client has no expiration', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId, updateOAuthClientLastUsed } =
        await import('../auth.repo.js');
      const { signJWT: mockSignJWT } = await import('../jwt-keys.service.js');

      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        expiresAt: null,
      });
      vi.mocked(argon2.verify).mockResolvedValue(true);
      vi.mocked(mockSignJWT).mockResolvedValue('signed-token');
      vi.mocked(updateOAuthClientLastUsed).mockResolvedValue(undefined);

      const result = await issueClientCredentialsToken(mockConfig, {
        clientId: 'test-client-id',
        clientSecret: 'valid-secret',
        tenantId: 'tenant-123',
      });

      expect(result.access_token).toBe('signed-token');
    });
  });

  describe('invalid credentials', () => {
    it('throws OAuthInvalidClientError when secret is invalid and no grace period', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        previousSecretHash: null,
        rotationGraceEndsAt: null,
      });
      vi.mocked(argon2.verify).mockResolvedValue(false);

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'test-client-id',
          clientSecret: 'wrong-secret',
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(OAuthInvalidClientError);
    });

    it('throws OAuthInvalidClientError when grace period has expired', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        previousSecretHash: '$argon2id$v=19$m=65536,t=3,p=4$previoushash',
        rotationGraceEndsAt: new Date(Date.now() - 1000),
      });
      vi.mocked(argon2.verify).mockResolvedValue(false);

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'test-client-id',
          clientSecret: 'wrong-secret',
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(OAuthInvalidClientError);
    });

    it('allows old secret during grace period', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId, updateOAuthClientLastUsed } =
        await import('../auth.repo.js');
      const { signJWT: mockSignJWT } = await import('../jwt-keys.service.js');

      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        previousSecretHash: '$argon2id$v=19$m=65536,t=3,p=4$previoushash',
        rotationGraceEndsAt: new Date(Date.now() + 60000),
      });
      vi.mocked(argon2.verify).mockResolvedValue(false);
      vi.mocked(argon2.verify).mockResolvedValue(true);
      vi.mocked(mockSignJWT).mockResolvedValue('signed-token');
      vi.mocked(updateOAuthClientLastUsed).mockResolvedValue(undefined);

      const result = await issueClientCredentialsToken(mockConfig, {
        clientId: 'test-client-id',
        clientSecret: 'previous-secret',
        tenantId: 'tenant-123',
      });

      expect(result.access_token).toBe('signed-token');
    });
  });

  describe('scope validation', () => {
    it('throws OAuthInsufficientScopeError when requested scope not allowed', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId } = await import('../auth.repo.js');
      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        scopes: 'scim.read',
      });
      vi.mocked(argon2.verify).mockResolvedValue(true);

      await expect(
        issueClientCredentialsToken(mockConfig, {
          clientId: 'test-client-id',
          clientSecret: 'valid-secret',
          tenantId: 'tenant-123',
          scope: 'scim.write',
        }),
      ).rejects.toThrow(OAuthInsufficientScopeError);
    });

    it('allows subset of granted scopes', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId, updateOAuthClientLastUsed } =
        await import('../auth.repo.js');
      const { signJWT: mockSignJWT } = await import('../jwt-keys.service.js');

      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        scopes: 'scim.read scim.write',
      });
      vi.mocked(argon2.verify).mockResolvedValue(true);
      vi.mocked(mockSignJWT).mockResolvedValue('signed-token');
      vi.mocked(updateOAuthClientLastUsed).mockResolvedValue(undefined);

      const result = await issueClientCredentialsToken(mockConfig, {
        clientId: 'test-client-id',
        clientSecret: 'valid-secret',
        tenantId: 'tenant-123',
        scope: 'scim.read',
      });

      expect(result.access_token).toBe('signed-token');
      expect(result.scope).toBe('scim.read');
    });

    it('uses all granted scopes when no scope requested', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId, updateOAuthClientLastUsed } =
        await import('../auth.repo.js');
      const { signJWT: mockSignJWT } = await import('../jwt-keys.service.js');

      vi.mocked(findOAuthClientByClientId).mockResolvedValue({
        ...mockValidClient,
        scopes: 'scim.read scim.write',
      });
      vi.mocked(argon2.verify).mockResolvedValue(true);
      vi.mocked(mockSignJWT).mockResolvedValue('signed-token');
      vi.mocked(updateOAuthClientLastUsed).mockResolvedValue(undefined);

      const result = await issueClientCredentialsToken(mockConfig, {
        clientId: 'test-client-id',
        clientSecret: 'valid-secret',
        tenantId: 'tenant-123',
      });

      expect(result.scope).toBe('scim.read scim.write');
    });
  });

  describe('successful token issuance', () => {
    it('issues token with correct structure', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId, updateOAuthClientLastUsed } =
        await import('../auth.repo.js');
      const { signJWT: mockSignJWT } = await import('../jwt-keys.service.js');

      vi.mocked(findOAuthClientByClientId).mockResolvedValue(mockValidClient);
      vi.mocked(argon2.verify).mockResolvedValue(true);
      vi.mocked(mockSignJWT).mockResolvedValue('signed-token');
      vi.mocked(updateOAuthClientLastUsed).mockResolvedValue(undefined);

      const result = await issueClientCredentialsToken(mockConfig, {
        clientId: 'test-client-id',
        clientSecret: 'valid-secret',
        tenantId: 'tenant-123',
      });

      expect(result).toEqual({
        access_token: 'signed-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'scim.read scim.write',
      });
    });

    it('calls updateOAuthClientLastUsed after successful issuance', async () => {
      const argon2 = await import('argon2');
      const { findOAuthClientByClientId, updateOAuthClientLastUsed } =
        await import('../auth.repo.js');
      const { signJWT: mockSignJWT } = await import('../jwt-keys.service.js');

      vi.mocked(findOAuthClientByClientId).mockResolvedValue(mockValidClient);
      vi.mocked(argon2.verify).mockResolvedValue(true);
      vi.mocked(mockSignJWT).mockResolvedValue('signed-token');
      vi.mocked(updateOAuthClientLastUsed).mockResolvedValue(undefined);

      await issueClientCredentialsToken(mockConfig, {
        clientId: 'test-client-id',
        clientSecret: 'valid-secret',
        tenantId: 'tenant-123',
      });

      expect(updateOAuthClientLastUsed).toHaveBeenCalledWith(
        expect.anything(),
        'test-client-id',
        'tenant-123',
      );
    });
  });
});

describe('verifyOAuthToken() error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('invalid token payload', () => {
    it('throws error when token payload is missing required fields', async () => {
      const { verifyJWT } = await import('../jwt-keys.service.js');
      vi.mocked(verifyJWT).mockResolvedValue({
        payload: {
          sub: 'client-123',
        },
      } as Parameters<typeof verifyJWT>[1]);

      await expect(verifyOAuthToken(mockConfig, 'invalid-payload-token')).rejects.toThrow(
        'Invalid token payload',
      );
    });

    it('throws error when sub is missing', async () => {
      const { verifyJWT } = await import('../jwt-keys.service.js');
      vi.mocked(verifyJWT).mockResolvedValue({
        payload: {
          tenantId: 'tenant-123',
          scopes: ['scim.read'],
        },
      } as Parameters<typeof verifyJWT>[1]);

      await expect(verifyOAuthToken(mockConfig, 'missing-sub-token')).rejects.toThrow(
        'Invalid token payload',
      );
    });

    it('throws error when tenantId is missing', async () => {
      const { verifyJWT } = await import('../jwt-keys.service.js');
      vi.mocked(verifyJWT).mockResolvedValue({
        payload: {
          sub: 'client-123',
          scopes: ['scim.read'],
        },
      } as Parameters<typeof verifyJWT>[1]);

      await expect(verifyOAuthToken(mockConfig, 'missing-tenantid-token')).rejects.toThrow(
        'Invalid token payload',
      );
    });

    it('throws error when scopes is missing', async () => {
      const { verifyJWT } = await import('../jwt-keys.service.js');
      vi.mocked(verifyJWT).mockResolvedValue({
        payload: {
          sub: 'client-123',
          tenantId: 'tenant-123',
        },
      } as Parameters<typeof verifyJWT>[1]);

      await expect(verifyOAuthToken(mockConfig, 'missing-scopes-token')).rejects.toThrow(
        'Invalid token payload',
      );
    });
  });

  describe('invalid token type', () => {
    it('throws error when token type is not oauth_client_credentials', async () => {
      const { verifyJWT } = await import('../jwt-keys.service.js');
      vi.mocked(verifyJWT).mockResolvedValue({
        payload: {
          sub: 'client-123',
          tenantId: 'tenant-123',
          scopes: ['scim.read'],
          type: 'session',
        },
      } as Parameters<typeof verifyJWT>[1]);

      await expect(verifyOAuthToken(mockConfig, 'wrong-type-token')).rejects.toThrow(
        'Invalid token type',
      );
    });
  });

  describe('verifyJWT throws', () => {
    it('throws error when verifyJWT fails', async () => {
      const { verifyJWT } = await import('../jwt-keys.service.js');
      vi.mocked(verifyJWT).mockRejectedValue(new Error('JWT verification failed'));

      await expect(verifyOAuthToken(mockConfig, 'forged-token')).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });

  describe('successful verification', () => {
    it('returns client info on valid token', async () => {
      const { verifyJWT } = await import('../jwt-keys.service.js');
      vi.mocked(verifyJWT).mockResolvedValue({
        payload: {
          sub: 'client-123',
          tenantId: 'tenant-123',
          scopes: ['scim.read', 'scim.write'],
          type: 'oauth_client_credentials',
        },
      } as Parameters<typeof verifyJWT>[1]);

      const result = await verifyOAuthToken(mockConfig, 'valid-token');

      expect(result).toEqual({
        clientId: 'client-123',
        tenantId: 'tenant-123',
        scopes: ['scim.read', 'scim.write'],
      });
    });

    it('returns client info on valid token with expiresAt field', async () => {
      const { verifyJWT } = await import('../jwt-keys.service.js');
      vi.mocked(verifyJWT).mockResolvedValue({
        payload: {
          sub: 'client-123',
          tenantId: 'tenant-123',
          scopes: ['scim.read', 'scim.write'],
          type: 'oauth_client_credentials',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        },
      } as Parameters<typeof verifyJWT>[1]);

      const result = await verifyOAuthToken(mockConfig, 'valid-token-with-expiry');

      expect(result).toEqual({
        clientId: 'client-123',
        tenantId: 'tenant-123',
        scopes: ['scim.read', 'scim.write'],
      });
    });
  });
});

describe('hasRequiredOAuthScope()', () => {
  it('returns true when token has required scope', async () => {
    const { hasRequiredOAuthScope } = await import('../auth.oauth-client.service.js');

    expect(hasRequiredOAuthScope(['scim.read', 'scim.write'], 'scim.read')).toBe(true);
  });

  it('returns false when token does not have required scope', async () => {
    const { hasRequiredOAuthScope } = await import('../auth.oauth-client.service.js');

    expect(hasRequiredOAuthScope(['scim.read'], 'scim.write')).toBe(false);
  });

  it('returns false when token scopes array is empty', async () => {
    const { hasRequiredOAuthScope } = await import('../auth.oauth-client.service.js');

    expect(hasRequiredOAuthScope([], 'scim.read')).toBe(false);
  });

  it('returns false when required scope is null', async () => {
    const { hasRequiredOAuthScope } = await import('../auth.oauth-client.service.js');

    expect(hasRequiredOAuthScope(['scim.read'], '')).toBe(false);
  });
});
