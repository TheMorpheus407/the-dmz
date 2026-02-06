import { describe, expect, it, beforeEach } from 'vitest';

import { loadFrontendConfig, resetFrontendConfigCache } from './env.js';

beforeEach(() => {
  resetFrontendConfigCache();
});

describe('loadFrontendConfig', () => {
  it('parses valid environment variables', () => {
    const config = loadFrontendConfig({
      PUBLIC_API_BASE_URL: '/api/v1',
      PUBLIC_ENVIRONMENT: 'development',
    });

    expect(config.PUBLIC_API_BASE_URL).toBe('/api/v1');
    expect(config.PUBLIC_ENVIRONMENT).toBe('development');
  });

  it('applies defaults when env is empty', () => {
    const config = loadFrontendConfig({});

    expect(config.PUBLIC_API_BASE_URL).toBe('/api/v1');
    expect(config.PUBLIC_ENVIRONMENT).toBe('development');
  });

  it('caches the result after first call', () => {
    const config1 = loadFrontendConfig({
      PUBLIC_API_BASE_URL: '/api/v1',
      PUBLIC_ENVIRONMENT: 'production',
    });

    // Second call with different env should return the cached result
    const config2 = loadFrontendConfig({
      PUBLIC_API_BASE_URL: '/other',
      PUBLIC_ENVIRONMENT: 'development',
    });

    expect(config1).toBe(config2);
    expect(config2.PUBLIC_ENVIRONMENT).toBe('production');
  });

  it('throws on invalid PUBLIC_ENVIRONMENT', () => {
    expect(() =>
      loadFrontendConfig({
        PUBLIC_API_BASE_URL: '/api/v1',
        PUBLIC_ENVIRONMENT: 'invalid',
      }),
    ).toThrow(/Invalid frontend environment configuration/);
  });

  it('throws on empty PUBLIC_API_BASE_URL', () => {
    expect(() =>
      loadFrontendConfig({
        PUBLIC_API_BASE_URL: '',
        PUBLIC_ENVIRONMENT: 'development',
      }),
    ).toThrow(/Invalid frontend environment configuration/);
  });

  it('accepts absolute URL for PUBLIC_API_BASE_URL', () => {
    const config = loadFrontendConfig({
      PUBLIC_API_BASE_URL: 'https://api.example.com/api/v1',
      PUBLIC_ENVIRONMENT: 'production',
    });

    expect(config.PUBLIC_API_BASE_URL).toBe('https://api.example.com/api/v1');
  });
});
