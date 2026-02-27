import { randomUUID } from 'crypto';

import { eq, and, ilike, asc } from 'drizzle-orm';

import { SCIM_LIFECYCLE_CONTRACT_V1, SCIM_ADMIN_PROTECTED_FIELDS } from '@the-dmz/shared/auth';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';

import type { AppConfig } from '../../config.js';
import type {
  SCIMUser,
  SCIMGroup,
  SCIMListResponse,
  SCIMBulkRequest,
  SCIMBulkResponse,
} from './scim.types.js';

const SCIM_ERRORS = {
  INVALID_REQUEST: 'SCIM_INVALID_REQUEST',
  USER_NOT_FOUND: 'SCIM_USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'SCIM_USER_ALREADY_EXISTS',
  GROUP_NOT_FOUND: 'SCIM_GROUP_NOT_FOUND',
  GROUP_ALREADY_EXISTS: 'SCIM_GROUP_ALREADY_EXISTS',
  INVALID_FILTER: 'SCIM_INVALID_FILTER',
  TENANT_MISMATCH: 'SCIM_TENANT_MISMATCH',
  IDEMPOTENCY_KEY_CONFLICT: 'SCIM_IDEMPOTENCY_KEY_CONFLICT',
} as const;

export class SCIMError extends Error {
  constructor(
    public readonly code: (typeof SCIM_ERRORS)[keyof typeof SCIM_ERRORS],
    message: string,
    public readonly statusCode: number = 400,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'SCIMError';
  }

  toJSON() {
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      status: this.statusCode.toString(),
      scimType: this.code,
      detail: this.message,
    };
  }
}

interface DbUser {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const buildScimUserResponse = (user: DbUser): SCIMUser & { schemas: string[] } => {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: user.userId,
    userName: user.email,
    displayName: user.displayName ?? undefined,
    name: {
      formatted: user.displayName ?? undefined,
    },
    active: user.isActive,
    meta: {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `/api/v1/scim/v2/Users/${user.userId}`,
      version: `W/"${user.updatedAt.getTime()}"`,
    },
  };
};

interface DbGroup {
  id: string;
  name: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const buildScimGroupResponse = (group: DbGroup): SCIMGroup & { schemas: string[] } => {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: group.id,
    displayName: group.name,
    members: [],
    meta: {
      resourceType: 'Group',
      created: group.createdAt.toISOString(),
      lastModified: group.updatedAt.toISOString(),
      location: `/api/v1/scim/v2/Groups/${group.id}`,
      version: `W/"${group.updatedAt.getTime()}"`,
    },
  };
};

const validateFilter = (filter: string | undefined): void => {
  if (!filter) return;

  const validFilters = [
    /^userName eq ".*"$/,
    /^userName sw ".*"$/,
    /^email eq ".*"$/,
    /^active eq (true|false)$/,
    /^displayName eq ".*"$/,
  ];

  const isValid = validFilters.some((regex) => regex.test(filter));
  if (!isValid) {
    throw new SCIMError(SCIM_ERRORS.INVALID_FILTER, `Invalid filter syntax: ${filter}`, 400);
  }
};

const checkIdempotency = async (
  config: AppConfig,
  tenantId: string,
  idempotencyKey: string,
): Promise<DbUser | null> => {
  const db = getDatabaseClient(config);
  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email as never, idempotencyKey)))
    .limit(1);

  return existing[0] ?? null;
};

export const listScimUsers = async (
  config: AppConfig,
  tenantId: string,
  options?: {
    startIndex?: number;
    count?: number;
    filter?: string;
  },
): Promise<SCIMListResponse> => {
  const db = getDatabaseClient(config);

  const startIndex = options?.startIndex ?? 1;
  const count = Math.min(options?.count ?? 100, 1000);

  if (options?.filter) {
    validateFilter(options.filter);
  }

  let query = db.select().from(users).where(eq(users.tenantId, tenantId));

  if (options?.filter) {
    const filterMatch = options.filter.match(/userName sw "(.*)"/);
    if (filterMatch) {
      query = db
        .select()
        .from(users)
        .where(and(eq(users.tenantId, ilike(users.email, `${filterMatch[1]}%`))));
    }
  }

  const allUsers = await query.orderBy(asc(users.createdAt));
  const totalResults = allUsers.length;
  const paginatedUsers = allUsers.slice(startIndex - 1, startIndex - 1 + count);

  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults,
    startIndex,
    itemsPerPage: count,
    Resources: paginatedUsers.map(buildScimUserResponse),
  };
};

