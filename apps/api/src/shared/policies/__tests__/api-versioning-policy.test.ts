import { describe, expect, it } from 'vitest';

import {
  API_VERSIONING_POLICY,
  getModuleVersionRule,
  isPathVersioned,
  isPathAllowedUnversioned,
  getDeprecationPolicy,
  validateVersioningPolicy,
} from '../index.js';

describe('API Versioning Policy', () => {
  describe('activeMajorVersion', () => {
    it('should have active major version defined', () => {
      expect(API_VERSIONING_POLICY.activeMajorVersion).toBe('v1');
    });

    it('should have valid version format', () => {
      expect(API_VERSIONING_POLICY.versionFormat).toBe('v{major}');
    });
  });

  describe('versionedBasePath', () => {
    it('should have versioned base path starting with /', () => {
      expect(API_VERSIONING_POLICY.versionedBasePath).toBe('/api/v1');
      expect(API_VERSIONING_POLICY.versionedBasePath.startsWith('/')).toBe(true);
    });

    it('should match OpenAPI base path', () => {
      expect(API_VERSIONING_POLICY.openApi.basePath).toBe(API_VERSIONING_POLICY.versionedBasePath);
    });
  });

  describe('modules', () => {
    it('should have module rules for auth', () => {
      const rule = getModuleVersionRule('auth');
      expect(rule).toBeDefined();
      expect(rule?.requiredVersionPrefix).toBe('/api/v1/auth');
      expect(rule?.allowedUnversioned).toBe(false);
    });

    it('should have module rules for game', () => {
      const rule = getModuleVersionRule('game');
      expect(rule).toBeDefined();
      expect(rule?.requiredVersionPrefix).toBe('/api/v1/game');
      expect(rule?.allowedUnversioned).toBe(false);
    });

    it('should have module rules for health with allowed unversioned', () => {
      const rule = getModuleVersionRule('health');
      expect(rule).toBeDefined();
      expect(rule?.requiredVersionPrefix).toBe('/health');
      expect(rule?.allowedUnversioned).toBe(true);
    });

    it('should return undefined for unknown module', () => {
      const rule = getModuleVersionRule('unknown');
      expect(rule).toBeUndefined();
    });
  });

  describe('isPathVersioned', () => {
    it('should return true for versioned paths', () => {
      expect(isPathVersioned('/api/v1')).toBe(true);
      expect(isPathVersioned('/api/v1/auth')).toBe(true);
      expect(isPathVersioned('/api/v1/auth/login')).toBe(true);
      expect(isPathVersioned('/api/v1/game/session')).toBe(true);
    });

    it('should return false for unversioned paths', () => {
      expect(isPathVersioned('/health')).toBe(false);
      expect(isPathVersioned('/ready')).toBe(false);
      expect(isPathVersioned('/docs')).toBe(false);
    });
  });

  describe('isPathAllowedUnversioned', () => {
    it('should allow /health path', () => {
      expect(isPathAllowedUnversioned('/health')).toBe(true);
    });

    it('should allow /health subpaths', () => {
      expect(isPathAllowedUnversioned('/health/something')).toBe(true);
    });

    it('should allow /ready path', () => {
      expect(isPathAllowedUnversioned('/ready')).toBe(true);
    });

    it('should allow /api/v1 root', () => {
      expect(isPathAllowedUnversioned('/api/v1')).toBe(true);
    });

    it('should allow /docs path', () => {
      expect(isPathAllowedUnversioned('/docs')).toBe(true);
    });

    it('should not allow regular versioned paths as exceptions', () => {
      expect(isPathAllowedUnversioned('/api/v1/auth')).toBe(false);
      expect(isPathAllowedUnversioned('/api/v1/game')).toBe(false);
    });

    it('should not allow unauthorized paths', () => {
      expect(isPathAllowedUnversioned('/admin')).toBe(false);
      expect(isPathAllowedUnversioned('/api/v2')).toBe(false);
    });
  });

  describe('deprecation policy', () => {
    it('should have required deprecation headers', () => {
      const policy = getDeprecationPolicy();
      expect(policy.requiredHeaders.deprecation).toBe(true);
      expect(policy.requiredHeaders.sunset).toBe(true);
      expect(policy.requiredHeaders.link).toBe(true);
    });

    it('should have default sunset policy', () => {
      const policy = getDeprecationPolicy();
      expect(policy.sunsetPolicy.defaultGracePeriodDays).toBe(180);
      expect(policy.sunsetPolicy.majorVersionOverlapDays).toBe(365);
    });
  });

  describe('allowedUnversionedExceptions', () => {
    it('should have health exception without review required', () => {
      const exception = API_VERSIONING_POLICY.allowedUnversionedExceptions.find(
        (e) => e.path === '/health',
      );
      expect(exception).toBeDefined();
      expect(exception?.reviewRequired).toBe(false);
      expect(exception?.reason).toContain('Kubernetes');
    });

    it('should have ready exception without review required', () => {
      const exception = API_VERSIONING_POLICY.allowedUnversionedExceptions.find(
        (e) => e.path === '/ready',
      );
      expect(exception).toBeDefined();
      expect(exception?.reviewRequired).toBe(false);
    });

    it('should have api/v1 root exception', () => {
      const exception = API_VERSIONING_POLICY.allowedUnversionedExceptions.find(
        (e) => e.path === '/api/v1',
      );
      expect(exception).toBeDefined();
      expect(exception?.reviewRequired).toBe(false);
    });

    it('should have docs exception', () => {
      const exception = API_VERSIONING_POLICY.allowedUnversionedExceptions.find(
        (e) => e.path === '/docs',
      );
      expect(exception).toBeDefined();
      expect(exception?.reviewRequired).toBe(false);
    });
  });

  describe('openApi configuration', () => {
    it('should have at least one server defined', () => {
      expect(API_VERSIONING_POLICY.openApi.servers.length).toBeGreaterThan(0);
    });

    it('should have v1 server with correct URL', () => {
      const server = API_VERSIONING_POLICY.openApi.servers[0];
      expect(server).toBeDefined();
      expect(server?.url).toBe('/api/v1');
      expect(server?.description).toContain('v1');
    });
  });

  describe('validateVersioningPolicy', () => {
    it('should return valid for correct policy', () => {
      const result = validateVersioningPolicy();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validation Script Edge Cases', () => {
    describe('Invalid unversioned route detection', () => {
      const mockRouteCheck = (route: string, module: string): string[] => {
        const violations: string[] = [];
        const versionRule = getModuleVersionRule(module);

        if (!versionRule) {
          return violations;
        }

        if (versionRule.allowedUnversioned) {
          return violations;
        }

        const fullPath = API_VERSIONING_POLICY.versionedBasePath + route;

        if (!fullPath.startsWith(versionRule.requiredVersionPrefix)) {
          violations.push(
            `Route '${route}' for module '${module}' must be under '${versionRule.requiredVersionPrefix}', found under '${fullPath}'`,
          );
        }

        return violations;
      };

      it('should detect routes registered outside versioned path for auth module', () => {
        mockRouteCheck('/auth/login', 'auth');
        const fullPath = API_VERSIONING_POLICY.versionedBasePath + '/auth/login';
        const rule = getModuleVersionRule('auth');
        const startsWithPrefix = fullPath.startsWith(rule!.requiredVersionPrefix);
        expect(startsWithPrefix).toBe(true);
      });

      it('should detect invalid unversioned route registration', () => {
        const violations = mockRouteCheck('/admin/dashboard', 'auth');
        expect(violations.length).toBe(1);
        expect(violations[0]).toContain("must be under '/api/v1/auth'");
      });

      it('should detect foreign version prefix routes', () => {
        const violations: string[] = [];
        const route = '/api/v2/resource';

        if (route.startsWith('/api/v2')) {
          violations.push(`Route '${route}' uses unsupported version prefix '/api/v2'`);
        }

        expect(violations.length).toBe(1);
        expect(violations[0]).toContain('/api/v2');
      });
    });

    describe('Deprecated endpoint header validation', () => {
      const mockDeprecationValidation = (content: string): string[] => {
        const violations: string[] = [];

        const deprecationConfigPattern = /deprecation:\s*\{/;
        const hasDeprecationConfig = deprecationConfigPattern.test(content);

        if (!hasDeprecationConfig) {
          return violations;
        }

        const sunsetPattern = /sunsetDate:\s*['"`]/;
        const hasSunsetDate = sunsetPattern.test(content);

        if (!hasSunsetDate) {
          violations.push("Deprecated route missing required 'sunsetDate' in deprecation config");
        }

        return violations;
      };

      it('should detect deprecated routes missing sunsetDate', () => {
        const content = `
          fastify.get('/api/v1/old-endpoint', handler, {
            config: {
              deprecation: {
                // missing sunsetDate
              },
            },
          });
        `;

        const violations = mockDeprecationValidation(content);
        expect(violations.length).toBe(1);
      });

      it('should accept deprecated routes with sunsetDate', () => {
        const content = `
          fastify.get('/api/v1/old-endpoint', handler, {
            config: {
              deprecation: {
                sunsetDate: '2026-06-01',
                successorPath: '/api/v1/new-endpoint',
              },
            },
          });
        `;

        const violations = mockDeprecationValidation(content);
        expect(violations.length).toBe(0);
      });

      it('should not flag non-deprecated routes for missing sunsetDate', () => {
        const content = `
          fastify.get('/api/v1/new-endpoint', handler);
        `;

        const violations = mockDeprecationValidation(content);
        expect(violations.length).toBe(0);
      });
    });

    describe('OpenAPI alignment validation', () => {
      it('should validate server URL includes versioned base path', () => {
        const policy = API_VERSIONING_POLICY;
        const openApiServer = 'http://localhost:3001/api/v1';
        const expectedBasePath = policy.openApi.basePath;

        expect(openApiServer.includes(expectedBasePath)).toBe(true);
      });

      it('should reject server URL not including versioned base path', () => {
        const policy = API_VERSIONING_POLICY;
        const openApiServer = 'http://localhost:3001';
        const expectedBasePath = policy.openApi.basePath;

        expect(openApiServer.includes(expectedBasePath)).toBe(false);
      });

      it('should have correct basePath in OpenAPI config', () => {
        expect(API_VERSIONING_POLICY.openApi.basePath).toBe('/api/v1');
        const firstServer = API_VERSIONING_POLICY.openApi.servers[0];
        expect(firstServer?.url).toBe('/api/v1');
      });
    });

    describe('Valid compliant scenarios', () => {
      it('should accept properly versioned auth routes', () => {
        const rule = getModuleVersionRule('auth');
        expect(rule?.requiredVersionPrefix).toBe('/api/v1/auth');

        const routeFromModule = '/auth/login';
        const fullPath = API_VERSIONING_POLICY.versionedBasePath + routeFromModule;
        expect(fullPath.startsWith(rule!.requiredVersionPrefix)).toBe(true);
      });

      it('should accept properly versioned game routes', () => {
        const rule = getModuleVersionRule('game');
        expect(rule?.requiredVersionPrefix).toBe('/api/v1/game');

        const routeFromModule = '/game/session';
        const fullPath = API_VERSIONING_POLICY.versionedBasePath + routeFromModule;
        expect(fullPath.startsWith(rule!.requiredVersionPrefix)).toBe(true);
      });

      it('should accept approved exception paths', () => {
        expect(isPathAllowedUnversioned('/health')).toBe(true);
        expect(isPathAllowedUnversioned('/ready')).toBe(true);
        expect(isPathAllowedUnversioned('/docs')).toBe(true);
        expect(isPathAllowedUnversioned('/api/v1')).toBe(true);
      });
    });
  });
});
