import { apiClient } from './client.js';
import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
  }

  return { data: result.data };
}
