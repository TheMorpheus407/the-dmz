import { eq, and, desc, asc, sql, max } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { users, userRoles, roles } from '../../shared/database/schema/index.js';
import { sessions } from '../../db/schema/auth/sessions.js';
import { auditLogs } from '../../db/schema/audit/index.js';
import { createAuditLog } from '../audit/audit.service.js'; // eslint-disable-line import-x/no-restricted-paths

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

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const createUser = async (
  tenantId: string,
  input: CreateUserInput,
  _createdBy: string,
  config: AppConfig = loadConfig(),
): Promise<UserWithRoles> => {
  const db = getDatabaseClient(config);

  if (input.role && !VALID_ROLES.includes(input.role as (typeof VALID_ROLES)[number])) {
    throw new Error(
      `Invalid role. Valid roles are: ${VALID_ROLES.map((r) => r.replace('_', ' ')).join(', ')}`,
    );
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, input.email)))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error('User with this email already exists');
  }

  const [newUser] = await db
    .insert(users)
    .values({
      tenantId,
      email: input.email,
      displayName: input.displayName,
      role: input.role ?? 'learner',
    })
    .returning();

  if (!newUser) {
    throw new Error('Failed to create user');
  }

  return getUserById(tenantId, newUser.userId, config) as Promise<UserWithRoles>;
};

export const updateUser = async (
  tenantId: string,
  userId: string,
  input: UpdateUserInput,
  _updatedBy: string,
  config: AppConfig = loadConfig(),
): Promise<UserWithRoles> => {
  const db = getDatabaseClient(config);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
    .limit(1);

  if (!existingUser) {
    throw new Error('User not found');
  }

  if (input.email && input.email !== existingUser.email) {
    const emailExists = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, input.email)))
      .limit(1);

    if (emailExists.length > 0) {
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

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
    .returning();

  if (!updatedUser) {
    throw new Error('Failed to update user');
  }

  return getUserById(tenantId, userId, config) as Promise<UserWithRoles>;
};

export const deleteUser = async (
  tenantId: string,
  userId: string,
  _deletedBy: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
    .limit(1);

  if (!existingUser) {
    throw new Error('User not found');
  }

  const adminCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true),
        sql`${users.role} IN ('super_admin', 'tenant_admin')`,
      ),
    );

  if (existingUser.role === 'tenant_admin' && (adminCount[0]?.count ?? 0) <= 1) {
    throw new Error('Cannot delete the last tenant admin');
  }

  if (existingUser.userId === _deletedBy) {
    throw new Error('Cannot delete your own account');
  }

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.tenantId, tenantId), eq(userRoles.userId, userId)));

  await db.delete(users).where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)));
};

