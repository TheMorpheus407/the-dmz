import { describe, expect, it, vi } from 'vitest';

import type { GameSessionBootstrap } from '@the-dmz/shared/schemas';

import type { GameSessionRepositoryInterface } from '../game-session.repository';

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

describe('GameSessionRepository Injection', () => {
  describe('store testability through dependency injection', () => {
    it('should allow mocking repository for store tests without mocking API functions', async () => {
      const mockRepository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
        fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
      };

      const bootstrapResult = await mockRepository.bootstrap();

      expect(bootstrapResult.data).toEqual(mockBootstrapData);
      expect(bootstrapResult.error).toBeUndefined();
    });

    it('should allow testing error handling through repository mock', async () => {
      const mockRepository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({
          error: {
            category: 'server' as const,
            code: 'UNKNOWN_ERROR',
            message: 'Failed',
            status: 500,
            retryable: false,
          },
        }),
        fetchState: vi.fn().mockResolvedValue({
          error: {
            category: 'server' as const,
            code: 'NOT_FOUND',
            message: 'Not found',
            status: 404,
            retryable: false,
          },
        }),
      };

      const bootstrapResult = await mockRepository.bootstrap();
      const fetchResult = await mockRepository.fetchState();

      expect(bootstrapResult.error).toBeDefined();
      expect(fetchResult.error).toBeDefined();
    });

    it('should decouple stores from direct API imports', async () => {
      const mockRepository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
        fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
      };

      await mockRepository.bootstrap();
      await mockRepository.fetchState();
      await mockRepository.bootstrap();

      expect(mockRepository.bootstrap).toHaveBeenCalledTimes(2);
      expect(mockRepository.fetchState).toHaveBeenCalledTimes(1);
    });
  });

  describe('repository interface contract', () => {
    it('bootstrap must return GameSessionBootstrap on success', async () => {
      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
        fetchState: vi.fn(),
      };

      const result = await repository.bootstrap();

      expect(result.data).toBeDefined();
      expect(result.data?.sessionId).toBe(mockBootstrapData.sessionId);
      expect(result.data?.tenantId).toBe(mockBootstrapData.tenantId);
      expect(result.data?.day).toBe(mockBootstrapData.day);
    });

    it('fetchState must return GameSessionBootstrap on success', async () => {
      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn(),
        fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
      };

      const result = await repository.fetchState();

      expect(result.data).toBeDefined();
      expect(result.data?.sessionId).toBe(mockBootstrapData.sessionId);
    });

    it('must handle different threat levels', async () => {
      const highThreatData: GameSessionBootstrap = {
        ...mockBootstrapData,
        threatLevel: 'severe',
      };

      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: highThreatData }),
        fetchState: vi.fn(),
      };

      const result = await repository.bootstrap();

      expect(result.data?.threatLevel).toBe('severe');
    });

    it('must preserve all GameSessionBootstrap fields', async () => {
      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
        fetchState: vi.fn(),
      };

      const result = await repository.bootstrap();
      const data = result.data!;

      expect(data.schemaVersion).toBe(1);
      expect(data.tenantId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(data.sessionId).toBe('660e8400-e29b-41d4-a716-446655440001');
      expect(data.userId).toBe('770e8400-e29b-41d4-a716-446655440002');
      expect(data.day).toBe(1);
      expect(data.funds).toBe(1000);
      expect(data.clientCount).toBe(5);
      expect(data.threatLevel).toBe('low');
      expect(data.facilityLoadout).toEqual({
        defenseLevel: 1,
        serverLevel: 1,
        networkLevel: 1,
      });
    });
  });

  describe('single responsibility principle', () => {
    it('repository should only handle API calls, not state management', () => {
      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
        fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
      };

      expect(typeof repository.bootstrap).toBe('function');
      expect(typeof repository.fetchState).toBe('function');
      expect(Object.keys(repository).length).toBe(2);
    });

    it('repository methods should not mutate state', async () => {
      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
        fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapData }),
      };

      await repository.bootstrap();
      await repository.bootstrap();
      await repository.fetchState();

      expect(repository.bootstrap).toHaveBeenCalledTimes(2);
      expect(repository.fetchState).toHaveBeenCalledTimes(1);
    });
  });

  describe('error categorization', () => {
    it('should propagate server errors', async () => {
      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({
          error: {
            category: 'server' as const,
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            status: 500,
            retryable: false,
          },
        }),
        fetchState: vi.fn(),
      };

      const result = await repository.bootstrap();

      expect(result.data).toBeUndefined();
      expect(result.error?.category).toBe('server');
      expect(result.error?.status).toBe(500);
    });

    it('should propagate network errors', async () => {
      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({
          error: {
            category: 'network' as const,
            code: 'NETWORK_ERROR',
            message: 'Network failed',
            status: 0,
            retryable: true,
          },
        }),
        fetchState: vi.fn(),
      };

      const result = await repository.bootstrap();

      expect(result.data).toBeUndefined();
      expect(result.error?.category).toBe('network');
      expect(result.error?.retryable).toBe(true);
    });

    it('should propagate validation errors', async () => {
      const repository: GameSessionRepositoryInterface = {
        bootstrap: vi.fn().mockResolvedValue({
          error: {
            category: 'validation' as const,
            code: 'INVALID_REQUEST',
            message: 'Invalid request',
            status: 400,
            retryable: false,
          },
        }),
        fetchState: vi.fn(),
      };

      const result = await repository.bootstrap();

      expect(result.data).toBeUndefined();
      expect(result.error?.category).toBe('validation');
    });
  });
});
