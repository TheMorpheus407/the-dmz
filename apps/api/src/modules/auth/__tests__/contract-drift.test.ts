import { describe, expect, it } from 'vitest';

import {
  loginJsonSchema,
  registerJsonSchema,
  refreshTokenJsonSchema,
  loginResponseJsonSchema,
  refreshResponseJsonSchema,
  userJsonSchema,
  logoutResponseJsonSchema,
  profileJsonSchema,
  updateProfileJsonSchema,
} from '@the-dmz/shared/schemas';

import {
  loginBodyJsonSchema,
  registerBodyJsonSchema,
  refreshBodyJsonSchema,
  authResponseJsonSchema,
  refreshResponseJsonSchema as apiRefreshResponseJsonSchema,
  meResponseJsonSchema as apiMeResponseJsonSchema,
  updateProfileBodyJsonSchema,
  profileResponseJsonSchema,
} from '../auth.routes.js';

describe('anti-drift: API routes derive from shared contracts', () => {
  describe('request schemas', () => {
    it('login body schema matches shared loginJsonSchema', () => {
      expect(loginBodyJsonSchema).toEqual(loginJsonSchema);
    });

    it('register body schema matches shared registerJsonSchema', () => {
      expect(registerBodyJsonSchema).toEqual(registerJsonSchema);
    });

    it('refresh body schema matches shared refreshTokenJsonSchema', () => {
      expect(refreshBodyJsonSchema).toEqual(refreshTokenJsonSchema);
    });
  });

  describe('response schemas', () => {
    it('auth response schema matches shared loginResponseJsonSchema', () => {
      expect(authResponseJsonSchema).toEqual(loginResponseJsonSchema);
    });

    it('refresh response schema matches shared refreshResponseJsonSchema', () => {
      expect(apiRefreshResponseJsonSchema).toEqual(refreshResponseJsonSchema);
    });

    it('me response schema extends shared meResponseJsonSchema with permissions and roles', () => {
      expect(apiMeResponseJsonSchema.properties).toHaveProperty('user');
      expect(apiMeResponseJsonSchema.properties).toHaveProperty('profile');
      expect(apiMeResponseJsonSchema.properties).toHaveProperty('permissions');
      expect(apiMeResponseJsonSchema.properties).toHaveProperty('roles');
      expect(apiMeResponseJsonSchema.required).toContain('permissions');
      expect(apiMeResponseJsonSchema.required).toContain('roles');
    });

    it('update profile body schema matches shared updateProfileJsonSchema', () => {
      expect(updateProfileBodyJsonSchema).toEqual(updateProfileJsonSchema);
    });

    it('profile response schema matches shared profileJsonSchema', () => {
      expect(profileResponseJsonSchema).toEqual(profileJsonSchema);
    });
  });

  describe('shared schemas integrity', () => {
    it('loginJsonSchema has correct structure', () => {
      expect(loginJsonSchema.type).toBe('object');
      expect(loginJsonSchema.properties).toHaveProperty('email');
      expect(loginJsonSchema.properties).toHaveProperty('password');
      expect(loginJsonSchema.required).toContain('email');
      expect(loginJsonSchema.required).toContain('password');
    });

    it('registerJsonSchema has correct structure', () => {
      expect(registerJsonSchema.type).toBe('object');
      expect(registerJsonSchema.properties).toHaveProperty('email');
      expect(registerJsonSchema.properties).toHaveProperty('password');
      expect(registerJsonSchema.properties).toHaveProperty('displayName');
      expect(registerJsonSchema.required).toContain('email');
      expect(registerJsonSchema.required).toContain('password');
      expect(registerJsonSchema.required).toContain('displayName');
    });

    it('userJsonSchema has correct structure', () => {
      expect(userJsonSchema.type).toBe('object');
      expect(userJsonSchema.properties).toHaveProperty('id');
      expect(userJsonSchema.properties).toHaveProperty('email');
      expect(userJsonSchema.properties).toHaveProperty('displayName');
      expect(userJsonSchema.properties).toHaveProperty('tenantId');
      expect(userJsonSchema.properties).toHaveProperty('role');
      expect(userJsonSchema.properties).toHaveProperty('isActive');
    });

    it('profileJsonSchema has correct structure', () => {
      expect(profileJsonSchema.type).toBe('object');
      expect(profileJsonSchema.properties).toHaveProperty('profileId');
      expect(profileJsonSchema.properties).toHaveProperty('tenantId');
      expect(profileJsonSchema.properties).toHaveProperty('userId');
      expect(profileJsonSchema.properties).toHaveProperty('locale');
      expect(profileJsonSchema.properties).toHaveProperty('timezone');
    });

    it('logoutResponseJsonSchema has correct structure', () => {
      expect(logoutResponseJsonSchema.type).toBe('object');
      expect(logoutResponseJsonSchema.properties).toHaveProperty('success');
      expect(logoutResponseJsonSchema.required).toContain('success');
    });
  });
});
