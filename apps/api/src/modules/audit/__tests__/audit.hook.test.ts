import { describe, expect, it } from 'vitest';

import { sanitizeBody } from '../audit.hook.js';

describe('sanitizeBody', () => {
  it('should return non-object body unchanged', () => {
    expect(sanitizeBody('string')).toBe('string');
    expect(sanitizeBody(123)).toBe(123);
    expect(sanitizeBody(null)).toBe(null);
    expect(sanitizeBody(undefined)).toBe(undefined);
  });

  it('should redact password fields', () => {
    const body = { username: 'testuser', password: 'secret123' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['username']).toBe('testuser');
    expect(result['password']).toBe('[REDACTED]');
  });

  it('should redact token fields', () => {
    const body = { username: 'testuser', token: 'jwt-token' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['username']).toBe('testuser');
    expect(result['token']).toBe('[REDACTED]');
  });

  it('should redact refreshToken and refresh_token fields', () => {
    const body = { refreshToken: 'refresh-123', refresh_token: 'refresh-456' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['refreshToken']).toBe('[REDACTED]');
    expect(result['refresh_token']).toBe('[REDACTED]');
  });

  it('should redact accessToken and access_token fields', () => {
    const body = { accessToken: 'access-123', access_token: 'access-456' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['accessToken']).toBe('[REDACTED]');
    expect(result['access_token']).toBe('[REDACTED]');
  });

  it('should redact mfaCode and mfa_code fields', () => {
    const body = { mfaCode: '123456', mfa_code: '789012' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['mfaCode']).toBe('[REDACTED]');
    expect(result['mfa_code']).toBe('[REDACTED]');
  });

  it('should redact verificationCode and verification_code fields', () => {
    const body = { verificationCode: '123456', verification_code: '789012' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['verificationCode']).toBe('[REDACTED]');
    expect(result['verification_code']).toBe('[REDACTED]');
  });

  it('should redact passwordConfirm field', () => {
    const body = { password: 'secret123', passwordConfirm: 'secret123' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['password']).toBe('[REDACTED]');
    expect(result['passwordConfirm']).toBe('[REDACTED]');
  });

  it('should redact clientSecret and client_secret fields', () => {
    const body = { clientSecret: 'secret-123', client_secret: 'secret-456' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['clientSecret']).toBe('[REDACTED]');
    expect(result['client_secret']).toBe('[REDACTED]');
  });

  it('should redact code field', () => {
    const body = { code: 'auth-code-123' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['code']).toBe('[REDACTED]');
  });

  it('should redact secret field', () => {
    const body = { secret: 'my-secret' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['secret']).toBe('[REDACTED]');
  });

  it('should redact authorization field', () => {
    const body = { authorization: 'Bearer token' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['authorization']).toBe('[REDACTED]');
  });

  it('should redact key field', () => {
    const body = { apiKey: 'key-123' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['apiKey']).toBe('[REDACTED]');
  });

  it('should redact creditCard field', () => {
    const body = { creditCard: '4111111111111111' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['creditCard']).toBe('[REDACTED]');
  });

  it('should redact x-api-key field', () => {
    const body = { 'x-api-key': 'api-key-123' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['x-api-key']).toBe('[REDACTED]');
  });

  it('should redact x_refresh_token header field', () => {
    const body = { x_refresh_token: 'refresh-token-123' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['x_refresh_token']).toBe('[REDACTED]');
  });

  it('should handle case-insensitive field matching', () => {
    const body = { PASSWORD: 'secret', MyPassword: 'secret2', PasswordConfirm: 'secret3' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['PASSWORD']).toBe('[REDACTED]');
    expect(result['MyPassword']).toBe('[REDACTED]');
    expect(result['PasswordConfirm']).toBe('[REDACTED]');
  });

  it('should handle partial key matches', () => {
    const body = { userPassword: 'secret1', passwordHash: 'hash2' };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['userPassword']).toBe('[REDACTED]');
    expect(result['passwordHash']).toBe('[REDACTED]');
  });

  it('should redact nested objects', () => {
    const body = {
      user: { name: 'test', password: 'secret' },
      metadata: { token: 'jwt' },
    };
    const result = sanitizeBody(body) as Record<string, unknown>;
    const user = result['user'] as Record<string, unknown>;
    const metadata = result['metadata'] as Record<string, unknown>;
    expect(user['name']).toBe('test');
    expect(user['password']).toBe('[REDACTED]');
    expect(metadata['token']).toBe('[REDACTED]');
  });

  it('should redact sensitive fields in arrays', () => {
    const body = [
      { username: 'user1', password: 'redact1' },
      { username: 'user2', password: 'redact2' },
    ];
    const result = sanitizeBody(body) as Array<Record<string, unknown>>;
    expect(result[0]?.['username']).toBe('user1');
    expect(result[0]?.['password']).toBe('[REDACTED]');
    expect(result[1]?.['username']).toBe('user2');
    expect(result[1]?.['password']).toBe('[REDACTED]');
  });

  it('should redact deeply nested structures', () => {
    const body = {
      level1: {
        level2: {
          level3: {
            password: 'redval1',
            token: 'tokval1',
          },
        },
      },
    };
    const result = sanitizeBody(body) as Record<string, unknown>;
    const l1 = result['level1'] as Record<string, unknown>;
    const l2 = l1['level2'] as Record<string, unknown>;
    const l3 = l2['level3'] as Record<string, unknown>;
    expect(l3['password']).toBe('[REDACTED]');
    expect(l3['token']).toBe('[REDACTED]');
  });

  it('should not redact non-sensitive fields', () => {
    const body = {
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: '2024-01-01',
    };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['username']).toBe('testuser');
    expect(result['email']).toBe('test@example.com');
    expect(result['displayName']).toBe('Test User');
    expect(result['createdAt']).toBe('2024-01-01');
  });

  it('should handle empty objects', () => {
    const body = {};
    const result = sanitizeBody(body);
    expect(result).toEqual({});
  });

  it('should handle empty arrays', () => {
    const body: unknown[] = [];
    const result = sanitizeBody(body);
    expect(result).toEqual([]);
  });

  it('should handle mixed sensitive and non-sensitive fields', () => {
    const body = {
      id: '123',
      username: 'testuser',
      password: 'redact1',
      email: 'test@example.com',
      token: 'tok1',
      mfaCode: 'code1',
      tenantId: 'tenant-123',
    };
    const result = sanitizeBody(body) as Record<string, unknown>;
    expect(result['id']).toBe('123');
    expect(result['username']).toBe('testuser');
    expect(result['password']).toBe('[REDACTED]');
    expect(result['email']).toBe('test@example.com');
    expect(result['token']).toBe('[REDACTED]');
    expect(result['mfaCode']).toBe('[REDACTED]');
    expect(result['tenantId']).toBe('tenant-123');
  });

  it('should not mutate original body', () => {
    const body = { username: 'test', password: 'red1' };
    sanitizeBody(body);
    expect(body['password']).toBe('secret');
  });

  it('should handle array within nested object', () => {
    const body = {
      data: {
        users: [
          { name: 'user1', token: 'tokena' },
          { name: 'user2', token: 'tokenb' },
        ],
      },
    };
    const result = sanitizeBody(body) as Record<string, unknown>;
    const data = result['data'] as Record<string, unknown>;
    const users = data['users'] as Array<Record<string, unknown>>;
    expect(users[0]?.['name']).toBe('user1');
    expect(users[0]?.['token']).toBe('[REDACTED]');
    expect(users[1]?.['name']).toBe('user2');
    expect(users[1]?.['token']).toBe('[REDACTED]');
  });
});
