import { describe, expect, it, afterAll } from 'vitest';
import { jwtVerify, SignJWT, importPKCS8 } from 'jose';

import {
  generateRSAKeyPair,
  generateECKeyPair,
  parseRSAPublicKeyToJWK,
  parseECPublicKeyToJWK,
} from '../jwt-keys.service.js';
import { closeDatabase } from '../../../shared/database/connection.js';

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
});

afterAll(async () => {
  await closeDatabase();
});
