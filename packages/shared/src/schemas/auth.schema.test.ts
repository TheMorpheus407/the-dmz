import { describe, expect, it } from 'vitest';

import {
  loginJsonSchema,
  loginSchema,
  refreshTokenJsonSchema,
  refreshTokenSchema,
  registerJsonSchema,
  registerSchema,
} from './index.js';

type JsonSchemaShape = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

describe('auth schemas', () => {
  it('accepts valid login payloads', () => {
    const result = loginSchema.parse({
      email: 'user@example.com',
      password: 'hunter2-password',
    });

    expect(result.email).toBe('user@example.com');
  });

  it('rejects invalid login payloads', () => {
    expect(() =>
      loginSchema.parse({
        email: 'not-an-email',
        password: 'short',
      }),
    ).toThrow();
  });

  it('accepts valid registration payloads', () => {
    const result = registerSchema.parse({
      email: 'new@example.com',
      password: 'longer-password-123',
      displayName: 'Operator',
    });

    expect(result.displayName).toBe('Operator');
  });

  it('rejects invalid registration payloads', () => {
    expect(() =>
      registerSchema.parse({
        email: 'bad',
        password: 'short',
        displayName: 'O',
      }),
    ).toThrow();
  });

  it('accepts valid refresh tokens', () => {
    const result = refreshTokenSchema.parse({
      refreshToken: 'token-value',
    });

    expect(result.refreshToken).toBe('token-value');
  });
});

describe('auth json schemas', () => {
  const assertObjectSchema = (schema: JsonSchemaShape, required: string[]) => {
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeTruthy();
    expect(schema.required).toEqual(expect.arrayContaining(required));
    expect(schema.additionalProperties).toBe(false);
  };

  it('creates a login json schema', () => {
    assertObjectSchema(loginJsonSchema as JsonSchemaShape, ['email', 'password']);
  });

  it('creates a register json schema', () => {
    assertObjectSchema(registerJsonSchema as JsonSchemaShape, ['email', 'password', 'displayName']);
  });

  it('creates a refresh token json schema', () => {
    assertObjectSchema(refreshTokenJsonSchema as JsonSchemaShape, ['refreshToken']);
  });
});
