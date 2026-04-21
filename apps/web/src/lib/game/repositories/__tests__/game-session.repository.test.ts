import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api/game', () => ({
  bootstrapGameSession: vi.fn(),
  getGameSession: vi.fn(),
}));

import type { GameSessionBootstrap } from '@the-dmz/shared/schemas';
import { bootstrapGameSession, getGameSession } from '$lib/api/game';

import {
  GameSessionRepository,
  type GameSessionRepositoryInterface,
} from '../game-session.repository';

describe('GameSessionRepository', () => {
  let repository: GameSessionRepositoryInterface;

  const mockBootstrapData: GameSessionBootstrap = {
    schemaVersion: 1,
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    sessionId: '660e8400-e29b-41d4-a716-446655440001',
    userId: '770e8400-e29b-41d4-a716-446655440002',
    day: 1,
    funds: 1000,
    clientCount: 5,
    threatLevel: 'low',
    facilityLoadout: {
      defenseLevel: 1,
      serverLevel: 1,
      networkLevel: 1,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new GameSessionRepository();
  });

  describe('interface compliance', () => {
    it('should have a bootstrap method', () => {
      expect(typeof repository.bootstrap).toBe('function');
    });

    it('should have a fetchState method', () => {
      expect(typeof repository.fetchState).toBe('function');
    });

    it('bootstrap should return Promise with data or error', async () => {
      vi.mocked(bootstrapGameSession).mockResolvedValue({ data: mockBootstrapData });

      const result = await repository.bootstrap();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });

    it('fetchState should return Promise with data or error', async () => {
      vi.mocked(getGameSession).mockResolvedValue({ data: mockBootstrapData });

      const result = await repository.fetchState();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });
  });

  describe('bootstrap', () => {
    it('should call bootstrapGameSession API', async () => {
      vi.mocked(bootstrapGameSession).mockResolvedValue({ data: mockBootstrapData });

      await repository.bootstrap();

      expect(bootstrapGameSession).toHaveBeenCalledTimes(1);
    });

    it('should return data on success', async () => {
      vi.mocked(bootstrapGameSession).mockResolvedValue({ data: mockBootstrapData });

      const result = await repository.bootstrap();

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockBootstrapData);
    });

    it('should return error on API error', async () => {
      const apiError = {
        category: 'server' as const,
        code: 'UNKNOWN_ERROR',
        message: 'Failed',
        status: 500,
        retryable: false,
      };
      vi.mocked(bootstrapGameSession).mockResolvedValue({ error: apiError });

      const result = await repository.bootstrap();

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual(apiError);
    });
  });

  describe('fetchState', () => {
    it('should call getGameSession API', async () => {
      vi.mocked(getGameSession).mockResolvedValue({ data: mockBootstrapData });

      await repository.fetchState();

      expect(getGameSession).toHaveBeenCalledTimes(1);
    });

    it('should return data on success', async () => {
      vi.mocked(getGameSession).mockResolvedValue({ data: mockBootstrapData });

      const result = await repository.fetchState();

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockBootstrapData);
    });

    it('should return error on API error', async () => {
      const apiError = {
        category: 'server' as const,
        code: 'NOT_FOUND',
        message: 'Session not found',
        status: 404,
        retryable: false,
      };
      vi.mocked(getGameSession).mockResolvedValue({ error: apiError });

      const result = await repository.fetchState();

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual(apiError);
    });
  });

  describe('dependency injection', () => {
    it('should work with a mock implementation', async () => {
      const mockRepository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
        fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
      };

      const result = await mockRepository.bootstrap();

      expect(result.data).toEqual(mockBootstrapData);
      expect(mockRepository.bootstrap).toHaveBeenCalledTimes(1);
    });

    it('should allow stores to be tested without mocking API functions directly', async () => {
      const mockRepository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
        fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
      };

      const storeResult = await mockRepository.bootstrap();

      expect(storeResult.error).toBeUndefined();
      expect(bootstrapGameSession).not.toHaveBeenCalled();
    });
  });
});

describe('GameSessionRepositoryInterface', () => {
  it('should define the contract for game session data retrieval', () => {
    const mockRepository: GameSessionRepositoryInterface = {
      bootstrap: vi.fn(),
      fetchState: vi.fn(),
    };

    expect(mockRepository.bootstrap).toBeDefined();
    expect(mockRepository.fetchState).toBeDefined();
  });
});
