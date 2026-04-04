import { randomUUID, createHash, randomBytes } from 'crypto';

import { eq, and, ilike, asc, or } from 'drizzle-orm';

import { SCIM_LIFECYCLE_CONTRACT_V1, SCIM_ADMIN_PROTECTED_FIELDS } from '@the-dmz/shared/auth';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';
import {
  scimGroups,
  scimGroupMembers,
  scimTokens,
  scimSyncLogs,
} from '../../db/schema/auth/scim.js';

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
  INVALID_TOKEN: 'SCIM_INVALID_TOKEN',
  INSUFFICIENT_SCOPE: 'SCIM_INSUFFICIENT_SCOPE',
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

const RESOURCE_PATH_REGEX = /\/(Users|Groups)\/(.+)/;

type ResourcePathMatch = { resourceType: 'Users' | 'Groups'; id: string };

const parseResourcePath = (path: string): ResourcePathMatch | null => {
  const match = path.match(RESOURCE_PATH_REGEX);
  if (!match) return null;
  const [, resourceType, id] = match;
  if (!id) return null;
  return { resourceType: resourceType as 'Users' | 'Groups', id };
};

const buildLocation = (resourceType: string, id: string): string => {
  return `/api/v1/scim/v2/${resourceType}/${id}`;
};

type BulkOperationHandler = (
  config: AppConfig,
  tenantId: string,
  op: { data?: unknown; bulkId?: string; id?: string },
) => Promise<{ location?: string }>;

const handlePost: BulkOperationHandler = async (config, tenantId, op) => {
  if (op.data === undefined) return {};
  const created = await createScimUser(config, tenantId, op.data as SCIMUser);
  return { location: buildLocation('Users', (created as { id: string }).id) };
};

const handlePostGroups: BulkOperationHandler = async (config, tenantId, op) => {
  if (op.data === undefined) return {};
  const created = await createScimGroup(config, tenantId, op.data as SCIMGroup);
  return { location: buildLocation('Groups', (created as { id: string }).id) };
};

const handlePutUsers: BulkOperationHandler = async (config, tenantId, op) => {
  const parsed = op as { data?: unknown; id?: string };
  if (!parsed.id || !parsed.data) return {};
  const updated = await updateScimUser(
    config,
    tenantId,
    parsed.id,
    parsed.data as Partial<SCIMUser>,
  );
  return { location: buildLocation('Users', (updated as { id: string }).id) };
};

const handlePutGroups: BulkOperationHandler = async (config, tenantId, op) => {
  const parsed = op as { data?: unknown; id?: string };
  if (!parsed.id || !parsed.data) return {};
  const updated = await updateScimGroup(
    config,
    tenantId,
    parsed.id,
    parsed.data as Partial<SCIMGroup>,
  );
  return { location: buildLocation('Groups', (updated as { id: string }).id) };
};

const handlePatchUsers: BulkOperationHandler = async (config, tenantId, op) => {
  const parsed = op as { data?: unknown; id?: string };
  if (!parsed.id || !parsed.data) return {};
  const updated = await updateScimUser(
    config,
    tenantId,
    parsed.id,
    parsed.data as Partial<SCIMUser>,
  );
  return { location: buildLocation('Users', (updated as { id: string }).id) };
};

const handlePatchGroups: BulkOperationHandler = async (config, tenantId, op) => {
  const parsed = op as { data?: unknown; id?: string };
  if (!parsed.id || !parsed.data) return {};
  const updated = await updateScimGroup(
    config,
    tenantId,
    parsed.id,
    parsed.data as Partial<SCIMGroup>,
  );
  return { location: buildLocation('Groups', (updated as { id: string }).id) };
};

const handleDeleteUsers: BulkOperationHandler = async (config, tenantId, op) => {
  const parsed = op as { id?: string };
  if (!parsed.id) return {};
  await deleteScimUser(config, tenantId, parsed.id);
  return {};
};

const handleDeleteGroups: BulkOperationHandler = async (config, tenantId, op) => {
  const parsed = op as { id?: string };
  if (!parsed.id) return {};
  await deleteScimGroup(config, tenantId, parsed.id);
  return {};
};

const operationHandlers: Record<string, Record<string, BulkOperationHandler>> = {
  post: {
    '/Users': handlePost,
    '/Groups': handlePostGroups,
  },
  put: {
    Users: handlePutUsers,
    Groups: handlePutGroups,
  },
  patch: {
    Users: handlePatchUsers,
    Groups: handlePatchGroups,
  },
  delete: {
    Users: handleDeleteUsers,
    Groups: handleDeleteGroups,
  },
};