export const getScimUser = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<SCIMUser & { schemas: string[] }> => {
  const db = getDatabaseClient(config);

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));

  if (!user) {
    throw new SCIMError(SCIM_ERRORS.USER_NOT_FOUND, 'User not found', 404);
  }

  return buildScimUserResponse(user);
};

export const createScimUser = async (
  config: AppConfig,
  tenantId: string,
  userData: SCIMUser & { idempotencyKey?: string },
): Promise<SCIMUser & { schemas: string[] }> => {
  const db = getDatabaseClient(config);

  if (userData.idempotencyKey) {
    const existing = await checkIdempotency(config, tenantId, userData.idempotencyKey);
    if (existing) {
      return buildScimUserResponse(existing);
    }
  }

  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, userData.userName)));

  if (existingByEmail) {
    throw new SCIMError(
      SCIM_ERRORS.USER_ALREADY_EXISTS,
      `User with userName ${userData.userName} already exists`,
      409,
    );
  }

  for (const protectedField of SCIM_ADMIN_PROTECTED_FIELDS) {
    if (userData[protectedField as keyof typeof userData] !== undefined) {
      throw new SCIMError(
        SCIM_ERRORS.INVALID_REQUEST,
        `Cannot set admin-protected field: ${protectedField}`,
        400,
      );
    }
  }

  const userId = randomUUID();
  const now = new Date();

  await db.insert(users).values({
    userId,
    email: userData.userName,
    displayName: userData.displayName ?? userData.name?.givenName ?? null,
    tenantId,
    role: 'member',
    isActive: userData.active !== false,
    passwordHash: userData.password ?? '',
    createdAt: now,
    updatedAt: now,
  });

  const [createdUser] = await db.select().from(users).where(eq(users.userId, userId));

  if (!createdUser) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to create user', 500);
  }

  return buildScimUserResponse(createdUser);
};

export const updateScimUser = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  userData: Partial<SCIMUser>,
): Promise<SCIMUser & { schemas: string[] }> => {
  const db = getDatabaseClient(config);

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));

  if (!existing) {
    throw new SCIMError(SCIM_ERRORS.USER_NOT_FOUND, 'User not found', 404);
  }

  for (const protectedField of SCIM_ADMIN_PROTECTED_FIELDS) {
    if (userData[protectedField as keyof typeof userData] !== undefined) {
      throw new SCIMError(
        SCIM_ERRORS.INVALID_REQUEST,
        `Cannot modify admin-protected field: ${protectedField}`,
        400,
      );
    }
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (userData.userName !== undefined) {
    updates['email'] = userData.userName;
  }
  if (userData.displayName !== undefined) {
    updates['displayName'] = userData.displayName;
  }
  if (userData.name?.givenName !== undefined || userData.name?.familyName !== undefined) {
    updates['displayName'] = userData.name.givenName ?? existing.displayName;
  }
  if (userData.active !== undefined) {
    updates['isActive'] = userData.active;
  }

  await db
    .update(users)
    .set(updates)
    .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));

  const [updatedUser] = await db.select().from(users).where(eq(users.userId, userId));

  if (!updatedUser) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to update user', 500);
  }

  return buildScimUserResponse(updatedUser);
};

export const deleteScimUser = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));

  if (!existing) {
    throw new SCIMError(SCIM_ERRORS.USER_NOT_FOUND, 'User not found', 404);
  }

  if (SCIM_LIFECYCLE_CONTRACT_V1.softDeleteOnDeprovision) {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.userId, userId));
  } else {
    await db.delete(users).where(eq(users.userId, userId));
  }
};