export const getUserById = async (
  tenantId: string,
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<UserWithRoles | null> => {
  const db = getDatabaseClient(config);

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
    .limit(1);

  if (!user) {
    return null;
  }

  const roleAssignments = await db
    .select({
      roleId: userRoles.roleId,
      roleName: roles.name,
      assignedAt: userRoles.assignedAt,
      expiresAt: userRoles.expiresAt,
      assignedBy: userRoles.assignedBy,
    })
    .from(userRoles)
    .leftJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.tenantId, tenantId)))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));

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
): Promise<PaginatedUsers> => {
  const db = getDatabaseClient(config);

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * limit;

  const conditions = [eq(users.tenantId, tenantId)];

  if (params.search) {
    conditions.push(
      sql`(${users.displayName} ILIKE ${`%${params.search}%`} OR ${users.email} ILIKE ${`%${params.search}%`})`,
    );
  }

  if (params.role) {
    conditions.push(eq(users.role, params.role));
  }

  if (params.isActive !== undefined) {
    conditions.push(eq(users.isActive, params.isActive));
  }

  if (params.isJitCreated !== undefined) {
    conditions.push(eq(users.isJitCreated, params.isJitCreated));
  }

  if (params.createdAfter) {
    conditions.push(sql`${users.createdAt} >= ${params.createdAfter}`);
  }

  if (params.createdBefore) {
    conditions.push(sql`${users.createdAt} <= ${params.createdBefore}`);
  }

  const orderColumn = params.sortBy ?? 'createdAt';
  const orderDirection = params.sortOrder ?? 'desc';

  let orderFn;
  switch (orderColumn) {
    case 'displayName':
      orderFn = orderDirection === 'asc' ? asc(users.displayName) : desc(users.displayName);
      break;
    case 'email':
      orderFn = orderDirection === 'asc' ? asc(users.email) : desc(users.email);
      break;
    case 'role':
      orderFn = orderDirection === 'asc' ? asc(users.role) : desc(users.role);
      break;
    case 'lastActive':
      orderFn = orderDirection === 'asc' ? asc(users.createdAt) : desc(users.createdAt);
      break;
    default:
      orderFn = orderDirection === 'asc' ? asc(users.createdAt) : desc(users.createdAt);
  }

  const userList = await db
    .select({
      userId: users.userId,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      isJitCreated: users.isJitCreated,
      idpSource: users.idpSource,
      createdAt: users.createdAt,
      lastActive: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(orderFn)
    .limit(limit)
    .offset(offset);

  const userIds = userList.map((u) => u.userId);
  const sessionData =
    userIds.length > 0
      ? await db
          .select({
            userId: sessions.userId,
            lastActiveAt: max(sessions.lastActiveAt),
          })
          .from(sessions)
          .where(and(eq(sessions.tenantId, tenantId), sql`${sessions.userId} IN ${userIds}`))
          .groupBy(sessions.userId)
      : [];

  const sessionMap = new Map(sessionData.map((s) => [s.userId, s.lastActiveAt]));

  const usersWithLastActive = userList.map((u) => ({
    ...u,
    lastActive: sessionMap.get(u.userId) ?? u.createdAt,
  }));

  if (orderColumn === 'lastActive') {
    usersWithLastActive.sort((a, b) => {
      const aTime = a.lastActive?.getTime() ?? 0;
      const bTime = b.lastActive?.getTime() ?? 0;
      return orderDirection === 'asc' ? aTime - bTime : bTime - aTime;
    });
  }

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    users: usersWithLastActive,
    total,
    page,
    limit,
    totalPages,
  };
};

export const assignUserRole = async (
  tenantId: string,
  userId: string,
  roleId: string,
  _assignedBy: string,
  expiresAt?: Date,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
    .limit(1);

  if (!targetUser) {
    throw new Error('User not found');
  }

  const [targetRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
    .limit(1);

  if (!targetRole) {
    throw new Error('Role not found');
  }

  const existingAssignment = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.tenantId, tenantId),
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
      ),
    )
    .limit(1);

  if (existingAssignment.length > 0) {
    throw new Error('User already has this role');
  }

  await db.insert(userRoles).values({
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
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [assignment] = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.tenantId, tenantId),
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
      ),
    )
    .limit(1);

  if (!assignment) {
    throw new Error('Role assignment not found');
  }

  const [revokedRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
    .limit(1);

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.id, assignment.id), eq(userRoles.tenantId, tenantId)));

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
): Promise<UserActivity | null> => {
  const db = getDatabaseClient(config);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
    .limit(1);

  if (!existingUser) {
    return null;
  }

  const recentActivity = await db
    .select({
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      timestamp: auditLogs.timestamp,
      metadata: auditLogs.metadata,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.userId, userId)))
    .orderBy(desc(auditLogs.timestamp))
    .limit(20);

  const loginHistory = await db
    .select({
      id: sessions.id,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      lastActiveAt: sessions.lastActiveAt,
    })
    .from(sessions)
    .where(and(eq(sessions.tenantId, tenantId), eq(sessions.userId, userId)))
    .orderBy(desc(sessions.createdAt))
    .limit(10);

  return {
    recentActivity: recentActivity.map((a) => ({
      action: a.action,
      resourceType: a.resourceType,
      timestamp: a.timestamp,
      metadata: a.metadata as Record<string, unknown> | null,
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