export const processBulkRequest = async (
  config: AppConfig,
  tenantId: string,
  bulkRequest: SCIMBulkRequest,
): Promise<SCIMBulkResponse> => {
  const results: Array<{
    bulkId?: string;
    method: string;
    status: number;
    location?: string;
  }> = [];

  const processOperation = async (
    op: (typeof bulkRequest.operations)[number],
  ): Promise<{
    bulkId?: string;
    method: string;
    status: number;
    location?: string;
  }> => {
    const methodHandlers = operationHandlers[op.method];
    if (!methodHandlers) {
      const result: { bulkId?: string; method: string; status: number } = {
        method: op.method,
        status: 500,
      };
      if (op.bulkId) result.bulkId = op.bulkId;
      return result;
    }

    let location: string | undefined;
    if (op.method === 'post') {
      const handler = methodHandlers[op.path];
      if (handler) {
        const result = await handler(config, tenantId, { data: op.data, bulkId: op.bulkId });
        location = result.location;
      }
    } else {
      const pathMatch = parseResourcePath(op.path);
      if (!pathMatch) {
        const result: { bulkId?: string; method: string; status: number } = {
          method: op.method,
          status: 500,
        };
        if (op.bulkId) result.bulkId = op.bulkId;
        return result;
      }
      const handler = methodHandlers[pathMatch.resourceType];
      if (!handler) {
        const result: { bulkId?: string; method: string; status: number } = {
          method: op.method,
          status: 500,
        };
        if (op.bulkId) result.bulkId = op.bulkId;
        return result;
      }
      const opData = op as { data?: unknown; id?: string };
      const result = await handler(config, tenantId, { data: opData.data, id: pathMatch.id });
      location = result.location;
    }

    const result: { bulkId?: string; method: string; status: number; location?: string } = {
      method: op.method,
      status: 200,
    };
    if (op.bulkId) result.bulkId = op.bulkId;
    if (location) result.location = location;
    return result;
  };

  for (const op of bulkRequest.operations) {
    try {
      const result = await processOperation(op);
      results.push(result);
    } catch {
      const errorResult: { bulkId?: string; method: string; status: number } = {
        method: op.method,
        status: 500,
      };
      if (op.bulkId) errorResult.bulkId = op.bulkId;
      results.push(errorResult);
    }
  }

  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkResponse'],
    Operations: results,
  };
};

interface DbUser {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  scimId: string | null;
  externalId: string | null;
  department: string | null;
  title: string | null;
  managerId: string | null;
}

const buildScimUserResponse = (user: DbUser): SCIMUser & { schemas: string[] } => {
  const response: SCIMUser & { schemas: string[] } = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: user.userId,
    userName: user.email,
    displayName: user.displayName ?? undefined,
    name: {
      formatted: user.displayName ?? undefined,
    },
    active: user.isActive,
    emails: [
      {
        value: user.email,
        primary: true,
      },
    ],
    title: user.title ?? undefined,
    meta: {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `/api/v1/scim/v2/Users/${user.userId}`,
      version: `W/"${user.updatedAt.getTime()}"`,
    },
  };

  if (user.department) {
    (response as Record<string, unknown>)['department'] = user.department;
  }

  if (user.managerId) {
    response.manager = {
      value: user.managerId,
    };
  }

  return response;
};

interface DbGroup {
  id: string;
  displayName: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DbGroupMember {
  userId: string;
  scimUserId: string | null;
}

const buildScimGroupResponse = (group: DbGroup): SCIMGroup & { schemas: string[] } => {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: group.id,
    displayName: group.displayName,
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

const buildScimGroupResponseWithMembers = (
  group: DbGroup,
  members: DbGroupMember[],
): SCIMGroup & { schemas: string[] } => {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: group.id,
    displayName: group.displayName,
    members: members.map((m) => ({
      value: m.userId,
      scimUserId: m.scimUserId ?? undefined,
    })),
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
    /^userName eq "[^"]*"$/,
    /^userName sw "[^"]*"$/,
    /^email eq "[^"]*"$/,
    /^active eq (true|false)$/,
    /^displayName eq "[^"]*"$/,
  ];

  const isValid = validFilters.some((regex) => regex.test(filter));
  if (!isValid) {
    throw new SCIMError(SCIM_ERRORS.INVALID_FILTER, `Invalid filter syntax: ${filter}`, 400);
  }
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

  let allUsers: DbUser[] = [];

  if (options?.filter) {
    const filterMatch = options.filter.match(/userName sw "(.*)"/);
    if (filterMatch) {
      const results = await db
        .select()
        .from(users)
        .where(and(eq(users.tenantId, tenantId), ilike(users.email, `${filterMatch[1]}%`)))
        .orderBy(asc(users.createdAt));
      allUsers = results as DbUser[];
    }
  }

  if (!options?.filter || allUsers.length === 0) {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(asc(users.createdAt));
    allUsers = results as DbUser[];
  }

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

  return buildScimUserResponse(user as DbUser);
};

