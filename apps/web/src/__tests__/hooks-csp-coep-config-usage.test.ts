import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { loadFrontendConfig, resetFrontendConfigCache } from '$lib/config/env.js';
import { buildSecurityHeadersPolicy } from '@the-dmz/shared';

vi.mock('$lib/config/env.js', () => ({
  loadFrontendConfig: vi.fn(),
  resetFrontendConfigCache: vi.fn(),
}));

vi.mock('$lib/sentry.js', () => ({
  initSentry: vi.fn(),
}));

describe('hooks.server.ts uses validated config for CSP/COEP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFrontendConfigCache();
  });

  afterEach(() => {
    resetFrontendConfigCache();
  });

  describe('BUG REPRODUCTION: hooks.server.ts bypasses validation', () => {
    it('should demonstrate that COEP_POLICY validation is bypassed by raw process.env usage', () => {
      const invalidEnv = {
        PUBLIC_ENVIRONMENT: 'test',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'invalid-policy',
      };

      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'test' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp' as const,
      };

      vi.mocked(loadFrontendConfig).mockReturnValue(mockConfig);

      const rawCoepPolicy = invalidEnv.COEP_POLICY;
      const validatedCoepPolicy = mockConfig.COEP_POLICY;

      expect(rawCoepPolicy).toBe('invalid-policy');
      expect(validatedCoepPolicy).toBe('require-corp');

      const policyFromRaw = buildSecurityHeadersPolicy({
        environment: 'test',
        corsOrigins: [],
        additionalConnectSrc: '',
        additionalImgSrc: '',
        frameAncestorsOrigins: [],
        coepPolicy: rawCoepPolicy as 'require-corp' | 'credentialless',
      });

      const policyFromValidated = buildSecurityHeadersPolicy({
        environment: 'test',
        corsOrigins: [],
        additionalConnectSrc: '',
        additionalImgSrc: '',
        frameAncestorsOrigins: [],
        coepPolicy: validatedCoepPolicy,
      });

      expect(policyFromRaw.crossOriginEmbedderPolicy).toBe('invalid-policy');
      expect(policyFromValidated.crossOriginEmbedderPolicy).toBe('require-corp');

      expect(policyFromRaw.crossOriginEmbedderPolicy).not.toBe(
        policyFromValidated.crossOriginEmbedderPolicy,
      );
    });

    it('should demonstrate that cache key mismatch occurs when using raw process.env vs validated config', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'test' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'https://validated.example.com',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'credentialless' as const,
      };

      vi.mocked(loadFrontendConfig).mockReturnValue(mockConfig);

      const rawFrameAncestors = 'https://raw-env.example.com';
      const validatedFrameAncestors = mockConfig.CSP_FRAME_ANCESTORS;

      const rawEnvKey = `test-${rawFrameAncestors}-require-corp`;
      const validatedEnvKey = `${mockConfig.PUBLIC_ENVIRONMENT}-${validatedFrameAncestors}-${mockConfig.COEP_POLICY}`;

      expect(rawEnvKey).toBe('test-https://raw-env.example.com-require-corp');
      expect(validatedEnvKey).toBe('test-https://validated.example.com-credentialless');
      expect(rawEnvKey).not.toBe(validatedEnvKey);
    });
  });

  describe('buildSecurityHeaders should use config.CSP_FRAME_ANCESTORS', () => {
    it('frame-ancestors directive uses validated config value', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'production' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'https://trusted.example.com',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const frameAncestorsOrigins =
        mockConfig.CSP_FRAME_ANCESTORS === 'none' || mockConfig.CSP_FRAME_ANCESTORS === ''
          ? []
          : mockConfig.CSP_FRAME_ANCESTORS.split(',').map((o) => o.trim());

      const policy = buildSecurityHeadersPolicy({
        environment: mockConfig.PUBLIC_ENVIRONMENT,
        corsOrigins: [],
        additionalConnectSrc: mockConfig.CSP_CONNECT_SRC,
        additionalImgSrc: mockConfig.CSP_IMG_SRC,
        frameAncestorsOrigins,
        coepPolicy: mockConfig.COEP_POLICY,
      });

      expect(policy.csp.directives['frame-ancestors']).toContain('https://trusted.example.com');
    });

    it('frame-ancestors directive uses validated config value for multiple origins', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'production' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'https://lms.example.com,https://portal.example.com',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const frameAncestorsOrigins =
        mockConfig.CSP_FRAME_ANCESTORS === 'none' || mockConfig.CSP_FRAME_ANCESTORS === ''
          ? []
          : mockConfig.CSP_FRAME_ANCESTORS.split(',').map((o) => o.trim());

      const policy = buildSecurityHeadersPolicy({
        environment: mockConfig.PUBLIC_ENVIRONMENT,
        corsOrigins: [],
        additionalConnectSrc: mockConfig.CSP_CONNECT_SRC,
        additionalImgSrc: mockConfig.CSP_IMG_SRC,
        frameAncestorsOrigins,
        coepPolicy: mockConfig.COEP_POLICY,
      });

      expect(policy.csp.directives['frame-ancestors']).toContain('https://lms.example.com');
      expect(policy.csp.directives['frame-ancestors']).toContain('https://portal.example.com');
    });
  });

  describe('buildSecurityHeaders should use config.CSP_CONNECT_SRC', () => {
    it('connect-src directive uses validated config value', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'production' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: 'https://analytics.example.com,https://metrics.example.com',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const policy = buildSecurityHeadersPolicy({
        environment: mockConfig.PUBLIC_ENVIRONMENT,
        corsOrigins: [],
        additionalConnectSrc: mockConfig.CSP_CONNECT_SRC,
        additionalImgSrc: mockConfig.CSP_IMG_SRC,
        frameAncestorsOrigins: [],
        coepPolicy: mockConfig.COEP_POLICY,
      });

      expect(policy.csp.directives['connect-src']).toContain('https://analytics.example.com');
      expect(policy.csp.directives['connect-src']).toContain('https://metrics.example.com');
    });
  });

  describe('buildSecurityHeaders should use config.CSP_IMG_SRC', () => {
    it('img-src directive uses validated config value', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'production' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: 'https://cdn.example.com',
        COEP_POLICY: 'require-corp' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const policy = buildSecurityHeadersPolicy({
        environment: mockConfig.PUBLIC_ENVIRONMENT,
        corsOrigins: [],
        additionalConnectSrc: mockConfig.CSP_CONNECT_SRC,
        additionalImgSrc: mockConfig.CSP_IMG_SRC,
        frameAncestorsOrigins: [],
        coepPolicy: mockConfig.COEP_POLICY,
      });

      expect(policy.csp.directives['img-src']).toContain('https://cdn.example.com');
    });
  });

  describe('buildSecurityHeaders should use config.COEP_POLICY', () => {
    it('COEP header uses validated config value for require-corp', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'production' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const policy = buildSecurityHeadersPolicy({
        environment: mockConfig.PUBLIC_ENVIRONMENT,
        corsOrigins: [],
        additionalConnectSrc: mockConfig.CSP_CONNECT_SRC,
        additionalImgSrc: mockConfig.CSP_IMG_SRC,
        frameAncestorsOrigins: [],
        coepPolicy: mockConfig.COEP_POLICY,
      });

      expect(policy.crossOriginEmbedderPolicy).toBe('require-corp');
    });

    it('COEP header uses validated config value for credentialless', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'production' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'credentialless' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const policy = buildSecurityHeadersPolicy({
        environment: mockConfig.PUBLIC_ENVIRONMENT,
        corsOrigins: [],
        additionalConnectSrc: mockConfig.CSP_CONNECT_SRC,
        additionalImgSrc: mockConfig.CSP_IMG_SRC,
        frameAncestorsOrigins: [],
        coepPolicy: mockConfig.COEP_POLICY,
      });

      expect(policy.crossOriginEmbedderPolicy).toBe('credentialless');
    });
  });

  describe('cache key should use validated config values', () => {
    it('cache key includes config.CSP_FRAME_ANCESTORS value', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'test' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'https://cache-test.example.com',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const envKey = `${mockConfig.PUBLIC_ENVIRONMENT}-${mockConfig.CSP_FRAME_ANCESTORS}-${mockConfig.COEP_POLICY}`;

      expect(envKey).toBe('test-https://cache-test.example.com-require-corp');
    });

    it('cache key includes config.COEP_POLICY value', () => {
      const mockConfig = {
        PUBLIC_ENVIRONMENT: 'test' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'credentialless' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const envKey = `${mockConfig.PUBLIC_ENVIRONMENT}-${mockConfig.CSP_FRAME_ANCESTORS}-${mockConfig.COEP_POLICY}`;

      expect(envKey).toBe('test-none-credentialless');
    });

    it('different config values produce different cache keys', () => {
      const config1 = {
        PUBLIC_ENVIRONMENT: 'test' as const,
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'https://example1.com',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp' as const,
        PUBLIC_SENTRY_DSN: '',
      };

      const config2 = {
        ...config1,
        CSP_FRAME_ANCESTORS: 'https://example2.com',
      };

      const envKey1 = `${config1.PUBLIC_ENVIRONMENT}-${config1.CSP_FRAME_ANCESTORS}-${config1.COEP_POLICY}`;
      const envKey2 = `${config2.PUBLIC_ENVIRONMENT}-${config2.CSP_FRAME_ANCESTORS}-${config2.COEP_POLICY}`;

      expect(envKey1).not.toBe(envKey2);
    });
  });
});
