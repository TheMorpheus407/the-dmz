import { apiClient } from './client.js';

import type { CategorizedApiError } from './types.js';

export interface RoleAssignment {
  roleId: string;
  roleName: string;
  assignedAt: string;
  expiresAt: string | null;
  assignedBy: string | null;
}

export interface User {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastActive: string | null;
  isJitCreated?: boolean;
  idpSource?: 'saml' | 'oidc' | null;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  sortBy?: 'displayName' | 'email' | 'role' | 'createdAt' | 'lastActive';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  role?: string;
  isActive?: boolean;
  isJitCreated?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

export interface UserWithRoles extends User {
  updatedAt: string;
  tenantId: string;
  roleAssignments: RoleAssignment[];
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserListResponse {
  success: boolean;
  data: PaginatedUsers;
}

export interface UserResponse {
  success: boolean;
  data: UserWithRoles;
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  isActive?: boolean;
}

export interface AssignRoleInput {
  roleId: string;
  expiresAt?: string;
}

function buildQueryString(params: UserListParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.search) searchParams.set('search', params.search);
  if (params.role) searchParams.set('role', params.role);
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  if (params.isJitCreated !== undefined)
    searchParams.set('isJitCreated', String(params.isJitCreated));
  if (params.createdAfter) searchParams.set('createdAfter', params.createdAfter);
  if (params.createdBefore) searchParams.set('createdBefore', params.createdBefore);

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export async function listUsers(params: UserListParams = {}): Promise<{
  data?: PaginatedUsers;
  error?: CategorizedApiError;
}> {
  const queryString = buildQueryString(params);
  const result = await apiClient.get<PaginatedUsers>(`/admin/users${queryString}`);

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

export async function getUser(userId: string): Promise<{
  data?: UserWithRoles;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<UserWithRoles>(`/admin/users/${userId}`);

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

export async function createUser(input: CreateUserInput): Promise<{
  data?: UserWithRoles;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<UserWithRoles, CreateUserInput>('/admin/users', input);

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

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<{
  data?: UserWithRoles;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.patch<UserWithRoles, UpdateUserInput>(
    `/admin/users/${userId}`,
    input,
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

export async function deleteUser(userId: string): Promise<{
  success?: boolean;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.delete<void>(`/admin/users/${userId}`);

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

export async function assignUserRole(
  userId: string,
  input: AssignRoleInput,
): Promise<{
  success?: boolean;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<unknown, AssignRoleInput>(
    `/admin/users/${userId}/roles`,
    input,
  );

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

export async function revokeUserRole(
  userId: string,
  roleId: string,
): Promise<{
  success?: boolean;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.delete<unknown>(`/admin/users/${userId}/roles/${roleId}`);

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

export interface UserActivity {
  recentActivity: Array<{
    action: string;
    resourceType: string | null;
    timestamp: string;
    metadata: Record<string, unknown> | null;
  }>;
  loginHistory: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    lastActiveAt: string;
  }>;
}

export async function getUserActivity(userId: string): Promise<{
  data?: UserActivity;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<UserActivity>(`/admin/users/${userId}/activity`);

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
