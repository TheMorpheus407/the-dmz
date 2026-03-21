import { randomBytes, scryptSync, createCipheriv } from 'crypto';

import { beforeEach, describe, expect, it, afterAll, vi } from 'vitest';
import { jwtVerify, SignJWT, importPKCS8 } from 'jose';

import {
  generateRSAKeyPair,
  generateECKeyPair,
  parseRSAPublicKeyToJWK,
  parseECPublicKeyToJWK,
  signJWT,
  verifyJWT,
} from '../jwt-keys.service.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { JWTIssuerValidationError, JWTAudienceValidationError } from '../auth.errors.js';

import type { AppConfig } from '../../../config.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
  closeDatabase: vi.fn(),
}));

describe('jwt-keys service', () => {
  describe('generateRSAKeyPair', () => {
    it('generates RSA key pair with kid', async () => {
      const keyPair = await generateRSAKeyPair();

      expect(keyPair.publicKeyPem).toBeDefined();
      expect(keyPair.privateKeyPem).toBeDefined();
      expect(keyPair.kid).toBeDefined();
      expect(keyPair.kid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(keyPair.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('generates unique key pairs each time', async () => {
      const keyPair1 = await generateRSAKeyPair();
      const keyPair2 = await generateRSAKeyPair();

      expect(keyPair1.kid).not.toBe(keyPair2.kid);
      expect(keyPair1.publicKeyPem).not.toBe(keyPair2.publicKeyPem);
    });
  });

  describe('generateECKeyPair', () => {
    it('generates EC key pair with kid', async () => {
      const keyPair = await generateECKeyPair();

      expect(keyPair.publicKeyPem).toBeDefined();
      expect(keyPair.privateKeyPem).toBeDefined();
      expect(keyPair.kid).toBeDefined();
      expect(keyPair.kid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(keyPair.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('generates unique EC key pairs each time', async () => {
      const keyPair1 = await generateECKeyPair();
      const keyPair2 = await generateECKeyPair();

      expect(keyPair1.kid).not.toBe(keyPair2.kid);
      expect(keyPair1.publicKeyPem).not.toBe(keyPair2.publicKeyPem);
    });
  });

  describe('parseRSAPublicKeyToJWK', () => {
    it('parses RSA public key to JWK format', async () => {
      const keyPair = await generateRSAKeyPair();
      const jwk = await parseRSAPublicKeyToJWK(keyPair.publicKeyPem);

      expect(jwk.n).toBeDefined();
      expect(jwk.e).toBeDefined();
      expect(jwk.n.length).toBeGreaterThan(0);
      expect(jwk.e.length).toBeGreaterThan(0);
    });

    it('returns non-empty n and e values', async () => {
      const keyPair = await generateRSAKeyPair();
      const jwk = await parseRSAPublicKeyToJWK(keyPair.publicKeyPem);

      expect(jwk.n).not.toBe('');
      expect(jwk.e).not.toBe('');
    });

    it('produces valid base64url encoded values', async () => {
      const keyPair = await generateRSAKeyPair();
      const jwk = await parseRSAPublicKeyToJWK(keyPair.publicKeyPem);

      expect(() => Buffer.from(jwk.n, 'base64url')).not.toThrow();
      expect(() => Buffer.from(jwk.e, 'base64url')).not.toThrow();
    });

    it('JWK values can verify a JWT signed with the corresponding private key', async () => {
      const keyPair = await generateRSAKeyPair();
      const jwk = await parseRSAPublicKeyToJWK(keyPair.publicKeyPem);

      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');
      const token = await new SignJWT({ sub: 'test-user' })
        .setProtectedHeader({ alg: 'RS256', kid: keyPair.kid })
        .setIssuedAt()
        .sign(privateKey);

      const publicKeyJWK = {
        kty: 'RSA',
        n: jwk.n,
        e: jwk.e,
        alg: 'RS256',
      };

      const { payload } = await jwtVerify(token, publicKeyJWK);
      expect(payload.sub).toBe('test-user');
    });
  });

  describe('parseECPublicKeyToJWK', () => {
    it('parses EC public key to JWK format', async () => {
      const keyPair = await generateECKeyPair();
      const jwk = await parseECPublicKeyToJWK(keyPair.publicKeyPem);

      expect(jwk.x).toBeDefined();
      expect(jwk.y).toBeDefined();
      expect(jwk.crv).toBe('P-256');
      expect(jwk.x.length).toBeGreaterThan(0);
      expect(jwk.y.length).toBeGreaterThan(0);
    });

    it('returns non-empty x and y values', async () => {
      const keyPair = await generateECKeyPair();
      const jwk = await parseECPublicKeyToJWK(keyPair.publicKeyPem);

      expect(jwk.x).not.toBe('');
      expect(jwk.y).not.toBe('');
    });

    it('produces valid base64url encoded values', async () => {
      const keyPair = await generateECKeyPair();
      const jwk = await parseECPublicKeyToJWK(keyPair.publicKeyPem);

      expect(() => Buffer.from(jwk.x, 'base64url')).not.toThrow();
      expect(() => Buffer.from(jwk.y, 'base64url')).not.toThrow();
    });

    it('JWK values can verify a JWT signed with the corresponding private key', async () => {
      const keyPair = await generateECKeyPair();
      const jwk = await parseECPublicKeyToJWK(keyPair.publicKeyPem);

      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'ES256');
      const token = await new SignJWT({ sub: 'test-user' })
        .setProtectedHeader({ alg: 'ES256', kid: keyPair.kid })
        .setIssuedAt()
        .sign(privateKey);

      const publicKeyJWK = {
        kty: 'EC',
        crv: jwk.crv,
        x: jwk.x,
        y: jwk.y,
        alg: 'ES256',
      };

      const { payload } = await jwtVerify(token, publicKeyJWK);
      expect(payload.sub).toBe('test-user');
    });
  });

  describe('getJWKS (key format validation)', () => {
    it('returns valid RSA JWK format', async () => {
      const keyPair = await generateRSAKeyPair();
      const jwk = await parseRSAPublicKeyToJWK(keyPair.publicKeyPem);

      expect(jwk.n).toBeDefined();
      expect(jwk.e).toBeDefined();
      expect(typeof jwk.n).toBe('string');
      expect(typeof jwk.e).toBe('string');
    });

    it('returns valid EC JWK format', async () => {
      const keyPair = await generateECKeyPair();
      const jwk = await parseECPublicKeyToJWK(keyPair.publicKeyPem);

      expect(jwk.x).toBeDefined();
      expect(jwk.y).toBeDefined();
      expect(jwk.crv).toBe('P-256');
      expect(typeof jwk.x).toBe('string');
      expect(typeof jwk.y).toBe('string');
      expect(typeof jwk.crv).toBe('string');
    });
  });

  describe('signJWT and verifyJWT with iss/aud validation', () => {
    const mockIssuer = 'https://the-dmz.local';
    const mockAudience = 'the-dmz-api';
    const mockKid = 'test-key-id-1234';

    const SALT_LENGTH = 32;
    const IV_LENGTH = 16;

    const encryptPrivateKeyForMock = (privateKeyPem: string, encryptionKey: string): string => {
      const salt = randomBytes(SALT_LENGTH);
      const key = scryptSync(encryptionKey, salt, 32);
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(privateKeyPem, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const combined = Buffer.concat([salt, iv, authTag, encrypted]);
      return combined.toString('base64');
    };

    let createdKey: {
      id: string;
      keyType: string;
      algorithm: string;
      publicKeyPem: string;
      privateKeyEncryptedPem: string;
      status: string;
      activatedAt: Date;
      expiresAt: Date | null;
    } | null = null;

    const createMockConfig = (overrides: Partial<AppConfig> = {}): AppConfig =>
      ({
        JWT_ISSUER: mockIssuer,
        JWT_AUDIENCE: mockAudience,
        JWT_EXPIRES_IN: '7d',
        JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'test-encryption-key-at-least-32-chars',
        ...overrides,
      }) as AppConfig;

    const createMockDb = (keyPair: { publicKeyPem: string; privateKeyPem: string }) => {
      const encryptedPem = encryptPrivateKeyForMock(
        keyPair.privateKeyPem,
        'test-encryption-key-at-least-32-chars',
      );
      createdKey = {
        id: mockKid,
        keyType: 'RSA',
        algorithm: 'RS256',
        publicKeyPem: keyPair.publicKeyPem,
        privateKeyEncryptedPem: encryptedPem,
        status: 'ACTIVE',
        activatedAt: new Date(),
        expiresAt: null,
      };
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                if (createdKey && createdKey.status === 'ACTIVE') {
                  return Promise.resolve([createdKey]);
                }
                return Promise.resolve([]);
              }),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => {
              createdKey = {
                id: mockKid,
                keyType: 'RSA',
                algorithm: 'RS256',
                publicKeyPem: keyPair.publicKeyPem,
                privateKeyEncryptedPem: encryptedPem,
                status: 'ACTIVE',
                activatedAt: new Date(),
                expiresAt: null,
              };
              return Promise.resolve([createdKey]);
            }),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      };
      return mockDb;
    };

    beforeEach(async () => {
      const keyPair = await generateRSAKeyPair();
      const encryptedPem = encryptPrivateKeyForMock(
        keyPair.privateKeyPem,
        'test-encryption-key-at-least-32-chars',
      );
      createdKey = {
        id: mockKid,
        keyType: 'RSA',
        algorithm: 'RS256',
        publicKeyPem: keyPair.publicKeyPem,
        privateKeyEncryptedPem: encryptedPem,
        status: 'ACTIVE',
        activatedAt: new Date(),
        expiresAt: null,
      };
      const mockDb = createMockDb(keyPair);
      vi.mocked(getDatabaseClient).mockReset();
      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );
    });

    it('signJWT should include iss and aud claims in the signed token', async () => {
      const config = createMockConfig();
      const token = await signJWT(config, { sub: 'test-user' });

      const { payload } = await verifyJWT(config, token);

      expect(payload['iss']).toBe(mockIssuer);
      expect(payload['aud']).toBe(mockAudience);
    });

    it('verifyJWT should accept token with correct issuer and audience', async () => {
      const config = createMockConfig();
      const token = await signJWT(config, { sub: 'test-user' });

      const result = await verifyJWT(config, token);

      expect(result.payload).toBeDefined();
      expect(result.payload['sub']).toBe('test-user');
    });

    it('verifyJWT should throw JWTIssuerValidationError for issuer mismatch', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const wrongIssuer = 'https://wrong-issuer.example.com';
      const token = await new SignJWT({ sub: 'test-user' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(wrongIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: mockKid,
                    keyType: 'RSA',
                    algorithm: 'RS256',
                    publicKeyPem: keyPair.publicKeyPem,
                    status: 'ACTIVE',
                    expiresAt: null,
                  },
                ]),
              ),
            })),
          })),
        })),
      };
      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );

      const config = createMockConfig();

      await expect(verifyJWT(config, token)).rejects.toThrow(JWTIssuerValidationError);
    });

    it('verifyJWT should throw JWTAudienceValidationError for audience mismatch', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const wrongAudience = 'wrong-audience';
      const token = await new SignJWT({ sub: 'test-user' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(wrongAudience)
        .sign(privateKey);

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: mockKid,
                    keyType: 'RSA',
                    algorithm: 'RS256',
                    publicKeyPem: keyPair.publicKeyPem,
                    status: 'ACTIVE',
                    expiresAt: null,
                  },
                ]),
              ),
            })),
          })),
        })),
      };
      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );

      const config = createMockConfig();

      await expect(verifyJWT(config, token)).rejects.toThrow(JWTAudienceValidationError);
    });

    it('verifyJWT should throw JWTAudienceValidationError when audience is missing', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({ sub: 'test-user' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .sign(privateKey);

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: mockKid,
                    keyType: 'RSA',
                    algorithm: 'RS256',
                    publicKeyPem: keyPair.publicKeyPem,
                    status: 'ACTIVE',
                    expiresAt: null,
                  },
                ]),
              ),
            })),
          })),
        })),
      };
      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );

      const config = createMockConfig();

      await expect(verifyJWT(config, token)).rejects.toThrow(JWTAudienceValidationError);
    });
  });
});

afterAll(async () => {
  await closeDatabase();
});
