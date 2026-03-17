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

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'in_progress' | 'not_started';

export interface ComplianceSummary {
  frameworkId: string;
  status: ComplianceStatus;
  completionPercentage: number;
  lastAssessedAt: string | null;
  nextAssessmentDue: string | null;
  requirementsCount: number;
  requirementsCompleted: number;
}

export interface FrameworkRequirement {
  id: string;
  tenantId: string;
  frameworkId: string;
  requirementId: string;
  requirementName: string;
  description: string | null;
  category: string | null;
  isRequired: boolean;
  minCompetencyScore: number;
  requiredTrainingModules: string[];
  status: ComplianceStatus;
  completionPercentage: number;
  lastAssessedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDetail extends ComplianceSummary {
  requirements: FrameworkRequirement[];
  metadata: Record<string, unknown>;
}

export interface ComplianceDashboardData {
  summaries: ComplianceSummary[];
  totalFrameworks: number;
  compliantCount: number;
  inProgressCount: number;
  nonCompliantCount: number;
  notStartedCount: number;
}

export interface ComplianceDashboardResponse {
  success: boolean;
  data: ComplianceDashboardData;
}

export interface ComplianceDetailResponse {
  success: boolean;
  data: ComplianceDetail;
}

export interface ComplianceRequirementsResponse {
  success: boolean;
  data: FrameworkRequirement[];
}

export async function getComplianceSummary(): Promise<{
  data?: ComplianceDashboardData;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<ComplianceDashboardData>('/admin/compliance');

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

export async function getComplianceDetail(frameworkId: string): Promise<{
  data?: ComplianceDetail;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<ComplianceDetail>(`/admin/compliance/${frameworkId}`);

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

export async function getFrameworkRequirements(frameworkId: string): Promise<{
  data?: FrameworkRequirement[];
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<FrameworkRequirement[]>(
    `/admin/compliance/${frameworkId}/requirements`,
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

export async function calculateCompliance(frameworkId?: string): Promise<{
  data?: ComplianceDashboardData | ComplianceDetail;
  error?: CategorizedApiError;
}> {
  const url = frameworkId
    ? `/admin/compliance/${frameworkId}/calculate`
    : '/admin/compliance/calculate';

  const result = await apiClient.post<ComplianceDashboardData | ComplianceDetail>(url, {});

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

export interface SAMLProviderConfig {
  id: string;
  tenantId: string;
  name: string;
  provider: 'saml';
  metadataUrl: string;
  idpCertificate: string | null;
  spCertificate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SAMLProviderListResponse {
  providers: SAMLProviderConfig[];
}

export interface SAMLProviderResponse {
  id: string;
  tenantId: string;
  name: string;
  provider: 'saml';
  metadataUrl: string;
  idpCertificate: string | null;
  spCertificate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSAMLProviderRequest {
  name: string;
  metadataUrl: string;
  idpCertificate?: string;
  spPrivateKey?: string;
  spCertificate?: string;
}

export interface UpdateSAMLProviderRequest {
  name?: string;
  metadataUrl?: string;
  idpCertificate?: string | null;
  spPrivateKey?: string | null;
  spCertificate?: string | null;
  isActive?: boolean;
}

export interface SAMLTestConnectionResponse {
  success: boolean;
  message: string;
}

export async function getSAMLProviders(): Promise<{
  data?: SAMLProviderConfig[];
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<SAMLProviderListResponse>('/admin/saml/config');

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

  return { data: result.data.providers };
}

export async function getSAMLProvider(id: string): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<SAMLProviderResponse>(`/admin/saml/config/${id}`);

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

export async function createSAMLProvider(provider: CreateSAMLProviderRequest): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<SAMLProviderResponse>('/admin/saml/config', provider);

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

export async function updateSAMLProvider(
  id: string,
  provider: UpdateSAMLProviderRequest,
): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.put<SAMLProviderResponse>(`/admin/saml/config/${id}`, provider);

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

export async function deleteSAMLProvider(id: string): Promise<{
  data?: boolean;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.delete<{ success: boolean }>(`/admin/saml/config/${id}`);

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

  return { data: result.data.success };
}

export async function testSAMLConnection(id: string): Promise<{
  data?: SAMLTestConnectionResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<SAMLTestConnectionResponse>(`/admin/saml/test/${id}`, {});

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

export interface SCIMTokenConfig {
  id: string;
  name: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export interface SCIMTokenWithSecret {
  id: string;
  name: string;
  token: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

export interface SCIMTestConnectionResponse {
  success: boolean;
  message: string;
}

export interface SCIMTestProvisioningResponse {
  success: boolean;
  message: string;
  testUserId: string | null;
}

export interface SCIMSyncStatus {
  lastSync: string | null;
  status: string;
  stats: {
    usersCreated: number;
    usersUpdated: number;
    usersDeleted: number;
    groupsCreated: number;
    groupsUpdated: number;
    groupsDeleted: number;
    errors: unknown[];
  };
}

export async function getSCIMTokens(): Promise<{
  data?: SCIMTokenConfig[];
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<{ tokens: SCIMTokenConfig[] }>('/admin/scim/tokens');

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

  return { data: result.data.tokens };
}

export async function createSCIMToken(request: {
  name: string;
  scopes?: string[];
  expiresInDays?: number;
}): Promise<{
  data?: SCIMTokenWithSecret;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<SCIMTokenWithSecret>('/admin/scim/tokens', request);

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

export async function revokeSCIMToken(id: string): Promise<{
  data?: boolean;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.delete<{ success: boolean }>(`/admin/scim/tokens/${id}`);

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

  return { data: result.data.success };
}

export async function rotateSCIMToken(
  id: string,
  expiresInDays?: number,
): Promise<{
  data?: SCIMTokenWithSecret;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<SCIMTokenWithSecret>(`/admin/scim/tokens/${id}/rotate`, {
    expiresInDays,
  });

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

export async function testSCIMConnection(id: string): Promise<{
  data?: SCIMTestConnectionResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<SCIMTestConnectionResponse>(`/admin/scim/test/${id}`, {});

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

export async function testSCIMProvisioning(id: string): Promise<{
  data?: SCIMTestProvisioningResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<SCIMTestProvisioningResponse>(
    `/admin/scim/provisioning-test/${id}`,
    {},
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

export async function getSCIMSyncStatus(): Promise<{
  data?: SCIMSyncStatus;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<SCIMSyncStatus>('/admin/scim/sync-status');

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

export interface SCIMGroupRoleMapping {
  id: string;
  displayName: string;
  roleId: string | null;
  roleName: string | null;
  membersCount: number;
}

export interface SCIMRole {
  id: string;
  name: string;
  description: string | null;
}

export interface SCIMGroupMappingsResponse {
  groups: SCIMGroupRoleMapping[];
  roles: SCIMRole[];
}

export async function getSCIMGroupMappings(): Promise<{
  data?: SCIMGroupMappingsResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<SCIMGroupMappingsResponse>('/admin/scim/group-mappings');

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

export async function updateSCIMGroupRole(
  groupId: string,
  roleId: string | null,
): Promise<{
  data?: boolean;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.patch<{ success: boolean }>(
    `/admin/scim/group-mappings/${groupId}`,
    { roleId },
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

  return { data: result.data.success };
}
