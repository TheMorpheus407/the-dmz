import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { resetFrontendConfigCache } from '$lib/config/env.js';
import { parseFrontendEnv } from '@the-dmz/shared';

vi.mock('$lib/config/env.js', () => ({
  loadFrontendConfig: vi.fn(),
  resetFrontendConfigCache: vi.fn(),
}));

describe('hooks.server.ts CSP/COEP Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFrontendConfigCache();
  });

  afterEach(() => {
    resetFrontendConfigCache();
  });

  describe('COEP_POLICY validation via parseFrontendEnv', () => {
    it('rejects invalid COEP_POLICY values at parse time', () => {
      const invalidEnv = {
        PUBLIC_ENVIRONMENT: 'test',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'invalid-policy',
      };

      expect(() => parseFrontendEnv(invalidEnv)).toThrow();
    });

    it('accepts valid COEP_POLICY: require-corp', () => {
      const validEnv = {
        PUBLIC_ENVIRONMENT: 'test',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp',
      };

      const config = parseFrontendEnv(validEnv);
      expect(config.COEP_POLICY).toBe('require-corp');
    });

    it('accepts valid COEP_POLICY: credentialless', () => {
      const validEnv = {
        PUBLIC_ENVIRONMENT: 'test',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'credentialless',
      };

      const config = parseFrontendEnv(validEnv);
      expect(config.COEP_POLICY).toBe('credentialless');
    });
  });

  describe('CSP_FRAME_ANCESTORS validation via parseFrontendEnv', () => {
    it('uses default CSP_FRAME_ANCESTORS when not provided', () => {
      const envWithoutCsp = {
        PUBLIC_ENVIRONMENT: 'test',
        PUBLIC_API_BASE_URL: '/api/v1',
        COEP_POLICY: 'require-corp',
      };

      const config = parseFrontendEnv(envWithoutCsp);
      expect(config.CSP_FRAME_ANCESTORS).toBe('none');
    });

    it('accepts custom CSP_FRAME_ANCESTORS value', () => {
      const envWithCustomCsp = {
        PUBLIC_ENVIRONMENT: 'production',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'https://lms.example.com,https://portal.example.com',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp',
      };

      const config = parseFrontendEnv(envWithCustomCsp);
      expect(config.CSP_FRAME_ANCESTORS).toBe('https://lms.example.com,https://portal.example.com');
    });
  });

  describe('CSP_CONNECT_SRC and CSP_IMG_SRC validation via parseFrontendEnv', () => {
    it('uses empty string default for CSP_CONNECT_SRC when not provided', () => {
      const envWithoutConnectSrc = {
        PUBLIC_ENVIRONMENT: 'test',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        COEP_POLICY: 'require-corp',
      };

      const config = parseFrontendEnv(envWithoutConnectSrc);
      expect(config.CSP_CONNECT_SRC).toBe('');
    });

    it('uses empty string default for CSP_IMG_SRC when not provided', () => {
      const envWithoutImgSrc = {
        PUBLIC_ENVIRONMENT: 'test',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        COEP_POLICY: 'require-corp',
      };

      const config = parseFrontendEnv(envWithoutImgSrc);
      expect(config.CSP_IMG_SRC).toBe('');
    });

    it('accepts custom CSP_CONNECT_SRC value', () => {
      const envWithCustomConnectSrc = {
        PUBLIC_ENVIRONMENT: 'production',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: 'https://analytics.example.com,https://metrics.example.com',
        CSP_IMG_SRC: '',
        COEP_POLICY: 'require-corp',
      };

      const config = parseFrontendEnv(envWithCustomConnectSrc);
      expect(config.CSP_CONNECT_SRC).toBe(
        'https://analytics.example.com,https://metrics.example.com',
      );
    });

    it('accepts custom CSP_IMG_SRC value', () => {
      const envWithCustomImgSrc = {
        PUBLIC_ENVIRONMENT: 'production',
        PUBLIC_API_BASE_URL: '/api/v1',
        CSP_FRAME_ANCESTORS: 'none',
        CSP_CONNECT_SRC: '',
        CSP_IMG_SRC: 'https://cdn.example.com',
        COEP_POLICY: 'require-corp',
      };

      const config = parseFrontendEnv(envWithCustomImgSrc);
      expect(config.CSP_IMG_SRC).toBe('https://cdn.example.com');
    });
  });
});
