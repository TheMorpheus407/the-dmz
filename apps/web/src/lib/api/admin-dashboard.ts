import { apiClient } from './client.js';
import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

export interface TenantFeatureFlags {
  trainingCampaigns: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  ssoEnabled: boolean;
}

export interface TenantInfo {
  tenantId: string;
  name: string;
  slug: string;
  domain: string | null;
  tier: string;
  status: string;
  dataRegion: string;
  planId: string;
  createdAt: string;
  updatedAt: string;
  featureFlags: TenantFeatureFlags;
}

export interface UserGrowthTrendItem {
  date: string;
  count: number;
}

export interface ActiveUsersData {
  activeSessionCount: number;
  usersOnlineLast15Min: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  userGrowthTrend: UserGrowthTrendItem[];
}

export interface UsersByRole {
  role: string;
  count: number;
}

export interface UserMetrics {
  totalUsers: number;
  usersByRole: UsersByRole[];
  recentAdminActionsCount: number;
  campaignCompletionRate: number | null;
  averageCompetencyScore: number | null;
}

export interface DashboardData {
  tenantInfo: TenantInfo;
  activeUsers: ActiveUsersData;
  metrics: UserMetrics;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

export async function getDashboard(): Promise<{
  data?: DashboardData;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<DashboardData>('/admin/dashboard');

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
  }

  return { data: result.data };
}
