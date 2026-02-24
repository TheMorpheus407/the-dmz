import { describe, expect, it } from 'vitest';

import {
  buildSecurityHeadersPolicy,
  buildCspHeaderValue,
  M1_WEB_SECURITY_HEADERS_POLICY,
  securityHeadersPolicySchema,
  ROUTE_GROUPS,
  type EnvironmentMode,
} from '@the-dmz/shared';

describe('Security Headers Contract', () => {
  describe('buildSecurityHeadersPolicy', () => {
    it('generates strict CSP for production environment', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: ['https://example.com'],
      });

      expect(policy.csp.includeTrustedTypes).toBe(true);
      expect(policy.csp.includeHsts).toBe(true);
      expect(policy.csp.directives['script-src']).toContain("'self'");
      expect(policy.csp.directives['object-src']).toContain("'none'");
    });

    it('generates relaxed CSP for development environment', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'development',
        corsOrigins: [],
      });

      expect(policy.csp.includeTrustedTypes).toBe(false);
      expect(policy.csp.includeHsts).toBe(false);
      expect(policy.csp.directives['script-src']).toContain("'unsafe-eval'");
      expect(policy.csp.directives['script-src']).toContain("'unsafe-inline'");
    });

    it('generates test environment CSP without HSTS', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'test',
        corsOrigins: [],
      });

      expect(policy.csp.includeTrustedTypes).toBe(true);
      expect(policy.csp.includeHsts).toBe(false);
    });

    it('includes all route groups', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
      });

      expect(policy.routeGroups).toEqual(ROUTE_GROUPS);
    });

    it('applies frame-ancestors allowlist correctly', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
        frameAncestorsOrigins: ['https://lms.example.com', 'https://portal.example.com'],
      });

      expect(policy.frameAncestors.mode).toBe('allowlist');
      expect(policy.frameAncestors.allowedOrigins).toEqual([
        'https://lms.example.com',
        'https://portal.example.com',
      ]);
      expect(policy.csp.directives['frame-ancestors']).toEqual([
        'https://lms.example.com',
        'https://portal.example.com',
      ]);
    });

    it('applies frame-ancestors deny when no origins specified', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
        frameAncestorsOrigins: [],
      });

      expect(policy.frameAncestors.mode).toBe('deny');
      expect(policy.frameAncestors.allowedOrigins).toEqual([]);
      expect(policy.csp.directives['frame-ancestors']).toContain("'none'");
    });

    it('includes WebSocket origins for CORS origins', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: ['http://localhost:5173', 'https://api.example.com'],
      });

      expect(policy.csp.directives['connect-src']).toContain('ws://localhost:5173');
      expect(policy.csp.directives['connect-src']).toContain('wss://api.example.com');
    });

    it('includes additional connect sources', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
        additionalConnectSrc: 'https://analytics.example.com,https://metrics.example.com',
      });

      expect(policy.csp.directives['connect-src']).toContain('https://analytics.example.com');
      expect(policy.csp.directives['connect-src']).toContain('https://metrics.example.com');
    });

    it('includes additional image sources', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
        additionalImgSrc: 'https://cdn.example.com',
      });

      expect(policy.csp.directives['img-src']).toContain('https://cdn.example.com');
    });

    it('applies COEP policy correctly', () => {
      const requireCorp = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
        coepPolicy: 'require-corp',
      });

      expect(requireCorp.crossOriginEmbedderPolicy).toBe('require-corp');

      const credentialless = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
        coepPolicy: 'credentialless',
      });

      expect(credentialless.crossOriginEmbedderPolicy).toBe('credentialless');
    });
  });

  describe('buildCspHeaderValue', () => {
    it('builds valid CSP header string', () => {
      const directives = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
      };

      const header = buildCspHeaderValue(directives);

      expect(header).toContain("default-src 'self'");
      expect(header).toContain("script-src 'self'");
      expect(header).toContain("style-src 'self' 'unsafe-inline'");
      expect(header).toContain("img-src 'self' data:");
    });

    it('excludes empty directive values', () => {
      const directives = {
        'default-src': ["'self'"],
        'upgrade-insecure-requests': [],
      };

      const header = buildCspHeaderValue(directives);

      expect(header).toContain("default-src 'self'");
      expect(header).not.toContain('upgrade-insecure-requests');
    });
  });

  describe('M1_WEB_SECURITY_HEADERS_POLICY', () => {
    it('is a valid security headers policy', () => {
      const result = securityHeadersPolicySchema.safeParse(M1_WEB_SECURITY_HEADERS_POLICY);
      expect(result.success).toBe(true);
    });

    it('has required security headers', () => {
      expect(M1_WEB_SECURITY_HEADERS_POLICY.xFrameOptions).toBe('deny');
      expect(M1_WEB_SECURITY_HEADERS_POLICY.xContentTypeOptions).toBe(true);
      expect(M1_WEB_SECURITY_HEADERS_POLICY.referrerPolicy).toBe('strict-origin-when-cross-origin');
      expect(M1_WEB_SECURITY_HEADERS_POLICY.permissionsPolicy).toBeDefined();
      expect(M1_WEB_SECURITY_HEADERS_POLICY.crossOriginOpenerPolicy).toBe('same-origin');
    });
  });

  describe('environment-specific policies', () => {
    const envs: EnvironmentMode[] = ['development', 'test', 'production'];

    envs.forEach((env) => {
      it(`generates valid policy for ${env} environment`, () => {
        const policy = buildSecurityHeadersPolicy({
          environment: env,
          corsOrigins: [],
        });

        const result = securityHeadersPolicySchema.safeParse(policy);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('clickjacking protection', () => {
    it('sets X-Frame-Options to deny by default', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
      });

      expect(policy.xFrameOptions).toBe('deny');
    });

    it('includes frame-ancestors in CSP', () => {
      const denyPolicy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
        frameAncestorsOrigins: [],
      });

      expect(denyPolicy.csp.directives['frame-ancestors']).toContain("'none'");

      const allowPolicy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
        frameAncestorsOrigins: ['https://example.com'],
      });

      expect(allowPolicy.csp.directives['frame-ancestors']).toContain('https://example.com');
    });
  });

  describe('Trusted Types', () => {
    it('enables Trusted Types in production', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
      });

      expect(policy.csp.includeTrustedTypes).toBe(true);
    });

    it('disables Trusted Types in development', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'development',
        corsOrigins: [],
      });

      expect(policy.csp.includeTrustedTypes).toBe(false);
    });

    it('enables Trusted Types in test (for coverage)', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'test',
        corsOrigins: [],
      });

      expect(policy.csp.includeTrustedTypes).toBe(true);
    });
  });

  describe('HSTS', () => {
    it('enables HSTS in production', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'production',
        corsOrigins: [],
      });

      expect(policy.strictTransportSecurity).not.toBeNull();
      expect(policy.strictTransportSecurity?.maxAge).toBe(63072000);
      expect(policy.strictTransportSecurity?.includeSubDomains).toBe(true);
      expect(policy.strictTransportSecurity?.preload).toBe(true);
    });

    it('disables HSTS in development', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'development',
        corsOrigins: [],
      });

      expect(policy.strictTransportSecurity).toBeNull();
    });

    it('disables HSTS in test', () => {
      const policy = buildSecurityHeadersPolicy({
        environment: 'test',
        corsOrigins: [],
      });

      expect(policy.strictTransportSecurity).toBeNull();
    });
  });
});
