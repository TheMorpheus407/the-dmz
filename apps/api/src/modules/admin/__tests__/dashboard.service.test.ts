import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDatabaseClient } from '../../../shared/database/connection.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../../config.js', () => ({
  loadConfig: vi.fn(),
}));

const mockConfig = {
  tenantId: 'tenant-test',
} as unknown as AppConfig;

const TENANT_ID = 'tenant-123';

const createMockTenantRow = (
  overrides: Partial<{
    tenantId: string;
    name: string;
    slug: string;
    domain: string | null;
    tier: string | null;
    status: string;
    dataRegion: string | null;
    planId: string | null;
    settings: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  tenantId: 'tenant-123',
  name: 'Test Tenant',
  slug: 'test-tenant',
  domain: 'test.example.com',
  tier: 'enterprise',
  status: 'active',
  dataRegion: 'us',
  planId: 'pro',
  settings: {
    training_campaigns: true,
    advanced_analytics: true,
    custom_branding: false,
    api_access: true,
    sso_enabled: false,
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-06-15T12:00:00Z'),
  ...overrides,
});

const createMockSessionMetrics = (
  overrides: Partial<{
    activeSessionCount: number;
    usersOnlineLast15Min: number;
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    userGrowthTrend: Array<{ date: string; count: number }>;
  }> = {},
) => ({
  activeSessionCount: 42,
  usersOnlineLast15Min: 15,
  dailyActiveUsers: 150,
  weeklyActiveUsers: 500,
  monthlyActiveUsers: 2000,
  userGrowthTrend: [
    { date: '2024-06-01', count: 100 },
    { date: '2024-06-02', count: 120 },
    { date: '2024-06-03', count: 110 },
  ],
  ...overrides,
});

const expectHasProperties = (obj: Record<string, unknown>, ...props: string[]) => {
  props.forEach((prop) => expect(obj).toHaveProperty(prop));
};

const mockDbSelectChain = vi.fn();

const createMockDb = (): DatabaseClient => {
  return {
    select: mockDbSelectChain,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    query: {},
  } as unknown as DatabaseClient;
};

describe('dashboard.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('getTenantInfo', () => {
    it('should return tenant info with all fields when tenant exists', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTenant = createMockTenantRow();
      mockDbSelectChain.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTenant]),
          }),
        }),
      });

      const { getTenantInfo } = await import('../dashboard.service.js');
      const result = await getTenantInfo(TENANT_ID, mockConfig);

      expect(result.tenantId).toBe('tenant-123');
      expect(result.name).toBe('Test Tenant');
      expect(result.slug).toBe('test-tenant');
      expect(result.domain).toBe('test.example.com');
      expect(result.tier).toBe('enterprise');
      expect(result.status).toBe('active');
      expect(result.dataRegion).toBe('us');
      expect(result.planId).toBe('pro');
      expect(result.featureFlags.trainingCampaigns).toBe(true);
      expect(result.featureFlags.advancedAnalytics).toBe(true);
      expect(result.featureFlags.customBranding).toBe(false);
      expect(result.featureFlags.apiAccess).toBe(true);
      expect(result.featureFlags.ssoEnabled).toBe(false);
    });

    it('should use default tier "starter" when tier is null', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTenant = createMockTenantRow({ tier: null });
      mockDbSelectChain.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTenant]),
          }),
        }),
      });

      const { getTenantInfo } = await import('../dashboard.service.js');
      const result = await getTenantInfo(TENANT_ID, mockConfig);

      expect(result.tier).toBe('starter');
    });

    it('should use default dataRegion "eu" when dataRegion is null', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTenant = createMockTenantRow({ dataRegion: null });
      mockDbSelectChain.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTenant]),
          }),
        }),
      });

      const { getTenantInfo } = await import('../dashboard.service.js');
      const result = await getTenantInfo(TENANT_ID, mockConfig);

      expect(result.dataRegion).toBe('eu');
    });

    it('should use default planId "free" when planId is null', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTenant = createMockTenantRow({ planId: null });
      mockDbSelectChain.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTenant]),
          }),
        }),
      });

      const { getTenantInfo } = await import('../dashboard.service.js');
      const result = await getTenantInfo(TENANT_ID, mockConfig);

      expect(result.planId).toBe('free');
    });

    it('should throw error when tenant not found', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      mockDbSelectChain.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const { getTenantInfo } = await import('../dashboard.service.js');

      await expect(getTenantInfo(TENANT_ID, mockConfig)).rejects.toThrow('Tenant not found');
    });

    it('should convert dates to ISO string format', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTenant = createMockTenantRow({
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-06-15T12:30:00Z'),
      });
      mockDbSelectChain.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTenant]),
          }),
        }),
      });

      const { getTenantInfo } = await import('../dashboard.service.js');
      const result = await getTenantInfo(TENANT_ID, mockConfig);

      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2024-06-15T12:30:00.000Z');
    });

    it('should pass config to getDatabaseClient', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTenant = createMockTenantRow();
      mockDbSelectChain.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTenant]),
          }),
        }),
      });

      const { getTenantInfo } = await import('../dashboard.service.js');
      await getTenantInfo(TENANT_ID, mockConfig);

      expect(getDatabaseClient).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('getActiveUsers', () => {
    beforeEach(() => {
      vi.doMock('../../modules/auth/index.js', () => ({
        getSessionMetrics: vi.fn().mockResolvedValue(createMockSessionMetrics()),
      }));
    });

    it('should return active users data from getSessionMetrics', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const { getActiveUsers } = await import('../dashboard.service.js');
      const result = await getActiveUsers(TENANT_ID, mockConfig);

      expect(result.activeSessionCount).toBe(42);
      expect(result.usersOnlineLast15Min).toBe(15);
      expect(result.dailyActiveUsers).toBe(150);
      expect(result.weeklyActiveUsers).toBe(500);
      expect(result.monthlyActiveUsers).toBe(2000);
      expect(result.userGrowthTrend).toHaveLength(3);
      expect(result.userGrowthTrend[0]).toEqual({ date: '2024-06-01', count: 100 });
    });

    it('should return zero values when no active users', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      vi.doMock('../../modules/auth/index.js', () => ({
        getSessionMetrics: vi.fn().mockResolvedValue(
          createMockSessionMetrics({
            activeSessionCount: 0,
            usersOnlineLast15Min: 0,
            dailyActiveUsers: 0,
            weeklyActiveUsers: 0,
            monthlyActiveUsers: 0,
            userGrowthTrend: [],
          }),
        ),
      }));

      const { getActiveUsers } = await import('../dashboard.service.js');
      const result = await getActiveUsers(TENANT_ID, mockConfig);

      expect(result.activeSessionCount).toBe(0);
      expect(result.usersOnlineLast15Min).toBe(0);
      expect(result.dailyActiveUsers).toBe(0);
      expect(result.weeklyActiveUsers).toBe(0);
      expect(result.monthlyActiveUsers).toBe(0);
      expect(result.userGrowthTrend).toHaveLength(0);
    });

    it('should throw when getSessionMetrics rejects', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      vi.doMock('../../modules/auth/index.js', () => ({
        getSessionMetrics: vi.fn().mockRejectedValue(new Error('Session service unavailable')),
      }));

      const { getActiveUsers } = await import('../dashboard.service.js');
      await expect(getActiveUsers(TENANT_ID, mockConfig)).rejects.toThrow(
        'Session service unavailable',
      );
    });
  });

  describe('getUserMetrics', () => {
    it('should return user metrics with totalUsers and role grouping', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTotalUsers = [{ count: 150 }];
      const mockUsersByRole = [
        { role: 'admin', count: 10 },
        { role: 'trainer', count: 30 },
        { role: 'learner', count: 110 },
      ];
      const mockAdminActions = [{ count: 5 }];

      mockDbSelectChain
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockTotalUsers),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockUsersByRole),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockAdminActions),
            }),
          }),
        });

      const { getUserMetrics } = await import('../dashboard.service.js');
      const result = await getUserMetrics(TENANT_ID, mockConfig);

      expect(result.totalUsers).toBe(150);
      expect(result.usersByRole).toHaveLength(3);
      expect(result.usersByRole[0]).toEqual({ role: 'admin', count: 10 });
      expect(result.usersByRole[1]).toEqual({ role: 'trainer', count: 30 });
      expect(result.usersByRole[2]).toEqual({ role: 'learner', count: 110 });
      expect(result.recentAdminActionsCount).toBe(5);
      expect(result.campaignCompletionRate).toBeNull();
      expect(result.averageCompetencyScore).toBeNull();
    });

    it('should return zero totalUsers when no users exist', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTotalUsers = [{ count: 0 }];
      const mockUsersByRole: Array<{ role: string; count: number }> = [];
      const mockAdminActions = [{ count: 0 }];

      mockDbSelectChain
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockTotalUsers),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockUsersByRole),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockAdminActions),
            }),
          }),
        });

      const { getUserMetrics } = await import('../dashboard.service.js');
      const result = await getUserMetrics(TENANT_ID, mockConfig);

      expect(result.totalUsers).toBe(0);
      expect(result.usersByRole).toHaveLength(0);
      expect(result.recentAdminActionsCount).toBe(0);
    });

    it('should handle null count from database query', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTotalUsers = [{ count: null }];
      const mockUsersByRole: Array<{ role: string; count: number }> = [];
      const mockAdminActions = [{ count: null }];

      mockDbSelectChain
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockTotalUsers),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockUsersByRole),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockAdminActions),
            }),
          }),
        });

      const { getUserMetrics } = await import('../dashboard.service.js');
      const result = await getUserMetrics(TENANT_ID, mockConfig);

      expect(result.totalUsers).toBe(0);
      expect(result.recentAdminActionsCount).toBe(0);
    });
  });

  describe('getDashboardData', () => {
    beforeEach(() => {
      vi.doMock('../../modules/auth/index.js', () => ({
        getSessionMetrics: vi.fn().mockResolvedValue(createMockSessionMetrics()),
      }));
    });

    it('should aggregate tenantInfo, activeUsers, and metrics in parallel', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTenant = createMockTenantRow();

      mockDbSelectChain
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTenant]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ count: 100 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ role: 'admin', count: 5 }]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ count: 2 }]),
            }),
          }),
        });

      const { getDashboardData } = await import('../dashboard.service.js');
      const result = await getDashboardData(TENANT_ID, mockConfig);

      expect(result.tenantInfo).toBeDefined();
      expect(result.tenantInfo.tenantId).toBe('tenant-123');
      expect(result.activeUsers).toBeDefined();
      expect(result.activeUsers.activeSessionCount).toBe(42);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalUsers).toBe(100);
    });

    it('should return complete DashboardData structure', async () => {
      vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

      const mockTenant = createMockTenantRow();

      mockDbSelectChain
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTenant]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ count: 50 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ role: 'learner', count: 50 }]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          }),
        });

      const { getDashboardData } = await import('../dashboard.service.js');
      const result = await getDashboardData(TENANT_ID, mockConfig);

      expectHasProperties(result, 'tenantInfo', 'activeUsers', 'metrics');
      expectHasProperties(result.tenantInfo, 'tenantId', 'name', 'slug', 'featureFlags');
      expectHasProperties(
        result.activeUsers,
        'activeSessionCount',
        'usersOnlineLast15Min',
        'dailyActiveUsers',
        'weeklyActiveUsers',
        'monthlyActiveUsers',
        'userGrowthTrend',
      );
      expectHasProperties(
        result.metrics,
        'totalUsers',
        'usersByRole',
        'recentAdminActionsCount',
        'campaignCompletionRate',
        'averageCompetencyScore',
      );
    });
  });
});
