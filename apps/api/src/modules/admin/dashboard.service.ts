import { eq, gte, count, and } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { tenants } from '../../shared/database/schema/tenants.js';
import { users } from '../../shared/database/schema/users.js';
import { auditLogs } from '../../db/schema/audit/index.js';
import { getSessionMetrics } from '../auth/index.js';

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

export interface ActiveUsersData {
  activeSessionCount: number;
  usersOnlineLast15Min: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  userGrowthTrend: Array<{ date: string; count: number }>;
}

export interface UserMetrics {
  totalUsers: number;
  usersByRole: Array<{ role: string; count: number }>;
  recentAdminActionsCount: number;
  campaignCompletionRate: number | null;
  averageCompetencyScore: number | null;
}

export interface DashboardData {
  tenantInfo: TenantInfo;
  activeUsers: ActiveUsersData;
  metrics: UserMetrics;
}

const FIFTEEN_MINUTES_AGO = new Date(Date.now() - 15 * 60 * 1000);
const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

function extractFeatureFlags(settings: Record<string, unknown> | null): TenantFeatureFlags {
  return {
    trainingCampaigns: Boolean(settings?.['training_campaigns'] ?? false),
    advancedAnalytics: Boolean(settings?.['advanced_analytics'] ?? false),
    customBranding: Boolean(settings?.['custom_branding'] ?? false),
    apiAccess: Boolean(settings?.['api_access'] ?? false),
    ssoEnabled: Boolean(settings?.['sso_enabled'] ?? false),
  };
}

export const getTenantInfo = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<TenantInfo> => {
  const db = getDatabaseClient(config);

  const [tenant] = await db
    .select({
      tenantId: tenants.tenantId,
      name: tenants.name,
      slug: tenants.slug,
      domain: tenants.domain,
      tier: tenants.tier,
      status: tenants.status,
      dataRegion: tenants.dataRegion,
      planId: tenants.planId,
      settings: tenants.settings,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
    })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain,
    tier: tenant.tier ?? 'starter',
    status: tenant.status,
    dataRegion: tenant.dataRegion ?? 'eu',
    planId: tenant.planId ?? 'free',
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
    featureFlags: extractFeatureFlags(tenant.settings as Record<string, unknown> | null),
  };
};

export const getActiveUsers = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<ActiveUsersData> => {
  const db = getDatabaseClient(config);

  const metrics = await getSessionMetrics(db, {
    tenantId,
    fifteenMinutesAgo: FIFTEEN_MINUTES_AGO,
    oneDayAgo: ONE_DAY_AGO,
    sevenDaysAgo: SEVEN_DAYS_AGO,
    thirtyDaysAgo: THIRTY_DAYS_AGO,
    now: new Date(),
  });

  return {
    activeSessionCount: metrics.activeSessionCount,
    usersOnlineLast15Min: metrics.usersOnlineLast15Min,
    dailyActiveUsers: metrics.dailyActiveUsers,
    weeklyActiveUsers: metrics.weeklyActiveUsers,
    monthlyActiveUsers: metrics.monthlyActiveUsers,
    userGrowthTrend: metrics.userGrowthTrend,
  };
};

export const getUserMetrics = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<UserMetrics> => {
  const db = getDatabaseClient(config);

  const totalUsersResult = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.tenantId, tenantId));

  const usersByRoleResult = await db
    .select({
      role: users.role,
      count: count(),
    })
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .groupBy(users.role);

  const recentAdminActionsResult = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenantId), gte(auditLogs.timestamp, ONE_DAY_AGO)));

  return {
    totalUsers: totalUsersResult[0]?.count ?? 0,
    usersByRole: usersByRoleResult.map((row) => ({
      role: row.role,
      count: Number(row.count),
    })),
    recentAdminActionsCount: recentAdminActionsResult[0]?.count ?? 0,
    campaignCompletionRate: null,
    averageCompetencyScore: null,
  };
};

export const getDashboardData = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<DashboardData> => {
  const [tenantInfo, activeUsers, metrics] = await Promise.all([
    getTenantInfo(tenantId, config),
    getActiveUsers(tenantId, config),
    getUserMetrics(tenantId, config),
  ]);

  return {
    tenantInfo,
    activeUsers,
    metrics,
  };
};
