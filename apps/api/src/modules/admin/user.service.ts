import { type AppConfig, loadConfig } from '../../config.js';
import { createAuditLog } from '../audit/audit.service.js'; // eslint-disable-line import-x/no-restricted-paths

import { UserRepository } from './user.repository.js';
import { LastAdminDeleteError, SelfDeleteError, UserNotFoundError } from './user.errors.js';

export interface CreateUserInput {
  email: string;
  displayName: string;
  role?: string;
}

const VALID_ROLES = ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'] as const;

export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  isActive?: boolean;
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
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface UserWithRoles {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  roleAssignments: Array<{
    roleId: string;
    roleName: string;
    assignedAt: Date;
    expiresAt: Date | null;
    assignedBy: string | null;
  }>;
}

export interface PaginatedUsers {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserListItem {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  isJitCreated: boolean;
  idpSource: string | null;
  createdAt: Date;
  lastActive: Date | null;
}

export const createUser = async (
  tenantId: string,
  input: CreateUserInput,
  _createdBy: string,
  config: AppConfig = loadConfig(),
  repository?: UserRepository,
): Promise<UserWithRoles> => {
  if (input.role && !VALID_ROLES.includes(input.role as (typeof VALID_ROLES)[number])) {
    throw new Error(
      `Invalid role. Valid roles are: ${VALID_ROLES.map((r) => r.replace('_', ' ')).join(', ')}`,
    );
  }

  const repo = repository ?? UserRepository.create(config);

  const existingUser = await repo.findUserByTenantAndEmail(tenantId, input.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const newUser = await repo.createUser({
    tenantId,
    email: input.email,
    displayName: input.displayName,
    role: input.role ?? 'learner',
  });

  if (!newUser) {
    throw new Error('Failed to create user');
  }

  return getUserById(tenantId, newUser.userId, config, repo) as Promise<UserWithRoles>;
};

export const updateUser = async (
  tenantId: string,
  userId: string,
  input: UpdateUserInput,
  _updatedBy: string,
  config: AppConfig = loadConfig(),
  repository?: UserRepository,
): Promise<UserWithRoles> => {
  const repo = repository ?? UserRepository.create(config);

  const existingUser = await repo.findUserByTenantAndId(tenantId, userId);
  if (!existingUser) {
    throw new Error('User not found');
  }

  if (input.email && input.email !== existingUser.email) {
    const emailExists = await repo.findUserByTenantAndEmail(tenantId, input.email);
    if (emailExists) {
      throw new Error('Email already in use by another user');
    }
  }

  const updateData: {
    email?: string;
    displayName?: string | null;
    isActive?: boolean;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.email !== undefined) {
    updateData.email = input.email;
  }

  if (input.displayName !== undefined) {
    updateData.displayName = input.displayName;
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
  }

  const updatedUser = await repo.updateUser(tenantId, userId, updateData);
  if (!updatedUser) {
    throw new Error('Failed to update user');
  }

  return getUserById(tenantId, userId, config, repo) as Promise<UserWithRoles>;
};

export const deleteUser = async (
  tenantId: string,
  userId: string,
  _deletedBy: string,
  config: AppConfig = loadConfig(),
  repository?: UserRepository,
): Promise<void> => {
  const repo = repository ?? UserRepository.create(config);

  const existingUser = await repo.findUserByTenantAndId(tenantId, userId);
  if (!existingUser) {
    throw new UserNotFoundError();
  }

  const adminCount = await repo.countAdmins(tenantId);

  if (existingUser.role === 'tenant_admin' && adminCount <= 1) {
    throw new LastAdminDeleteError();
  }

  if (existingUser.userId === _deletedBy) {
    throw new SelfDeleteError();
  }

  await repo.deleteUserRoles(tenantId, userId);
  await repo.deleteUser(tenantId, userId);
};

export const getUserById = async (
  tenantId: string,
  userId: string,
  config: AppConfig = loadConfig(),
  repository?: UserRepository,
): Promise<UserWithRoles | null> => {
  const repo = repository ?? UserRepository.create(config);

  const user = await repo.findUserByTenantAndId(tenantId, userId);
  if (!user) {
    return null;
  }

  const roleAssignments = await repo.getRoleAssignments(tenantId, userId);

  return {
    userId: user.userId,
    tenantId: user.tenantId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roleAssignments: roleAssignments.map((ra) => ({
      roleId: ra.roleId ?? '',
      roleName: ra.roleName ?? '',
      assignedAt: ra.assignedAt,
      expiresAt: ra.expiresAt,
      assignedBy: ra.assignedBy,
    })),
  };
};

export const listUsers = async (
  tenantId: string,
  params: UserListParams,
  config: AppConfig = loadConfig(),
  repository?: UserRepository,
): Promise<PaginatedUsers> => {
  const repo = repository ?? UserRepository.create(config);
  return repo.listUsers(tenantId, params);
};

export const assignUserRole = async (
  tenantId: string,
  userId: string,
  roleId: string,
  _assignedBy: string,
  expiresAt?: Date,
  config: AppConfig = loadConfig(),
  repository?: UserRepository,
): Promise<void> => {
  const repo = repository ?? UserRepository.create(config);

  const targetUser = await repo.findUserByTenantAndId(tenantId, userId);
  if (!targetUser) {
    throw new Error('User not found');
  }

  const targetRole = await repo.findRoleByTenantAndId(tenantId, roleId);
  if (!targetRole) {
    throw new Error('Role not found');
  }

  const existingAssignment = await repo.findUserRoleAssignment(tenantId, userId, roleId);
  if (existingAssignment) {
    throw new Error('User already has this role');
  }

  await repo.assignUserRole({
    tenantId,
    userId,
    roleId,
    assignedBy: _assignedBy,
    assignedAt: new Date(),
    expiresAt: expiresAt ?? null,
  });

  await createAuditLog(
    {
      tenantId,
      userId: _assignedBy,
      action: 'role_assigned',
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        targetRoleId: roleId,
        roleName: targetRole.name,
        assignedToUserId: userId,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    },
    config,
  );
};

export const revokeUserRole = async (
  tenantId: string,
  userId: string,
  roleId: string,
  _revokedBy: string,
  config: AppConfig = loadConfig(),
  repository?: UserRepository,
): Promise<void> => {
  const repo = repository ?? UserRepository.create(config);

  const assignment = await repo.findUserRoleAssignment(tenantId, userId, roleId);
  if (!assignment) {
    throw new Error('Role assignment not found');
  }

  const revokedRole = await repo.findRoleByTenantAndId(tenantId, roleId);

  await repo.revokeUserRole(tenantId, assignment.id);

  await createAuditLog(
    {
      tenantId,
      userId: _revokedBy,
      action: 'role_revoked',
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        revokedRoleId: roleId,
        roleName: revokedRole?.name ?? 'unknown',
        revokedFromUserId: userId,
      },
    },
    config,
  );
};

export interface UserActivity {
  recentActivity: Array<{
    action: string;
    resourceType: string | null;
    timestamp: Date;
    metadata: Record<string, unknown> | null;
  }>;
  loginHistory: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    lastActiveAt: Date;
  }>;
}

export const getUserActivity = async (
  tenantId: string,
  userId: string,
  config: AppConfig = loadConfig(),
  repository?: UserRepository,
): Promise<UserActivity | null> => {
  const repo = repository ?? UserRepository.create(config);

  const existingUser = await repo.findUserByTenantAndId(tenantId, userId);
  if (!existingUser) {
    return null;
  }

  const recentActivity = await repo.getRecentActivity(tenantId, userId);
  const loginHistory = await repo.getLoginHistory(tenantId, userId);

  return {
    recentActivity: recentActivity.map((a) => ({
      action: a.action,
      resourceType: a.resourceType,
      timestamp: a.timestamp,
      metadata: a.metadata,
    })),
    loginHistory: loginHistory.map((l) => ({
      id: l.id,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt,
      lastActiveAt: l.lastActiveAt,
    })),
  };
};