export const createScimUser = async (
  config: AppConfig,
  tenantId: string,
  userData: SCIMUser & { idempotencyKey?: string },
): Promise<SCIMUser & { schemas: string[] }> => {
  const db = getDatabaseClient(config);

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

  const userDataAny = userData as Record<string, unknown>;

  await db.insert(users).values({
    userId,
    email: userData.userName,
    displayName: userData.displayName ?? userData.name?.givenName ?? null,
    tenantId,
    role: 'member',
    isActive: userData.active !== false,
    passwordHash: userData.password ?? '',
    department: typeof userDataAny['department'] === 'string' ? userDataAny['department'] : null,
    title: userData.title ?? null,
    managerId: userData.manager?.value ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const [createdUser] = await db.select().from(users).where(eq(users.userId, userId));

  if (!createdUser) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to create user', 500);
  }

  return buildScimUserResponse(createdUser as DbUser);
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

  const userDataAny = userData as Record<string, unknown>;
  if (userDataAny['department'] !== undefined) {
    updates['department'] = userDataAny['department'];
  }
  if (userData.title !== undefined) {
    updates['title'] = userData.title;
  }
  if (userData.manager?.value !== undefined) {
    updates['managerId'] = userData.manager.value;
  }

  await db
    .update(users)
    .set(updates)
    .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));

  const [updatedUser] = await db.select().from(users).where(eq(users.userId, userId));

  if (!updatedUser) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to update user', 500);
  }

  return buildScimUserResponse(updatedUser as DbUser);
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

  return buildScimUserResponse(reactivatedUser as DbUser);
};

export const listScimGroups = async (
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

  let query = db.select().from(scimGroups).where(eq(scimGroups.tenantId, tenantId));

  if (options?.filter) {
    const filterMatch = options.filter.match(/displayName sw "(.*)"/);
    if (filterMatch) {
      query = db
        .select()
        .from(scimGroups)
        .where(
          and(
            eq(scimGroups.tenantId, tenantId),
            ilike(scimGroups.displayName, `${filterMatch[1]}%`),
          ),
        );
    }
  }

  const allGroups = (await query.orderBy(asc(scimGroups.createdAt))) as DbGroup[];
  const totalResults = allGroups.length;
  const paginatedGroups = allGroups.slice(startIndex - 1, startIndex - 1 + count);

  const groupsWithMembers = await Promise.all(
    paginatedGroups.map(async (group) => {
      const members = (await db
        .select()
        .from(scimGroupMembers)
        .where(eq(scimGroupMembers.scimGroupId, group.id))) as DbGroupMember[];
      return buildScimGroupResponseWithMembers(group, members);
    }),
  );

  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults,
    startIndex,
    itemsPerPage: count,
    Resources: groupsWithMembers,
  };
};

export const getScimGroup = async (
  config: AppConfig,
  tenantId: string,
  groupId: string,
): Promise<SCIMGroup & { schemas: string[] }> => {
  const db = getDatabaseClient(config);

  const [group] = await db
    .select()
    .from(scimGroups)
    .where(and(eq(scimGroups.id, groupId), eq(scimGroups.tenantId, tenantId)));

  if (!group) {
    throw new SCIMError(SCIM_ERRORS.GROUP_NOT_FOUND, 'Group not found', 404);
  }

  const members = (await db
    .select()
    .from(scimGroupMembers)
    .where(eq(scimGroupMembers.scimGroupId, group['id']))) as DbGroupMember[];

  return buildScimGroupResponseWithMembers(group as DbGroup, members);
};

