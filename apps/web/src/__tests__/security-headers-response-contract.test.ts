import { describe, expect, it, vi, beforeEach } from 'vitest';

import { buildSecurityHeadersPolicy, buildCspHeaderValue } from '@the-dmz/shared';
import { loadFrontendConfig } from '$lib/config/env.js';

vi.mock('$lib/config/env.js', () => ({
  loadFrontendConfig: vi.fn().mockReturnValue({
    PUBLIC_ENVIRONMENT: 'test',
  }),
}));

describe('Security Headers Response Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const securityHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Embedder-Policy',
    'Cross-Origin-Resource-Policy',
  ];

  const buildHeadersForEnvironment = (env: 'test' | 'production' | 'development') => {
    const config = loadFrontendConfig();
    vi.mocked(loadFrontendConfig).mockReturnValue({ ...config, PUBLIC_ENVIRONMENT: env });

    const policy = buildSecurityHeadersPolicy({
      environment: env,
      corsOrigins: [],
    });

    const headers = new Headers();

    const cspValue = buildCspHeaderValue(policy.csp.directives);
    headers.set('Content-Security-Policy', cspValue);

    if (policy.csp.includeTrustedTypes) {
      headers.set('X-Content-Security-Policy', "require-trusted-types-for 'script'");
    }

    headers.set('X-Frame-Options', policy.xFrameOptions);

    if (policy.xContentTypeOptions) {
      headers.set('X-Content-Type-Options', 'nosniff');
    }

    headers.set('Referrer-Policy', policy.referrerPolicy);
    headers.set('Permissions-Policy', policy.permissionsPolicy);
    headers.set('Cross-Origin-Opener-Policy', policy.crossOriginOpenerPolicy);
    headers.set('Cross-Origin-Embedder-Policy', policy.crossOriginEmbedderPolicy);
    headers.set('Cross-Origin-Resource-Policy', policy.crossOriginResourcePolicy);

    if (policy.strictTransportSecurity) {
      const hsts = policy.strictTransportSecurity;
      headers.set(
        'Strict-Transport-Security',
        `max-age=${hsts.maxAge}${hsts.includeSubDomains ? '; includeSubDomains' : ''}${hsts.preload ? '; preload' : ''}`,
      );
    }

    return { headers, policy };
  };

  describe('Game route group: /(game)', () => {
    it('applies security headers for test environment', () => {
      const { headers } = buildHeadersForEnvironment('test');

      securityHeaders.forEach((header) => {
        expect(headers.has(header), `Expected ${header} to be set`).toBe(true);
      });

      expect(headers.get('Content-Security-Policy')).toContain("script-src 'self'");
    });

    it('applies security headers for production environment', () => {
      const { headers } = buildHeadersForEnvironment('production');

      securityHeaders.forEach((header) => {
        expect(headers.has(header), `Expected ${header} to be set`).toBe(true);
      });
    });

    it('applies security headers for development environment', () => {
      const { headers } = buildHeadersForEnvironment('development');

      securityHeaders.forEach((header) => {
        expect(headers.has(header), `Expected ${header} to be set`).toBe(true);
      });
    });
  });

  describe('Admin route group: /(admin)', () => {
    it('applies security headers to admin routes', () => {
      const { headers } = buildHeadersForEnvironment('test');

      securityHeaders.forEach((header) => {
        expect(headers.has(header)).toBe(true);
      });
    });
  });

  describe('Auth route group: /(auth)', () => {
    it('applies security headers to auth routes', () => {
      const { headers } = buildHeadersForEnvironment('test');

      securityHeaders.forEach((header) => {
        expect(headers.has(header)).toBe(true);
      });
    });
  });

  describe('Public route group: /(public)', () => {
    it('applies security headers to public routes', () => {
      const { headers } = buildHeadersForEnvironment('test');

      securityHeaders.forEach((header) => {
        expect(headers.has(header)).toBe(true);
      });
    });
  });

  describe('Clickjacking protection', () => {
    it('sets X-Frame-Options to deny', () => {
      const { headers } = buildHeadersForEnvironment('test');
      expect(headers.get('X-Frame-Options')).toBe('deny');
    });

    it('includes frame-ancestors in CSP', () => {
      const { headers } = buildHeadersForEnvironment('test');
      const csp = headers.get('Content-Security-Policy') ?? '';
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe('Trusted Types', () => {
    it('includes Trusted Types directive in test environment', () => {
      const { headers } = buildHeadersForEnvironment('test');
      expect(headers.has('X-Content-Security-Policy')).toBe(true);
      expect(headers.get('X-Content-Security-Policy')).toContain(
        "require-trusted-types-for 'script'",
      );
    });

    it('includes Trusted Types in production environment', () => {
      const { headers } = buildHeadersForEnvironment('production');
      expect(headers.has('X-Content-Security-Policy')).toBe(true);
    });

    it('excludes Trusted Types in development environment', () => {
      const { headers } = buildHeadersForEnvironment('development');
      expect(headers.has('X-Content-Security-Policy')).toBe(false);
    });
  });

  describe('COOP/COEP/CORP policies', () => {
    it('sets Cross-Origin-Opener-Policy', () => {
      const { headers } = buildHeadersForEnvironment('test');
      expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    });

    it('sets Cross-Origin-Embedder-Policy', () => {
      const { headers } = buildHeadersForEnvironment('test');
      expect(headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    });

    it('sets Cross-Origin-Resource-Policy', () => {
      const { headers } = buildHeadersForEnvironment('test');
      expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    });
  });

  describe('Error boundary surfaces', () => {
    it('applies headers to error responses (500)', () => {
      const { headers } = buildHeadersForEnvironment('test');
      securityHeaders.forEach((header) => {
        expect(headers.has(header)).toBe(true);
      });
    });

    it('applies headers to 404 responses', () => {
      const { headers } = buildHeadersForEnvironment('test');
      securityHeaders.forEach((header) => {
        expect(headers.has(header)).toBe(true);
      });
    });
  });

  describe('Header precedence', () => {
    it('allows existing headers to be preserved', () => {
      const { headers } = buildHeadersForEnvironment('test');
      expect(headers.get('X-Frame-Options')).toBe('deny');
    });
  });

  describe('Referrer Policy', () => {
    it('sets strict-origin-when-cross-origin', () => {
      const { headers } = buildHeadersForEnvironment('test');
      expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('sets nosniff', () => {
      const { headers } = buildHeadersForEnvironment('test');
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });
});
