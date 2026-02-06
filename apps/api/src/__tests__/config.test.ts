import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'info',
} as const;

describe('loadConfig', () => {
  it('defaults API server port to 3000', () => {
    const config = loadConfig({
      ...baseEnv,
      PORT: undefined,
      API_PORT: undefined,
    });

    expect(config.PORT).toBe(3000);
  });

  it('uses API_PORT when PORT is not set', () => {
    const config = loadConfig({
      ...baseEnv,
      PORT: undefined,
      API_PORT: '3011',
    });

    expect(config.PORT).toBe(3011);
  });

  it('prefers API_PORT when both PORT and API_PORT are provided', () => {
    const config = loadConfig({
      ...baseEnv,
      PORT: '3200',
      API_PORT: '3012',
    });

    expect(config.PORT).toBe(3012);
  });

  it('falls back to PORT when API_PORT is blank', () => {
    const config = loadConfig({
      ...baseEnv,
      PORT: '3200',
      API_PORT: '',
    });

    expect(config.PORT).toBe(3200);
  });

  it('rejects malformed API_PORT values', () => {
    expect(() =>
      loadConfig({
        ...baseEnv,
        PORT: '3200',
        API_PORT: '3000abc',
      }),
    ).toThrow(/Invalid environment configuration/);
  });
});