export const createScimGroup = async (
  config: AppConfig,
  tenantId: string,
  groupData: SCIMGroup,
): Promise<SCIMGroup & { schemas: string[] }> => {
  const db = getDatabaseClient(config);

  const [existingGroup] = await db
    .select()
    .from(scimGroups)
    .where(
      and(
        eq(scimGroups.tenantId, tenantId),
        eq(scimGroups.displayName, groupData.displayName ?? ''),
      ),
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

  await db.insert(scimGroups).values({
    id: groupId,
    tenantId,
    scimId: groupId,
    displayName: groupData.displayName ?? '',
    createdAt: now,
    updatedAt: now,
  });

  if (groupData.members && groupData.members.length > 0) {
    for (const member of groupData.members) {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            or(eq(users.userId, member.value ?? ''), eq(users.email, member.value ?? '')),
          ),
        )
        .limit(1);

      if (user) {
        await db.insert(scimGroupMembers).values({
          scimGroupId: groupId,
          userId: user['userId'],
          scimUserId: member.value ?? null,
          createdAt: now,
        });
      }
    }
  }

  const [createdGroup] = await db.select().from(scimGroups).where(eq(scimGroups.id, groupId));

  if (!createdGroup) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to create group', 500);
  }

  return buildScimGroupResponse(createdGroup as DbGroup);
};

export const updateScimGroup = async (
  config: AppConfig,
  tenantId: string,
  groupId: string,
  groupData: Partial<SCIMGroup>,
): Promise<SCIMGroup & { schemas: string[] }> => {
  const db = getDatabaseClient(config);

  const [existing] = await db
    .select()
    .from(scimGroups)
    .where(and(eq(scimGroups.id, groupId), eq(scimGroups.tenantId, tenantId)));

  if (!existing) {
    throw new SCIMError(SCIM_ERRORS.GROUP_NOT_FOUND, 'Group not found', 404);
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (groupData.displayName !== undefined) {
    updates['displayName'] = groupData.displayName;
  }

  await db.update(scimGroups).set(updates).where(eq(scimGroups.id, groupId));

  if (groupData.members !== undefined) {
    await db.delete(scimGroupMembers).where(eq(scimGroupMembers.scimGroupId, groupId));

    const now = new Date();
    for (const member of groupData.members) {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            or(eq(users.userId, member.value ?? ''), eq(users.email, member.value ?? '')),
          ),
        )
        .limit(1);

      if (user) {
        await db.insert(scimGroupMembers).values({
          scimGroupId: groupId,
          userId: user['userId'],
          scimUserId: member.value ?? null,
          createdAt: now,
        });
      }
    }
  }

  const [updatedGroup] = await db.select().from(scimGroups).where(eq(scimGroups.id, groupId));

  if (!updatedGroup) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to update group', 500);
  }

  const members = (await db
    .select()
    .from(scimGroupMembers)
    .where(eq(scimGroupMembers.scimGroupId, updatedGroup['id']))) as DbGroupMember[];

  return buildScimGroupResponseWithMembers(updatedGroup as DbGroup, members);
};

export const deleteScimGroup = async (
  config: AppConfig,
  tenantId: string,
  groupId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [existing] = await db
    .select()
    .from(scimGroups)
    .where(and(eq(scimGroups.id, groupId), eq(scimGroups.tenantId, tenantId)));

  if (!existing) {
    throw new SCIMError(SCIM_ERRORS.GROUP_NOT_FOUND, 'Group not found', 404);
  }

  await db.delete(scimGroups).where(eq(scimGroups.id, groupId));
};

export const generateScimToken = async (
  config: AppConfig,
  tenantId: string,
  name: string,
  scopes: string[] = ['scim.read', 'scim.write'],
  expiresInDays?: number,
): Promise<{ token: string; tokenId: string }> => {
  const db = getDatabaseClient(config);
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = new Date();

  const expiresAt = expiresInDays
    ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [createdToken] = await db
    .insert(scimTokens)
    .values({
      tenantId,
      name,
      tokenHash,
      scopes,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!createdToken) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to generate SCIM token', 500);
  }

  return { token, tokenId: createdToken.id };
};

export const verifyScimToken = async (
  config: AppConfig,
  tenantId: string,
  token: string,
): Promise<{ valid: boolean; scopes: string[]; tokenId?: string }> => {
  const db = getDatabaseClient(config);
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const [scimToken] = await db
    .select()
    .from(scimTokens)
    .where(
      and(
        eq(scimTokens.tokenHash, tokenHash),
        eq(scimTokens.tenantId, tenantId),
        eq(scimTokens.isRevoked, false),
      ),
    );

  if (!scimToken) {
    return { valid: false, scopes: [] };
  }

  if (scimToken['expiresAt'] && new Date(scimToken['expiresAt']) < new Date()) {
    return { valid: false, scopes: [] };
  }

  await db
    .update(scimTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(scimTokens.id, scimToken['id']));

  return { valid: true, scopes: scimToken['scopes'], tokenId: scimToken['id'] };
};

