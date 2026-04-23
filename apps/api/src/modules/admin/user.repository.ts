import { eq, and, desc, asc, sql, max } from 'drizzle-orm';

import { type AppConfig } from '../../config.js';
import { getDatabaseClient, type DatabaseClient } from '../../shared/database/connection.js';
import { auditLogs } from '../../db/schema/audit/index.js';
import { sessions } from '../../db/schema/auth/sessions.js';
import { roles, users, userRoles } from '../../shared/database/schema/index.js';
import { DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT } from '@the-dmz/shared/utils';

import type { UserListParams } from './user.service.js';

export interface UserRow {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  isJitCreated: boolean;
  idpSource: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRoleAssignments {
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
    roleName: string | null;
    assignedAt: Date;
    expiresAt: Date | null;
    assignedBy: string | null;
  }>;
}

export interface UserListResult {
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

export interface PaginatedUserList {
  users: UserListResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SessionLastActive {
  userId: string;
  lastActiveAt: Date | null;
}

export class UserRepository {
  private db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  static create(config: AppConfig): UserRepository {
    if (!config) {
      throw new TypeError('config is required');
    }
    return new UserRepository(getDatabaseClient(config));
  }

  async findUserByTenantAndEmail(tenantId: string, email: string): Promise<UserRow | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, email)))
      .limit(1);
    return user;
  }

  async findUserByTenantAndId(tenantId: string, userId: string): Promise<UserRow | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
      .limit(1);
    return user;
  }

  async createUser(data: {
    tenantId: string;
    email: string;
    displayName: string;
    role: string;
  }): Promise<UserRow> {
    const [newUser] = await this.db
      .insert(users)
      .values({
        tenantId: data.tenantId,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
      })
      .returning();
    return newUser as UserRow;
  }

  async updateUser(
    tenantId: string,
    userId: string,
    data: {
      email?: string;
      displayName?: string | null;
      isActive?: boolean;
      updatedAt: Date;
    },
  ): Promise<UserRow | undefined> {
    const [updatedUser] = await this.db
      .update(users)
      .set(data)
      .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
      .returning();
    return updatedUser;
  }

  async deleteUser(tenantId: string, userId: string): Promise<void> {
    await this.db.delete(users).where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)));
  }

  async deleteUserRoles(tenantId: string, userId: string): Promise<void> {
    await this.db
      .delete(userRoles)
      .where(and(eq(userRoles.tenantId, tenantId), eq(userRoles.userId, userId)));
  }

  async countAdmins(tenantId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.isActive, true),
          sql`${users.role} IN ('super_admin', 'tenant_admin')`,
        ),
      );
    return result[0]?.count ?? 0;
  }

  async getRoleAssignments(
    tenantId: string,
    userId: string,
  ): Promise<
    Array<{
      roleId: string;
      roleName: string | null;
      assignedAt: Date;
      expiresAt: Date | null;
      assignedBy: string | null;
    }>
  > {
    const assignments = await this.db
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
    return assignments;
  }

  async listUsers(
    tenantId: string,
    params: UserListParams,
  ): Promise<{
    users: UserListResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(
      MAX_PAGINATION_LIMIT,
      Math.max(1, params.limit ?? DEFAULT_PAGINATION_LIMIT),
    );
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

    const userList = await this.db
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
        ? await this.db
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

    const countResult = await this.db
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
  }

  async findRoleByTenantAndId(
    tenantId: string,
    roleId: string,
  ): Promise<{ id: string; name: string } | undefined> {
    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
      .limit(1);
    return role;
  }

  async findUserRoleAssignment(
    tenantId: string,
    userId: string,
    roleId: string,
  ): Promise<{ id: string; tenantId: string; userId: string; roleId: string } | undefined> {
    const [assignment] = await this.db
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
    return assignment;
  }

  async assignUserRole(data: {
    tenantId: string;
    userId: string;
    roleId: string;
    assignedBy: string;
    assignedAt: Date;
    expiresAt: Date | null;
  }): Promise<void> {
    await this.db.insert(userRoles).values({
      tenantId: data.tenantId,
      userId: data.userId,
      roleId: data.roleId,
      assignedBy: data.assignedBy,
      assignedAt: data.assignedAt,
      expiresAt: data.expiresAt,
    });
  }

  async revokeUserRole(tenantId: string, roleAssignmentId: string): Promise<void> {
    await this.db
      .delete(userRoles)
      .where(and(eq(userRoles.id, roleAssignmentId), eq(userRoles.tenantId, tenantId)));
  }

  async getRecentActivity(
    tenantId: string,
    userId: string,
  ): Promise<
    Array<{
      action: string;
      resourceType: string | null;
      timestamp: Date;
      metadata: Record<string, unknown> | null;
    }>
  > {
    const activity = await this.db
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
    return activity.map((a) => ({
      ...a,
      metadata: a.metadata as Record<string, unknown> | null,
    }));
  }

  async getLoginHistory(
    tenantId: string,
    userId: string,
  ): Promise<
    Array<{
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      lastActiveAt: Date;
    }>
  > {
    const history = await this.db
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
    return history;
  }
}