export const reactivateScimUser = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<SCIMUser & { schemas: string[] }> => {
  const db = getDatabaseClient(config);

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));

  if (!existing) {
    throw new SCIMError(SCIM_ERRORS.USER_NOT_FOUND, 'User not found', 404);
  }

  await db
    .update(users)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(users.userId, userId));

  const [reactivatedUser] = await db.select().from(users).where(eq(users.userId, userId));

  if (!reactivatedUser) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to reactivate user', 500);
  }

  return buildScimUserResponse(reactivatedUser);
};

const mockGroups: Map<string, DbGroup> = new Map();

export const listScimGroups = async (
  _config: AppConfig,
  tenantId: string,
  options?: {
    startIndex?: number;
    count?: number;
    filter?: string;
  },
): Promise<SCIMListResponse> => {
  const startIndex = options?.startIndex ?? 1;
  const count = Math.min(options?.count ?? 100, 1000);

  if (options?.filter) {
    validateFilter(options.filter);
  }

  const allGroups = Array.from(mockGroups.values()).filter((g) => g.tenantId === tenantId);
  const totalResults = allGroups.length;
  const paginatedGroups = allGroups.slice(startIndex - 1, startIndex - 1 + count);

  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults,
    startIndex,
    itemsPerPage: count,
    Resources: paginatedGroups.map(buildScimGroupResponse),
  };
};

export const getScimGroup = async (
  _config: AppConfig,
  tenantId: string,
  groupId: string,
): Promise<SCIMGroup & { schemas: string[] }> => {
  const group = mockGroups.get(groupId);

  if (!group || group.tenantId !== tenantId) {
    throw new SCIMError(SCIM_ERRORS.GROUP_NOT_FOUND, 'Group not found', 404);
  }

  return buildScimGroupResponse(group);
};

export const createScimGroup = async (
  _config: AppConfig,
  tenantId: string,
  groupData: SCIMGroup,
): Promise<SCIMGroup & { schemas: string[] }> => {
  const existingGroup = Array.from(mockGroups.values()).find(
    (g) => g.tenantId === tenantId && g.name === groupData.displayName,
  );

  if (existingGroup) {
    throw new SCIMError(
      SCIM_ERRORS.GROUP_ALREADY_EXISTS,
      `Group with displayName ${groupData.displayName} already exists`,
      409,
    );
  }

  const groupId = randomUUID();
  const now = new Date();

  const group: DbGroup = {
    id: groupId,
    name: groupData.displayName,
    tenantId,
    createdAt: now,
    updatedAt: now,
  };

  mockGroups.set(groupId, group);

  return buildScimGroupResponse(group);
};

export const updateScimGroup = async (
  _config: AppConfig,
  tenantId: string,
  groupId: string,
  groupData: Partial<SCIMGroup>,
): Promise<SCIMGroup & { schemas: string[] }> => {
  const group = mockGroups.get(groupId);

  if (!group || group.tenantId !== tenantId) {
    throw new SCIMError(SCIM_ERRORS.GROUP_NOT_FOUND, 'Group not found', 404);
  }

  if (groupData.displayName !== undefined) {
    group.name = groupData.displayName;
  }
  group.updatedAt = new Date();

  return buildScimGroupResponse(group);
};

export const deleteScimGroup = async (
  _config: AppConfig,
  tenantId: string,
  groupId: string,
): Promise<void> => {
  const group = mockGroups.get(groupId);

  if (!group || group.tenantId !== tenantId) {
    throw new SCIMError(SCIM_ERRORS.GROUP_NOT_FOUND, 'Group not found', 404);
  }

  mockGroups.delete(groupId);
};

export const processBulkRequest = async (
  _config: AppConfig,
  _tenantId: string,
  bulkRequest: SCIMBulkRequest,
): Promise<SCIMBulkResponse> => {
  const operations = bulkRequest.operations.map((op) => ({
    bulkId: op.bulkId,
    method: op.method,
    status: 200,
  }));

  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkResponse'],
    Operations: operations,
  };
};

export { SCIM_LIFECYCLE_CONTRACT_V1 };