export const revokeScimToken = async (
  config: AppConfig,
  tenantId: string,
  tokenId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);

  await db
    .update(scimTokens)
    .set({ isRevoked: true, updatedAt: new Date() })
    .where(and(eq(scimTokens.id, tokenId), eq(scimTokens.tenantId, tenantId)));
};

export const rotateScimToken = async (
  config: AppConfig,
  tenantId: string,
  tokenId: string,
  expiresInDays?: number,
): Promise<{ token: string; tokenId: string }> => {
  const db = getDatabaseClient(config);

  const [existingToken] = await db
    .select()
    .from(scimTokens)
    .where(and(eq(scimTokens.id, tokenId), eq(scimTokens.tenantId, tenantId)));

  if (!existingToken) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'SCIM token not found', 404);
  }

  if (existingToken.isRevoked) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Cannot rotate a revoked token', 400);
  }

  await db
    .update(scimTokens)
    .set({ isRevoked: true, updatedAt: new Date() })
    .where(eq(scimTokens.id, tokenId));

  const newToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(newToken).digest('hex');
  const now = new Date();

  const expiresAt = expiresInDays
    ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
    : existingToken.expiresAt;

  const [createdToken] = await db
    .insert(scimTokens)
    .values({
      tenantId,
      name: `${existingToken.name} (rotated)`,
      tokenHash,
      scopes: existingToken.scopes,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!createdToken) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'Failed to rotate SCIM token', 500);
  }

  return { token: newToken, tokenId: createdToken.id };
};

export const listScimTokens = async (
  config: AppConfig,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    scopes: string[];
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    isRevoked: boolean;
    createdAt: Date;
  }>
> => {
  const db = getDatabaseClient(config);

  const tokens = await db.select().from(scimTokens).where(eq(scimTokens.tenantId, tenantId));

  return tokens.map((t) => ({
    id: t['id'],
    name: t['name'],
    scopes: t['scopes'],
    expiresAt: t['expiresAt'],
    lastUsedAt: t['lastUsedAt'],
    isRevoked: t['isRevoked'],
    createdAt: t['createdAt'],
  }));
};

export const testScimConnection = async (
  config: AppConfig,
  tenantId: string,
  _tokenId: string,
): Promise<{ success: boolean; message: string }> => {
  const db = getDatabaseClient(config);

  const [token] = await db
    .select()
    .from(scimTokens)
    .where(and(eq(scimTokens.id, _tokenId), eq(scimTokens.tenantId, tenantId)));

  if (!token) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'SCIM token not found', 404);
  }

  if (token.isRevoked) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'SCIM token is revoked', 400);
  }

  if (token['expiresAt'] && new Date(token['expiresAt']) < new Date()) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'SCIM token has expired', 400);
  }

  return {
    success: true,
    message: 'Successfully connected to SCIM endpoint. Token is valid.',
  };
};

export const testScimProvisioning = async (
  config: AppConfig,
  tenantId: string,
  tokenId: string,
): Promise<{ success: boolean; message: string; testUserId?: string }> => {
  const db = getDatabaseClient(config);

  const [token] = await db
    .select()
    .from(scimTokens)
    .where(and(eq(scimTokens.id, tokenId), eq(scimTokens.tenantId, tenantId)));

  if (!token) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'SCIM token not found', 404);
  }

  if (token.isRevoked) {
    throw new SCIMError(SCIM_ERRORS.INVALID_REQUEST, 'SCIM token is revoked', 400);
  }

  const testUserId = randomUUID();
  const now = new Date();
  const testEmail = `scim-test-${testUserId.slice(0, 8)}@test.local`;

  try {
    await db.insert(users).values({
      userId: testUserId,
      tenantId,
      email: testEmail,
      displayName: 'SCIM Test User',
      role: 'member',
      isActive: true,
      passwordHash: '',
      createdAt: now,
      updatedAt: now,
    });

    await db.delete(users).where(eq(users.userId, testUserId));

    return {
      success: true,
      message: 'Successfully created and removed test user via SCIM.',
      testUserId,
    };
  } catch {
    return {
      success: false,
      message: 'Failed to create test user',
    };
  }
};

