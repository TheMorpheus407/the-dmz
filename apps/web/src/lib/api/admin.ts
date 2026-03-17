import { apiClient } from './client.js';

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
    return {
      error: {
        category: 'server',
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server',
        status: 500,
        retryable: false,
      },
    };
  }

  return { data: result.data };
}

export interface CompetencyDistribution {
  domain: string;
  averageScore: number;
  learnerCount: number;
  distribution: {
    foundational: number;
    operational: number;
    consistent: number;
    mastery: number;
  };
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  domain: string;
  recentOccurrences: string[];
}

export interface CampaignCompletion {
  campaignId: string;
  campaignName: string;
  totalLearners: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

export interface LearnerSummary {
  userId: string;
  email: string;
  displayName: string;
  score: number;
  trend: 'improving' | 'declining' | 'stable';
  lastActivity: string;
}

export interface TrainerDashboardData {
  competencies: CompetencyDistribution[];
  errorPatterns: ErrorPattern[];
  campaigns: CampaignCompletion[];
  totalLearners: number;
  averageScore: number;
}

export interface TrainerDashboardResponse {
  success: boolean;
  data: TrainerDashboardData;
}

export interface TrainerCompetenciesResponse {
  success: boolean;
  data: CompetencyDistribution[];
}

export interface TrainerErrorsResponse {
  success: boolean;
  data: ErrorPattern[];
}

export interface TrainerCampaignsResponse {
  success: boolean;
  data: CampaignCompletion[];
}

export interface TrainerLearnersResponse {
  success: boolean;
  data: LearnerSummary[];
}

export async function getTrainerDashboard(dateRange?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  data?: TrainerDashboardData;
  error?: CategorizedApiError;
}> {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
  if (dateRange?.endDate) params.set('endDate', dateRange.endDate);

  const queryString = params.toString();
  const url = `/admin/trainer/dashboard${queryString ? `?${queryString}` : ''}`;

  const result = await apiClient.get<TrainerDashboardData>(url);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return {
      error: {
        category: 'server',
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server',
        status: 500,
        retryable: false,
      },
    };
  }

  return { data: result.data };
}

export async function getTrainerCompetencies(dateRange?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  data?: CompetencyDistribution[];
  error?: CategorizedApiError;
}> {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
  if (dateRange?.endDate) params.set('endDate', dateRange.endDate);

  const queryString = params.toString();
  const url = `/admin/trainer/competencies${queryString ? `?${queryString}` : ''}`;

  const result = await apiClient.get<CompetencyDistribution[]>(url);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return {
      error: {
        category: 'server',
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server',
        status: 500,
        retryable: false,
      },
    };
  }

  return { data: result.data };
}

export async function getTrainerErrors(dateRange?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  data?: ErrorPattern[];
  error?: CategorizedApiError;
}> {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
  if (dateRange?.endDate) params.set('endDate', dateRange.endDate);

  const queryString = params.toString();
  const url = `/admin/trainer/errors${queryString ? `?${queryString}` : ''}`;

  const result = await apiClient.get<ErrorPattern[]>(url);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return {
      error: {
        category: 'server',
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server',
        status: 500,
        retryable: false,
      },
    };
  }

  return { data: result.data };
}

export async function getTrainerCampaigns(): Promise<{
  data?: CampaignCompletion[];
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<CampaignCompletion[]>('/admin/trainer/campaigns');

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return {
      error: {
        category: 'server',
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server',
        status: 500,
        retryable: false,
      },
    };
  }

  return { data: result.data };
}

export async function getTrainerLearners(
  domain: string,
  threshold: number = 50,
): Promise<{
  data?: LearnerSummary[];
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<LearnerSummary[]>(
    `/admin/trainer/learners/${domain}?threshold=${threshold}`,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return {
      error: {
        category: 'server',
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server',
        status: 500,
        retryable: false,
      },
    };
  }

  return { data: result.data };
}
