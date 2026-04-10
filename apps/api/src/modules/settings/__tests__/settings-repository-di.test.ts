import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

import { getDatabaseClient } from '../../../shared/database/connection.js';
import { SettingsRepository } from '../settings.repository.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

describe('SettingsRepository DI Compliance', () => {
  const createMockDb = (): DatabaseClient => {
    return {
      query: {
        userProfiles: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
      },
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    } as unknown as DatabaseClient;
  };

  const createMockConfig = (): AppConfig => ({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    DATABASE_POOL_SIZE: 1,
    REDIS_URL: 'redis://localhost:6379',
    SESSION_SECRET: 'test-secret-at-least-32-chars-long',
    SESSION_TTL_SECONDS: 3600,
    CSRF_SECRET: 'test-csrf-secret-at-least-32-chars',
    API_PORT: 3001,
    API_HOST: 'localhost',
    CORS_ORIGINS: ['http://localhost:5173'],
    RATE_LIMIT_MAX: 100,
    RATE_LIMIT_WINDOW_MS: 60000,
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'test@example.com',
    JWT_PUBLIC_KEY: 'test-public-key',
    JWT_PRIVATE_KEY: 'test-private-key',
    TRUST_PROXY: true,
  });

  describe('SettingsRepository.create()', () => {
    it('should throw TypeError when config is undefined', () => {
      const mockDb = createMockDb();
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

      expect(() => {
        SettingsRepository.create(undefined as unknown as AppConfig);
      }).toThrow(TypeError);
    });

    it('should throw TypeError when config is null', () => {
      const mockDb = createMockDb();
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

      expect(() => {
        SettingsRepository.create(null as unknown as AppConfig);
      }).toThrow(TypeError);
    });

    it('should throw TypeError when config is not provided (no argument)', () => {
      const mockDb = createMockDb();
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

      expect(() => {
        // @ts-expect-error - intentionally calling without config to test DI requirement
        SettingsRepository.create();
      }).toThrow(TypeError);
    });

    it('should create repository instance when valid config is provided', () => {
      const mockDb = createMockDb();
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
      const mockConfig = createMockConfig();

      const repository = SettingsRepository.create(mockConfig);

      expect(repository).toBeInstanceOf(SettingsRepository);
      expect(getDatabaseClient).toHaveBeenCalledWith(mockConfig);
    });
  });
});
