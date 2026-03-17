import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import * as adminApi from '$lib/api/admin';
import { apiClient } from '$lib/api/client';

describe('admin API', () => {
  describe('getDashboard', () => {
    it('should return dashboard data on success', async () => {
      const mockDashboardData = {
        tenantInfo: {
          tenantId: '123',
          name: 'Test Tenant',
          slug: 'test-tenant',
          domain: 'test.example.com',
          tier: 'enterprise',
          status: 'active',
          dataRegion: 'eu',
          planId: 'enterprise',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        activeUsers: {
          activeSessionCount: 10,
          usersOnlineLast15Min: 5,
          dailyActiveUsers: 50,
          weeklyActiveUsers: 100,
          monthlyActiveUsers: 500,
          userGrowthTrend: [
            { date: '2024-01-01', count: 10 },
            { date: '2024-01-02', count: 15 },
          ],
        },
        metrics: {
          totalUsers: 100,
          usersByRole: [
            { role: 'admin', count: 5 },
            { role: 'learner', count: 95 },
          ],
          recentAdminActionsCount: 20,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockDashboardData,
      });

      const result = await adminApi.getDashboard();

      expect(result.data).toEqual(mockDashboardData);
      expect(result.error).toBeUndefined();
    });

    it('should return error on API failure', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        error: {
          category: 'network' as const,
          code: 'NETWORK_ERROR',
          message: 'Network error',
          status: 0,
          retryable: true,
        },
      });

      const result = await adminApi.getDashboard();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });

    it('should return error on invalid response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: undefined,
      });

      const result = await adminApi.getDashboard();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_RESPONSE');
    });
  });
});
