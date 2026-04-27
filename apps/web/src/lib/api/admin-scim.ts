import { apiClient } from './client.js';
import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

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

export async function getSCIMTokens(): Promise<{
  data?: SCIMTokenConfig[];
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<{ tokens: SCIMTokenConfig[] }>('/admin/scim/tokens');

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
  }

  return { data: result.data };
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
    return { error: createInvalidResponseError() };
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
    return { error: createInvalidResponseError() };
  }

  return { data: result.data.success };
}