export const getScimSyncStatus = async (
  config: AppConfig,
  tenantId: string,
): Promise<{
  lastSync: Date | null;
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
}> => {
  const db = getDatabaseClient(config);

  const [lastSyncLog] = await db
    .select()
    .from(scimSyncLogs)
    .where(eq(scimSyncLogs.tenantId, tenantId))
    .orderBy(asc(scimSyncLogs.startedAt))
    .limit(1);

  if (!lastSyncLog) {
    return {
      lastSync: null,
      status: 'never_synced',
      stats: {
        usersCreated: 0,
        usersUpdated: 0,
        usersDeleted: 0,
        groupsCreated: 0,
        groupsUpdated: 0,
        groupsDeleted: 0,
        errors: [],
      },
    };
  }

  return {
    lastSync: lastSyncLog['startedAt'],
    status: lastSyncLog['status'],
    stats: {
      usersCreated: lastSyncLog['usersCreated'],
      usersUpdated: lastSyncLog['usersUpdated'],
      usersDeleted: lastSyncLog['usersDeleted'],
      groupsCreated: lastSyncLog['groupsCreated'],
      groupsUpdated: lastSyncLog['groupsUpdated'],
      groupsDeleted: lastSyncLog['groupsDeleted'],
      errors: (lastSyncLog['errors'] as unknown[]) || [],
    },
  };
};

export const syncScimGroupToRole = async (
  config: AppConfig,
  tenantId: string,
  groupId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [scimGroup] = await db
    .select()
    .from(scimGroups)
    .where(and(eq(scimGroups.id, groupId), eq(scimGroups.tenantId, tenantId)));

  if (!scimGroup) {
    throw new SCIMError(SCIM_ERRORS.GROUP_NOT_FOUND, 'SCIM group not found', 404);
  }

  if (!scimGroup['roleId']) {
    return;
  }

  const groupMembers = await db
    .select()
    .from(scimGroupMembers)
    .where(eq(scimGroupMembers.scimGroupId, groupId));

  for (const member of groupMembers) {
    await db
      .update(users)
      .set({ role: 'member', updatedAt: new Date() })
      .where(and(eq(users.userId, member.userId), eq(users.tenantId, tenantId)));
  }
};

export const updateScimGroupRole = async (
  config: AppConfig,
  tenantId: string,
  groupId: string,
  roleId: string | null,
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [existing] = await db
    .select()
    .from(scimGroups)
    .where(and(eq(scimGroups.id, groupId), eq(scimGroups.tenantId, tenantId)));

  if (!existing) {
    throw new SCIMError(SCIM_ERRORS.GROUP_NOT_FOUND, 'SCIM group not found', 404);
  }

  await db
    .update(scimGroups)
    .set({ roleId: roleId ?? null, updatedAt: new Date() })
    .where(and(eq(scimGroups.id, groupId), eq(scimGroups.tenantId, tenantId)));
};

export const listScimGroupsWithRoles = async (
  config: AppConfig,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    displayName: string;
    roleId: string | null;
    roleName: string | null;
    membersCount: number;
  }>
> => {
  const db = getDatabaseClient(config);

  const allGroups = await db.select().from(scimGroups).where(eq(scimGroups.tenantId, tenantId));

  const { roles: rolesTable } = await import('../../db/schema/auth/roles.js');

  const groupsWithRoles = await Promise.all(
    allGroups.map(async (group) => {
      let roleName: string | null = null;
      if (group.roleId) {
        const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, group.roleId));
        roleName = role?.name ?? null;
      }

      const membersCountResult = await db
        .select({ count: scimGroupMembers.id })
        .from(scimGroupMembers)
        .where(eq(scimGroupMembers.scimGroupId, group.id));

      return {
        id: group.id,
        displayName: group.displayName,
        roleId: group.roleId,
        roleName,
        membersCount: membersCountResult.length,
      };
    }),
  );

  return groupsWithRoles;
};

export const listRoles = async (
  config: AppConfig,
  tenantId: string,
): Promise<Array<{ id: string; name: string; description: string | null }>> => {
  const db = getDatabaseClient(config);
  const { roles: rolesTable } = await import('../../db/schema/auth/roles.js');

  const rolesList = await db
    .select({
      id: rolesTable.id,
      name: rolesTable.name,
      description: rolesTable.description,
    })
    .from(rolesTable)
    .where(eq(rolesTable.tenantId, tenantId));

  return rolesList.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
  }));
};

export { SCIM_LIFECYCLE_CONTRACT_V1 };
