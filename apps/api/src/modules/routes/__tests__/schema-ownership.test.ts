import { describe, expect, it } from 'vitest';

import {
  SCHEMA_OWNERSHIP_MANIFEST,
  getSchemaOwnership,
  isSchemaOwnedByModule,
  isComponentOwnedByModule,
  isSharedSourceAllowed,
  getSchemaOwner,
  getComponentOwner,
  isSchemaRegistered,
  isComponentRegistered,
} from '../index.js';

describe('Schema Ownership Manifest', () => {
  describe('getSchemaOwnership', () => {
    it('should return ownership for auth module', () => {
      const ownership = getSchemaOwnership('auth');
      expect(ownership).toBeDefined();
      expect(ownership?.module).toBe('auth');
      expect(ownership?.schemaNamespace).toBe('Auth');
    });

    it('should return ownership for game module', () => {
      const ownership = getSchemaOwnership('game');
      expect(ownership).toBeDefined();
      expect(ownership?.module).toBe('game');
      expect(ownership?.schemaNamespace).toBe('Game');
    });

    it('should return ownership for health module', () => {
      const ownership = getSchemaOwnership('health');
      expect(ownership).toBeDefined();
      expect(ownership?.module).toBe('health');
      expect(ownership?.schemaNamespace).toBe('Health');
    });

    it('should return undefined for unknown module', () => {
      const ownership = getSchemaOwnership('unknown');
      expect(ownership).toBeUndefined();
    });
  });

  describe('isSchemaOwnedByModule', () => {
    it('should allow auth module to own its schemas', () => {
      expect(isSchemaOwnedByModule('auth', 'loginBodyJsonSchema')).toBe(true);
      expect(isSchemaOwnedByModule('auth', 'registerBodyJsonSchema')).toBe(true);
      expect(isSchemaOwnedByModule('auth', 'authResponseJsonSchema')).toBe(true);
    });

    it('should not allow auth module to own game schemas', () => {
      expect(isSchemaOwnedByModule('auth', 'gameSessionBootstrapResponseJsonSchema')).toBe(false);
    });

    it('should not allow auth module to own health schemas', () => {
      expect(isSchemaOwnedByModule('auth', 'healthResponseJsonSchema')).toBe(false);
    });

    it('should allow game module to own its schemas', () => {
      expect(isSchemaOwnedByModule('game', 'gameSessionBootstrapResponseJsonSchema')).toBe(true);
    });

    it('should allow health module to own its schemas', () => {
      expect(isSchemaOwnedByModule('health', 'healthResponseJsonSchema')).toBe(true);
      expect(isSchemaOwnedByModule('health', 'healthQueryJsonSchema')).toBe(true);
    });
  });

  describe('isComponentOwnedByModule', () => {
    it('should allow auth module to own its components', () => {
      expect(isComponentOwnedByModule('auth', 'AuthLoginResponse')).toBe(true);
      expect(isComponentOwnedByModule('auth', 'AuthRegisterResponse')).toBe(true);
      expect(isComponentOwnedByModule('auth', 'WebauthnChallengeRequest')).toBe(true);
      expect(isComponentOwnedByModule('auth', 'MfaStatusResponse')).toBe(true);
    });

    it('should allow auth module to own components matching its patterns', () => {
      expect(isComponentOwnedByModule('auth', 'AuthUser')).toBe(true);
      expect(isComponentOwnedByModule('auth', 'WebauthnCredential')).toBe(true);
      expect(isComponentOwnedByModule('auth', 'MfaMethod')).toBe(true);
    });

    it('should not allow auth module to own game components', () => {
      expect(isComponentOwnedByModule('auth', 'GameSessionBootstrapResponse')).toBe(false);
      expect(isComponentOwnedByModule('auth', 'GameSession')).toBe(false);
    });

    it('should not allow auth module to own health components', () => {
      expect(isComponentOwnedByModule('auth', 'HealthResponse')).toBe(false);
      expect(isComponentOwnedByModule('auth', 'ReadinessResponse')).toBe(false);
    });

    it('should allow game module to own its components', () => {
      expect(isComponentOwnedByModule('game', 'GameSessionBootstrapResponse')).toBe(true);
      expect(isComponentOwnedByModule('game', 'GameSession')).toBe(true);
      expect(isComponentOwnedByModule('game', 'GamePlayer')).toBe(true);
    });

    it('should allow health module to own its components', () => {
      expect(isComponentOwnedByModule('health', 'HealthResponse')).toBe(true);
      expect(isComponentOwnedByModule('health', 'HealthQuery')).toBe(true);
      expect(isComponentOwnedByModule('health', 'ReadinessResponse')).toBe(true);
    });
  });

  describe('isSharedSourceAllowed', () => {
    it('should allow auth module to import from @the-dmz/shared/schemas', () => {
      expect(isSharedSourceAllowed('auth', '@the-dmz/shared/schemas')).toBe(true);
    });

    it('should allow auth module to import from @the-dmz/shared/auth', () => {
      expect(isSharedSourceAllowed('auth', '@the-dmz/shared/auth')).toBe(true);
    });

    it('should not allow auth module to import from unauthorized sources', () => {
      expect(isSharedSourceAllowed('auth', '@the-dmz/shared/internal')).toBe(false);
      expect(isSharedSourceAllowed('auth', './internal/utils')).toBe(false);
    });

    it('should allow game module to import from @the-dmz/shared/schemas', () => {
      expect(isSharedSourceAllowed('game', '@the-dmz/shared/schemas')).toBe(true);
    });

    it('should not allow game module to import from @the-dmz/shared/auth', () => {
      expect(isSharedSourceAllowed('game', '@the-dmz/shared/auth')).toBe(false);
    });

    it('should return false for unknown module', () => {
      expect(isSharedSourceAllowed('unknown', '@the-dmz/shared/schemas')).toBe(false);
    });
  });

  describe('getSchemaOwner', () => {
    it('should return auth for auth schemas', () => {
      expect(getSchemaOwner('loginBodyJsonSchema')).toBe('auth');
      expect(getSchemaOwner('registerBodyJsonSchema')).toBe('auth');
    });

    it('should return game for game schemas', () => {
      expect(getSchemaOwner('gameSessionBootstrapResponseJsonSchema')).toBe('game');
    });

    it('should return health for health schemas', () => {
      expect(getSchemaOwner('healthResponseJsonSchema')).toBe('health');
      expect(getSchemaOwner('healthQueryJsonSchema')).toBe('health');
    });

    it('should return undefined for unknown schema', () => {
      expect(getSchemaOwner('unknownSchema')).toBeUndefined();
    });
  });

  describe('getComponentOwner', () => {
    it('should return auth for auth components', () => {
      expect(getComponentOwner('AuthLoginResponse')).toBe('auth');
      expect(getComponentOwner('WebauthnChallengeRequest')).toBe('auth');
    });

    it('should return game for game components', () => {
      expect(getComponentOwner('GameSessionBootstrapResponse')).toBe('game');
      expect(getComponentOwner('GameSession')).toBe('game');
    });

    it('should return health for health components', () => {
      expect(getComponentOwner('HealthResponse')).toBe('health');
      expect(getComponentOwner('ReadinessResponse')).toBe('health');
    });

    it('should return undefined for unknown component', () => {
      expect(getComponentOwner('UnknownComponent')).toBeUndefined();
    });
  });

  describe('isSchemaRegistered', () => {
    it('should return true for registered schemas', () => {
      expect(isSchemaRegistered('loginBodyJsonSchema')).toBe(true);
      expect(isSchemaRegistered('gameSessionBootstrapResponseJsonSchema')).toBe(true);
      expect(isSchemaRegistered('healthResponseJsonSchema')).toBe(true);
    });

    it('should return false for unregistered schemas', () => {
      expect(isSchemaRegistered('unknownSchema')).toBe(false);
    });
  });

  describe('isComponentRegistered', () => {
    it('should return true for registered components', () => {
      expect(isComponentRegistered('AuthLoginResponse')).toBe(true);
      expect(isComponentRegistered('GameSession')).toBe(true);
      expect(isComponentRegistered('HealthResponse')).toBe(true);
    });

    it('should return false for unregistered components', () => {
      expect(isComponentRegistered('UnknownComponent')).toBe(false);
    });
  });

  describe('manifest structure', () => {
    it('should have all required modules', () => {
      const modules = SCHEMA_OWNERSHIP_MANIFEST.ownership.map((o) => o.module);
      expect(modules).toContain('auth');
      expect(modules).toContain('game');
      expect(modules).toContain('health');
    });

    it('should have schemaNamespace for each module', () => {
      for (const entry of SCHEMA_OWNERSHIP_MANIFEST.ownership) {
        expect(entry.schemaNamespace).toBeDefined();
        expect(entry.schemaNamespace.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty ownedSchemas for each module', () => {
      for (const entry of SCHEMA_OWNERSHIP_MANIFEST.ownership) {
        expect(entry.ownedSchemas).toBeDefined();
        expect(entry.ownedSchemas.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty ownedComponents for each module', () => {
      for (const entry of SCHEMA_OWNERSHIP_MANIFEST.ownership) {
        expect(entry.ownedComponents).toBeDefined();
        expect(entry.ownedComponents.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty componentPatterns for each module', () => {
      for (const entry of SCHEMA_OWNERSHIP_MANIFEST.ownership) {
        expect(entry.componentPatterns).toBeDefined();
        expect(entry.componentPatterns.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty sharedSources for each module', () => {
      for (const entry of SCHEMA_OWNERSHIP_MANIFEST.ownership) {
        expect(entry.sharedSources).toBeDefined();
        expect(entry.sharedSources.length).toBeGreaterThan(0);
      }
    });
  });
});
